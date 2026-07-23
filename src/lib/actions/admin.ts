"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok } from "@/lib/action-result";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";
import { calculateDeliveryDates, nextEligiblePackageStartDate } from "@/lib/package-schedule";

const formBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on" || value === "1",
  z.boolean(),
);

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

async function requireAdmin() {
  const session = await getCurrentSession();

  if (session?.user.role !== "ADMIN") {
    throw new Error("Admin access is required.");
  }

  return session.user;
}

const packageSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  name: z.string().min(2),
  badge: z.string().optional(),
  description: z.string().min(10),
  price: z.coerce.number().positive(),
  taxRate: z.coerce.number().min(0).max(1).default(0.0875),
  cadence: z.enum(["WEEKLY", "MONTHLY", "STUDENT"]),
  deliveryDayCount: z.coerce.number().int().positive(),
  servings: z.string().min(2),
  imageUrl: z.string().url(),
  bestFor: z.string().optional(),
  studentOnly: formBoolean.default(false),
  accent: z.enum(["saffron", "leaf", "masala"]).default("saffron"),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
  includes: z.string().optional(),
});

const addonSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  description: z.string().optional(),
  price: z.coerce.number().min(0),
  imageUrl: z.string().url().optional().or(z.literal("")),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
});

const deliveryZoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  cities: z.string().default(""),
  postalCodes: z.string().default(""),
  fee: z.coerce.number().min(0),
  isFreeDelivery: formBoolean.default(false),
  outsideZone: formBoolean.default(false),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
});

const categorySchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  slug: z.string().optional(),
  description: z.string().optional(),
  sortOrder: z.coerce.number().int().min(0).default(0),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
});

const menuItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  type: z.string().min(2),
  spice: z.string().min(2).default("Mild"),
  vegetarian: formBoolean.default(true),
  description: z.string().optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
});

const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(3),
  type: z.enum(["PERCENT", "FLAT"]),
  value: z.coerce.number().min(0),
  usageLimit: z.coerce.number().int().positive().optional().or(z.literal("")),
  expiresAt: z.string().optional(),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
});

function formObject(formData: FormData) {
  return Object.fromEntries(formData.entries());
}

function splitLines(value?: string) {
  return (value ?? "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function splitCsv(value: string) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

async function ensureAddonCanBeDeactivated(addonId: string) {
  const assignedPackages = await db.package.findMany({
    where: {
      status: "ACTIVE",
      addons: { some: { addonId } },
    },
    select: {
      name: true,
      addons: {
        where: { addon: { status: "ACTIVE" } },
        select: { addonId: true },
      },
    },
  });
  const blockedPackages = assignedPackages.filter((plan) => plan.addons.length <= 1);

  if (blockedPackages.length) {
    throw new Error(
      `Keep this add-on active or assign another active add-on to: ${blockedPackages.map((plan) => plan.name).join(", ")}.`,
    );
  }
}

export async function savePackageAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = packageSchema.safeParse(formObject(formData));
    const addonIds = Array.from(new Set(formData.getAll("addonIds").map(String).filter(Boolean)));

    if (!parsed.success) {
      return fail("Please fix the package fields.", parsed.error.flatten().fieldErrors);
    }

    const { id, includes, ...data } = parsed.data;

    if (data.status === "ACTIVE") {
      const activeAddonCount = await db.addon.count({
        where: { id: { in: addonIds }, status: "ACTIVE" },
      });

      if (activeAddonCount < 1) {
        return fail("An active package must have at least one active add-on.");
      }
    }

    const packageRecord = await db.package.upsert({
      where: { id: id ?? "__new_package__" },
      create: {
        ...data,
        price: new Prisma.Decimal(data.price),
        taxRate: new Prisma.Decimal(data.taxRate),
        slug: slugify(data.name),
        studentOnly: data.studentOnly || data.cadence === "STUDENT",
        items: {
          create: splitLines(includes).map((name, index) => ({
            name,
            sortOrder: index,
          })),
        },
        addons: {
          create: addonIds.map((addonId) => ({ addonId })),
        },
      },
      update: {
        ...data,
        price: new Prisma.Decimal(data.price),
        taxRate: new Prisma.Decimal(data.taxRate),
        slug: slugify(data.name),
        studentOnly: data.studentOnly || data.cadence === "STUDENT",
        items: {
          deleteMany: {},
          create: splitLines(includes).map((name, index) => ({
            name,
            sortOrder: index,
          })),
        },
        addons: {
          deleteMany: {},
          create: addonIds.map((addonId) => ({ addonId })),
        },
      },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: id ? "package.updated" : "package.created",
        entity: "package",
        entityId: packageRecord.id,
      },
    });

    revalidatePath("/admin/packages");
    revalidatePath("/packages");
    return ok({ id: packageRecord.id }, id ? "Package updated." : "Package created.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Package could not be saved.");
  }
}

export async function deletePackageAction(packageId: string) {
  try {
    const admin = await requireAdmin();

    await db.package.update({
      where: { id: packageId },
      data: { status: "ARCHIVED" },
    });
    await db.auditLog.create({
      data: { userId: admin.id, action: "package.archived", entity: "package", entityId: packageId },
    });

    revalidatePath("/admin/packages");
    revalidatePath("/packages");
    return ok({ id: packageId }, "Package archived.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Package could not be archived.");
  }
}

export async function saveAddonAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = addonSchema.safeParse(formObject(formData));

    if (!parsed.success) {
      return fail("Please fix the add-on fields.", parsed.error.flatten().fieldErrors);
    }

    const { id, imageUrl, ...data } = parsed.data;

    if (id && data.status !== "ACTIVE") {
      await ensureAddonCanBeDeactivated(id);
    }

    const addon = await db.addon.upsert({
      where: { id: id ?? "__new_addon__" },
      create: {
        ...data,
        price: new Prisma.Decimal(data.price),
        slug: slugify(data.name),
        imageUrl: imageUrl || null,
      },
      update: {
        ...data,
        price: new Prisma.Decimal(data.price),
        slug: slugify(data.name),
        imageUrl: imageUrl || null,
      },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: id ? "addon.updated" : "addon.created",
        entity: "addon",
        entityId: addon.id,
      },
    });

    revalidatePath("/admin/packages");
    return ok({ id: addon.id }, id ? "Add-on updated." : "Add-on created.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Add-on could not be saved.");
  }
}

export async function deleteAddonAction(addonId: string) {
  try {
    const admin = await requireAdmin();

    await ensureAddonCanBeDeactivated(addonId);

    await db.addon.update({
      where: { id: addonId },
      data: { status: "ARCHIVED" },
    });
    await db.auditLog.create({
      data: { userId: admin.id, action: "addon.archived", entity: "addon", entityId: addonId },
    });

    revalidatePath("/admin/packages");
    revalidatePath("/packages");
    return ok({ id: addonId }, "Add-on archived.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Add-on could not be archived.");
  }
}

export async function saveDeliveryZoneAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = deliveryZoneSchema.safeParse(formObject(formData));

    if (!parsed.success) {
      return fail("Please fix the delivery zone fields.", parsed.error.flatten().fieldErrors);
    }

    const { id, cities, postalCodes, ...data } = parsed.data;
    const zone = await db.deliveryZone.upsert({
      where: { id: id ?? "__new_delivery_zone__" },
      create: {
        ...data,
        cities: splitCsv(cities),
        postalCodes: splitCsv(postalCodes),
        fee: new Prisma.Decimal(data.fee),
      },
      update: {
        ...data,
        cities: splitCsv(cities),
        postalCodes: splitCsv(postalCodes),
        fee: new Prisma.Decimal(data.fee),
      },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: id ? "delivery_zone.updated" : "delivery_zone.created",
        entity: "delivery_zone",
        entityId: zone.id,
      },
    });

    revalidatePath("/admin/settings");
    return ok({ id: zone.id }, id ? "Delivery zone updated." : "Delivery zone created.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Delivery zone could not be saved.");
  }
}

export async function deleteDeliveryZoneAction(zoneId: string) {
  try {
    const admin = await requireAdmin();

    await db.deliveryZone.update({
      where: { id: zoneId },
      data: { status: "ARCHIVED" },
    });
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "delivery_zone.archived",
        entity: "delivery_zone",
        entityId: zoneId,
      },
    });

    revalidatePath("/admin/settings");
    return ok({ id: zoneId }, "Delivery zone archived.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Delivery zone could not be archived.");
  }
}

export async function saveCategoryAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = categorySchema.safeParse(formObject(formData));

    if (!parsed.success) {
      return fail("Please fix the category fields.", parsed.error.flatten().fieldErrors);
    }

    const { id, slug, ...data } = parsed.data;
    const category = await db.packageCategory.upsert({
      where: { id: id ?? "__new_category__" },
      create: {
        ...data,
        slug: slugify(slug || data.name),
      },
      update: {
        ...data,
        slug: slugify(slug || data.name),
      },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: id ? "category.updated" : "category.created",
        entity: "package_category",
        entityId: category.id,
      },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/admin/packages");
    revalidatePath("/packages");
    return ok({ id: category.id }, id ? "Category updated." : "Category created.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Category could not be saved.");
  }
}

export async function deleteCategoryAction(categoryId: string) {
  try {
    const admin = await requireAdmin();

    await db.packageCategory.update({
      where: { id: categoryId },
      data: { status: "ARCHIVED" },
    });
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "category.archived",
        entity: "package_category",
        entityId: categoryId,
      },
    });

    revalidatePath("/admin/categories");
    revalidatePath("/admin/packages");
    revalidatePath("/packages");
    return ok({ id: categoryId }, "Category archived.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Category could not be archived.");
  }
}

export async function saveMenuItemAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = menuItemSchema.safeParse(formObject(formData));

    if (!parsed.success) {
      return fail("Please fix the menu item fields.", parsed.error.flatten().fieldErrors);
    }

    const { id, ...data } = parsed.data;
    const item = await db.menuItem.upsert({
      where: { id: id ?? "__new_menu_item__" },
      create: data,
      update: data,
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: id ? "menu_item.updated" : "menu_item.created",
        entity: "menu_item",
        entityId: item.id,
      },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    return ok({ id: item.id }, id ? "Menu item updated." : "Menu item created.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Menu item could not be saved.");
  }
}

export async function deleteMenuItemAction(menuItemId: string) {
  try {
    const admin = await requireAdmin();

    await db.menuItem.update({
      where: { id: menuItemId },
      data: { status: "ARCHIVED" },
    });
    await db.auditLog.create({
      data: { userId: admin.id, action: "menu_item.archived", entity: "menu_item", entityId: menuItemId },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    return ok({ id: menuItemId }, "Menu item archived.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Menu item could not be archived.");
  }
}

export async function saveCouponAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = couponSchema.safeParse(formObject(formData));

    if (!parsed.success) {
      return fail("Please fix the offer fields.", parsed.error.flatten().fieldErrors);
    }

    const { id, code, value, usageLimit, expiresAt, ...data } = parsed.data;
    const expiresDate = expiresAt ? new Date(expiresAt) : null;
    const coupon = await db.coupon.upsert({
      where: { id: id ?? "__new_coupon__" },
      create: {
        ...data,
        code: code.trim().toUpperCase(),
        value: new Prisma.Decimal(value),
        usageLimit: usageLimit === "" ? null : usageLimit,
        expiresAt: expiresDate,
      },
      update: {
        ...data,
        code: code.trim().toUpperCase(),
        value: new Prisma.Decimal(value),
        usageLimit: usageLimit === "" ? null : usageLimit,
        expiresAt: expiresDate,
      },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: id ? "coupon.updated" : "coupon.created",
        entity: "coupon",
        entityId: coupon.id,
      },
    });

    revalidatePath("/admin/offers");
    return ok({ id: coupon.id }, id ? "Offer updated." : "Offer created.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Offer could not be saved.");
  }
}

export async function deleteCouponAction(couponId: string) {
  try {
    const admin = await requireAdmin();

    await db.coupon.update({
      where: { id: couponId },
      data: { status: "ARCHIVED" },
    });
    await db.auditLog.create({
      data: { userId: admin.id, action: "coupon.archived", entity: "coupon", entityId: couponId },
    });

    revalidatePath("/admin/offers");
    return ok({ id: couponId }, "Offer archived.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Offer could not be archived.");
  }
}

export async function updateOrderStatusAction(orderId: string, status: string) {
  try {
    const admin = await requireAdmin();
    const parsed = z
      .enum(["PENDING_PAYMENT", "PAID", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED", "PAUSED", "CANCELLED"])
      .parse(status);
    const order = await db.order.findFirst({
      where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
      select: { id: true },
    });

    if (!order) {
      throw new Error("Order was not found.");
    }

    await db.order.update({
      where: { id: order.id },
      data: { status: parsed },
    });
    await db.auditLog.create({
      data: { userId: admin.id, action: "order.status_updated", entity: "order", entityId: order.id },
    });

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return ok({ id: order.id, status: parsed }, "Order status updated.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Order status could not be updated.");
  }
}

export async function approveStudentVerificationAction(verificationId: string) {
  try {
    const admin = await requireAdmin();
    const verification = await db.studentVerification.update({
      where: { id: verificationId },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
      },
    });

    if (verification.orderId) {
      const pendingPackages = await db.customerPackage.findMany({
        where: { orderId: verification.orderId, status: "PENDING_STUDENT_VERIFICATION" },
        include: { deliveryDays: true, package: true },
      });

      await db.$transaction(async (tx) => {
        for (const customerPackage of pendingPackages) {
          const startDate =
            customerPackage.startDate && customerPackage.startDate > new Date()
              ? customerPackage.startDate
              : nextEligiblePackageStartDate();
          const deliveryDates = calculateDeliveryDates(
            customerPackage.totalDeliveryDays,
            startDate,
          );

          await tx.customerPackage.update({
            where: { id: customerPackage.id },
            data: {
              status: "ACTIVE",
              startDate,
              endDate: deliveryDates.at(-1) ?? null,
            },
          });

          if (customerPackage.deliveryDays.length === 0) {
            await tx.packageDeliveryDay.createMany({
              data: deliveryDates.map((deliveryDate) => ({
                customerPackageId: customerPackage.id,
                deliveryDate,
                status: "PREPARING",
                menuSummary: customerPackage.package.name,
              })),
            });
          }
        }
      });
    }

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "student_verification.approved",
        entity: "student_verification",
        entityId: verificationId,
      },
    });

    revalidatePath("/admin/students");
    return ok({ id: verificationId }, "Student verification approved.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Student verification could not be approved.");
  }
}

export async function rejectStudentVerificationAction(verificationId: string, adminNote?: string) {
  try {
    const admin = await requireAdmin();

    await db.studentVerification.update({
      where: { id: verificationId },
      data: {
        status: "REJECTED",
        adminNote,
        reviewedAt: new Date(),
      },
    });
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "student_verification.rejected",
        entity: "student_verification",
        entityId: verificationId,
      },
    });

    revalidatePath("/admin/students");
    return ok({ id: verificationId }, "Student verification rejected.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Student verification could not be rejected.");
  }
}

export async function adminPausePackageAction(customerPackageId: string, reason?: string) {
  try {
    const admin = await requireAdmin();

    await db.$transaction([
      db.customerPackage.update({
        where: { id: customerPackageId },
        data: { status: "PAUSED" },
      }),
      db.pauseRequest.create({
        data: {
          customerPackageId,
          requestedByUserId: admin.id,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          reason,
          adminNote: "Paused by admin.",
        },
      }),
    ]);

    revalidatePath("/admin/customers");
    return ok({ id: customerPackageId }, "Package paused.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Package could not be paused.");
  }
}

export async function adminResumePackageAction(customerPackageId: string) {
  try {
    await requireAdmin();

    await db.$transaction([
      db.customerPackage.update({
        where: { id: customerPackageId },
        data: { status: "ACTIVE" },
      }),
      db.pauseRequest.updateMany({
        where: { customerPackageId, status: "ACTIVE" },
        data: { status: "ENDED", endDate: new Date() },
      }),
    ]);

    revalidatePath("/admin/customers");
    return ok({ id: customerPackageId }, "Package resumed.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Package could not be resumed.");
  }
}

async function updateReviewStatus(reviewId: string, status: "ACTIVE" | "DRAFT" | "ARCHIVED") {
  const admin = await requireAdmin();
  const review = await db.review.update({
    where: { id: reviewId },
    data: { status },
  });

  await db.auditLog.create({
    data: {
      userId: admin.id,
      action: `review.${status.toLowerCase()}`,
      entity: "review",
      entityId: review.id,
    },
  });

  revalidatePath("/");
  revalidatePath("/admin/reviews");

  return review;
}

export async function publishReviewAction(reviewId: string) {
  try {
    const review = await updateReviewStatus(reviewId, "ACTIVE");
    return ok({ id: review.id }, "Review published.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Review could not be published.");
  }
}

export async function moveReviewToPendingAction(reviewId: string) {
  try {
    const review = await updateReviewStatus(reviewId, "DRAFT");
    return ok({ id: review.id }, "Review moved to pending.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Review could not be moved to pending.");
  }
}

export async function archiveReviewAction(reviewId: string) {
  try {
    const review = await updateReviewStatus(reviewId, "ARCHIVED");
    return ok({ id: review.id }, "Review removed from public site.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Review could not be removed.");
  }
}
