"use server";

import { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok } from "@/lib/action-result";
import { getCurrentSession } from "@/lib/auth";
import { getBusinessRules } from "@/lib/business-rules";
import { db } from "@/lib/db";
import { sendVerificationDecisionEmail } from "@/lib/email/notifications";
import { sendTransactionalEmail } from "@/lib/email/send";
import { createOrderCancelledEmail } from "@/lib/email/templates";
import { calculateDeliveryDates, nextEligiblePackageStartDate } from "@/lib/package-schedule";
import { pausePackage, resumePackage } from "@/lib/server/package-pause";
import { markOrderPaidAndActivate } from "@/lib/server/checkout";
import { STATIC_SEO_ROUTES, normalizeSeoInput, validateHttpsImageUrl, validateHttpsUrl } from "@/lib/seo-core.mjs";

const formBoolean = z.preprocess(
  (value) => value === true || value === "true" || value === "on" || value === "1",
  z.boolean(),
);

const optionalFormBoolean = z.preprocess(
  (value) => {
    if (value === undefined || value === null) return undefined;
    return value === true || value === "true" || value === "on" || value === "1";
  },
  z.boolean().optional(),
);

const adminSettingsSchema = z.object({
  maintenanceMode: optionalFormBoolean,
  businessName: z.string().min(2).optional(),
  supportEmail: z.string().email().optional(),
  phone: z.string().min(7).optional(),
  currency: z.string().length(3).optional(),
  // Entered as a percentage (e.g. 8.75), stored as a fraction (0.0875).
  taxRate: z.coerce
    .number()
    .min(0)
    .max(100)
    .optional()
    .transform((value) => (value === undefined ? undefined : value / 100)),
  serviceAreas: z.string().min(2).optional(),
  deliveryWindowStart: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  deliveryWindowEnd: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  orderCutoff: z.string().min(2).optional(),
  deliveryDays: z.string().min(2).optional(),
  customMonthlyDays: z.coerce.number().int().min(1).max(60).optional(),
  acceptWeeklyTrials: optionalFormBoolean,
  enableCheckoutPauses: optionalFormBoolean,
  orderConfirmationEmails: optionalFormBoolean,
  packageReminderEmails: optionalFormBoolean,
  packageReminderSms: optionalFormBoolean,
  packageCompletedEmails: optionalFormBoolean,
  outForDeliverySms: optionalFormBoolean,
  weeklyMenuEmails: optionalFormBoolean,
});

const optionalSeoText = (maximum: number, minimum = 0) => z.string().trim().max(maximum).refine(
  (value) => !value || value.length >= minimum,
  minimum ? `Use at least ${minimum} characters or leave this blank to use the default.` : undefined,
);

const seoImageSchema = z.string().trim().max(600).refine(
  validateHttpsImageUrl,
  "Use a relative site image or a secure HTTPS image URL.",
);

const seoRecordSchema = z.object({
  id: z.string().optional(),
  targetType: z.enum(["STATIC_PAGE", "PACKAGE"]),
  packageId: z.string().optional(),
  page: z.string().min(2).max(80),
  path: z.string().regex(/^\/[a-z0-9/_-]*$/i, "Use a site path starting with /.").max(240),
  title: optionalSeoText(60, 10),
  description: optionalSeoText(160, 30),
  ogTitle: optionalSeoText(90),
  ogDescription: optionalSeoText(200),
  ogImageUrl: seoImageSchema,
  ogImageAlt: optionalSeoText(160),
  indexed: formBoolean.default(true),
  includeInSitemap: formBoolean.default(true),
  schemaEnabled: formBoolean.default(true),
});

const seoSettingsSchema = z.object({
  titleSuffix: z.string().trim().max(40),
  defaultDescription: z.string().trim().min(30).max(160),
  defaultSocialImage: seoImageSchema,
  logoUrl: seoImageSchema,
  cuisine: z.string().trim().min(2).max(80),
  priceRange: z.string().trim().min(1).max(10),
  socialProfiles: z.string().trim().max(2000).refine(
    (value) => !value || value.split(/\r?\n/).map((url) => url.trim()).filter(Boolean).every(validateHttpsUrl),
    "Use one secure HTTPS profile URL per line.",
  ),
  googleVerification: z.string().trim().max(240),
});

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

// Accepts an uploaded media path (/api/uploads/media/…) or a full image URL.
const siteImage = z
  .string()
  .trim()
  .refine(
    (value) => value.startsWith("/") || /^https?:\/\//i.test(value),
    "Upload an image or paste a full image URL.",
  );

const packageSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1),
  name: z.string().min(2),
  badge: z.string().optional(),
  description: z.string().min(10),
  price: z.coerce.number().positive(),
  cadence: z.enum(["WEEKLY", "MONTHLY", "STUDENT"]),
  deliveryDayCount: z.coerce.number().int().positive(),
  servings: z.string().min(2),
  imageUrl: siteImage,
  bestFor: z.string().optional(),
  studentOnly: formBoolean.default(false),
  accent: z.enum(["saffron", "leaf", "masala"]).default("saffron"),
  status: z.enum(["ACTIVE", "DRAFT", "ARCHIVED"]).default("ACTIVE"),
  includes: z.string().optional(),
});

const customPackageItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2),
  unitLabel: z.string().min(1).max(20),
  pricePerUnit: z.coerce.number().min(0),
  required: formBoolean.default(false),
  sortOrder: z.coerce.number().int().min(0).default(0),
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

const menuUploadSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().min(2, "Give the menu a title."),
    fileUrl: z
      .string()
      .startsWith("/api/uploads/menus/", "Upload the menu file first."),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a start date."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose an end date."),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "End date must be on or after the start date.",
    path: ["endDate"],
  });

const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().min(3),
  type: z.enum(["PERCENT", "FLAT"]),
  value: z.coerce.number().min(0),
  usageLimit: z.coerce.number().int().positive().optional().or(z.literal("")),
  customerId: z.string().optional(),
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

export async function saveAdminSettingsAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = adminSettingsSchema.safeParse(formObject(formData));

    if (!parsed.success) {
      return fail("Please fix the settings fields.", parsed.error.flatten().fieldErrors);
    }

    const current = await db.setting.findUnique({ where: { key: "admin_settings" } });
    const currentValue =
      current?.value && typeof current.value === "object" && !Array.isArray(current.value)
        ? current.value
        : {};
    const value = { ...currentValue, ...parsed.data };

    await db.setting.upsert({
      where: { key: "admin_settings" },
      create: { key: "admin_settings", value },
      update: { value },
    });
    await db.auditLog.create({
      data: { userId: admin.id, action: "settings.updated", entity: "setting", entityId: "admin_settings" },
    });

    revalidatePath("/admin/settings");
    revalidatePath("/", "layout");
    revalidatePath("/dashboard", "layout");
    revalidatePath("/register");
    return ok(value, "Settings saved.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Settings could not be saved.");
  }
}

export async function saveSeoRecordAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = seoRecordSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return fail("Please fix the SEO fields.", parsed.error.flatten().fieldErrors);
    }

    const input = normalizeSeoInput(parsed.data);
    const { id, targetType, packageId, ...values } = input;
    let path = values.path;
    let page = values.page;

    if (targetType === "STATIC_PAGE") {
      const route = STATIC_SEO_ROUTES.find((candidate) => candidate.path === path);
      if (route) {
        path = route.path;
        page = route.page;
      } else {
        // Custom page entry: any public site path the admin wants to manage.
        const reserved = ["/admin", "/api", "/dashboard", "/checkout", "/login", "/register"];
        if (reserved.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
          return fail("That path is private and cannot be listed in search.");
        }
        if (!page) return fail("Give the page a name.");
      }
    } else {
      if (!packageId) return fail("Choose an active package.");
      const plan = await db.package.findFirst({
        where: { id: packageId, status: "ACTIVE" },
        select: { name: true, slug: true },
      });
      if (!plan) return fail("Choose an active package.");
      page = plan.name;
      path = `/packages/${plan.slug}`;
    }

    const existing = id
      ? await db.seoRecord.findUnique({ where: { id } })
      : packageId
        ? await db.seoRecord.findUnique({ where: { packageId } })
        : await db.seoRecord.findUnique({ where: { path } });
    const data = {
      targetType,
      packageId: targetType === "PACKAGE" ? packageId : null,
      page,
      path,
      title: values.title || null,
      description: values.description || null,
      ogTitle: values.ogTitle || null,
      ogDescription: values.ogDescription || null,
      ogImageUrl: values.ogImageUrl || null,
      ogImageAlt: values.ogImageAlt || null,
      indexed: values.indexed,
      includeInSitemap: values.includeInSitemap,
      schemaEnabled: values.schemaEnabled,
      status: "ACTIVE" as const,
    };
    const record = await db.seoRecord.upsert({
      where: { id: existing?.id ?? "__new_seo_record__" },
      create: data,
      update: data,
    });
    await db.auditLog.create({
      data: { userId: admin.id, action: existing ? "seo.updated" : "seo.created", entity: "seo_record", entityId: record.id },
    });
    revalidatePath("/admin/seo");
    revalidatePath(record.path);
    revalidatePath("/sitemap.xml");
    return ok({ id: record.id }, existing ? "SEO settings updated." : "SEO override created.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "SEO entry could not be saved.");
  }
}

export async function resetSeoRecordAction(recordId: string) {
  try {
    const admin = await requireAdmin();
    const record = await db.seoRecord.delete({ where: { id: recordId } });
    await db.auditLog.create({
      data: { userId: admin.id, action: "seo.reset", entity: "seo_record", entityId: recordId },
    });
    revalidatePath("/admin/seo");
    revalidatePath(record.path);
    revalidatePath("/sitemap.xml");
    return ok({ id: recordId }, "SEO reset to automatic defaults.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "SEO settings could not be reset.");
  }
}

export async function saveSeoSettingsAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = seoSettingsSchema.safeParse(formObject(formData));
    if (!parsed.success) {
      return fail("Please fix the site SEO defaults.", parsed.error.flatten().fieldErrors);
    }

    const { socialProfiles, ...settings } = parsed.data;
    const value = { ...settings, socialProfiles: splitLines(socialProfiles) };
    await db.setting.upsert({
      where: { key: "seo_settings" },
      create: { key: "seo_settings", value },
      update: { value },
    });
    await db.auditLog.create({
      data: { userId: admin.id, action: "seo.settings_updated", entity: "setting", entityId: "seo_settings" },
    });
    revalidatePath("/admin/seo");
    revalidatePath("/", "layout");
    revalidatePath("/sitemap.xml");
    revalidatePath("/robots.txt");
    return ok(value, "Site SEO defaults saved.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Site SEO defaults could not be saved.");
  }
}

export async function savePackageAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = packageSchema.safeParse(formObject(formData));

    if (!parsed.success) {
      return fail("Please fix the package fields.", parsed.error.flatten().fieldErrors);
    }

    const { id, includes, ...data } = parsed.data;

    const packageRecord = await db.package.upsert({
      where: { id: id ?? "__new_package__" },
      create: {
        ...data,
        price: new Prisma.Decimal(data.price),
        slug: slugify(data.name),
        studentOnly: data.studentOnly || data.cadence === "STUDENT",
        items: {
          create: splitLines(includes).map((name, index) => ({
            name,
            sortOrder: index,
          })),
        },
      },
      update: {
        ...data,
        price: new Prisma.Decimal(data.price),
        slug: slugify(data.name),
        studentOnly: data.studentOnly || data.cadence === "STUDENT",
        items: {
          deleteMany: {},
          create: splitLines(includes).map((name, index) => ({
            name,
            sortOrder: index,
          })),
        },
      },
    });

    await db.seoRecord.updateMany({
      where: { packageId: packageRecord.id },
      data: { page: packageRecord.name, path: `/packages/${packageRecord.slug}` },
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
    revalidatePath(`/packages/${packageRecord.slug}`);
    revalidatePath("/sitemap.xml");
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
    revalidatePath("/sitemap.xml");
    return ok({ id: packageId }, "Package archived.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Package could not be archived.");
  }
}

export async function saveCustomPackageItemAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = customPackageItemSchema.safeParse(formObject(formData));

    if (!parsed.success) {
      return fail("Please fix the custom item fields.", parsed.error.flatten().fieldErrors);
    }

    const { id, ...data } = parsed.data;
    const item = await db.customPackageItem.upsert({
      where: { id: id ?? "__new_custom_package_item__" },
      create: {
        ...data,
        pricePerUnit: new Prisma.Decimal(data.pricePerUnit),
        slug: slugify(data.name),
      },
      update: {
        ...data,
        pricePerUnit: new Prisma.Decimal(data.pricePerUnit),
        slug: slugify(data.name),
      },
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: id ? "custom_package_item.updated" : "custom_package_item.created",
        entity: "custom_package_item",
        entityId: item.id,
      },
    });

    revalidatePath("/admin/packages");
    revalidatePath("/packages");
    revalidatePath("/packages/build");
    return ok({ id: item.id }, id ? "Custom item updated." : "Custom item created.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Custom item could not be saved.");
  }
}

export async function deleteCustomPackageItemAction(itemId: string) {
  try {
    const admin = await requireAdmin();

    await db.customPackageItem.update({
      where: { id: itemId },
      data: { status: "ARCHIVED" },
    });
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "custom_package_item.archived",
        entity: "custom_package_item",
        entityId: itemId,
      },
    });

    revalidatePath("/admin/packages");
    revalidatePath("/packages");
    revalidatePath("/packages/build");
    return ok({ id: itemId }, "Custom item archived.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Custom item could not be archived.");
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

export async function saveMenuUploadAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = menuUploadSchema.safeParse(formObject(formData));

    if (!parsed.success) {
      return fail("Please fix the menu upload fields.", parsed.error.flatten().fieldErrors);
    }

    const { id, title, fileUrl, startDate, endDate } = parsed.data;
    const data = {
      title,
      fileUrl,
      startDate: new Date(`${startDate}T00:00:00`),
      endDate: new Date(`${endDate}T00:00:00`),
    };
    const upload = await db.menuUpload.upsert({
      where: { id: id || "__new_menu_upload__" },
      create: data,
      update: data,
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: id ? "menu_upload.updated" : "menu_upload.created",
        entity: "menu_upload",
        entityId: upload.id,
      },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    return ok({ id: upload.id }, id ? "Menu updated." : "Menu scheduled.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Menu could not be saved.");
  }
}

async function readMediaFolders() {
  const { DEFAULT_MEDIA_FOLDERS } = await import("@/lib/media");
  const setting = await db.setting.findUnique({ where: { key: "media_folders" } });
  return Array.isArray(setting?.value) ? setting.value.map(String) : [...DEFAULT_MEDIA_FOLDERS];
}

async function writeMediaFolders(folders: string[]) {
  const value = Array.from(new Set(["general", ...folders])).sort();
  await db.setting.upsert({
    where: { key: "media_folders" },
    create: { key: "media_folders", value },
    update: { value },
  });
  return value;
}

export async function createMediaFolderAction(name: string) {
  try {
    await requireAdmin();
    const { normalizeMediaFolder } = await import("@/lib/media");
    const folder = normalizeMediaFolder(name);

    if (folder === "general" && normalizeMediaFolder(name) !== name.trim().toLowerCase()) {
      return fail("Choose a folder name with letters or numbers.");
    }

    const folders = await readMediaFolders();
    if (folders.includes(folder)) {
      return ok({ folder }, `Folder “${folder}” already exists.`);
    }

    await writeMediaFolders([...folders, folder]);
    revalidatePath("/admin/media");
    return ok({ folder }, `Folder “${folder}” created.`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Folder could not be created.");
  }
}

export async function deleteMediaFolderAction(name: string) {
  try {
    const admin = await requireAdmin();
    const { normalizeMediaFolder } = await import("@/lib/media");
    const folder = normalizeMediaFolder(name);

    if (folder === "general") {
      return fail("The general folder cannot be deleted.");
    }

    // Images inside the folder are kept: they move back to "general".
    const moved = await db.mediaAsset.updateMany({
      where: { folder },
      data: { folder: "general" },
    });

    const folders = await readMediaFolders();
    await writeMediaFolders(folders.filter((candidate) => candidate !== folder));

    await db.auditLog.create({
      data: { userId: admin.id, action: "media.folder_deleted", entity: "media_folder", entityId: folder },
    });

    revalidatePath("/admin/media");
    return ok(
      { folder },
      moved.count
        ? `Folder deleted. ${moved.count} image${moved.count === 1 ? "" : "s"} moved to general.`
        : "Folder deleted.",
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Folder could not be deleted.");
  }
}

export async function moveMediaAssetAction(assetId: string, folder: string) {
  try {
    const admin = await requireAdmin();
    const { normalizeMediaFolder } = await import("@/lib/media");

    const asset = await db.mediaAsset.update({
      where: { id: assetId },
      data: { folder: normalizeMediaFolder(folder) },
    });

    await db.auditLog.create({
      data: { userId: admin.id, action: "media.moved", entity: "media_asset", entityId: assetId },
    });

    revalidatePath("/admin/media");
    return ok({ id: assetId, folder: asset.folder }, `Moved to ${asset.folder}.`);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Image could not be moved.");
  }
}

export async function deleteMediaAssetAction(assetId: string) {
  try {
    const admin = await requireAdmin();

    const asset = await db.mediaAsset.delete({ where: { id: assetId } });

    const fileName = asset.fileUrl.split("/").pop() ?? "";
    if (/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(fileName) && !fileName.includes("..")) {
      const { unlink } = await import("node:fs/promises");
      const path = await import("node:path");
      await unlink(path.join(process.cwd(), "uploads", "media", fileName)).catch(() => {});
    }

    await db.auditLog.create({
      data: { userId: admin.id, action: "media.deleted", entity: "media_asset", entityId: assetId },
    });

    revalidatePath("/admin/media");
    return ok({ id: assetId }, "Image deleted.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Image could not be deleted.");
  }
}

export async function deleteMenuUploadAction(menuUploadId: string) {
  try {
    const admin = await requireAdmin();

    const upload = await db.menuUpload.delete({ where: { id: menuUploadId } });

    const fileName = upload.fileUrl.split("/").pop() ?? "";
    if (/^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(fileName) && !fileName.includes("..")) {
      const { unlink } = await import("node:fs/promises");
      const path = await import("node:path");
      await unlink(path.join(process.cwd(), "uploads", "menus", fileName)).catch(() => {});
    }

    await db.auditLog.create({
      data: { userId: admin.id, action: "menu_upload.deleted", entity: "menu_upload", entityId: menuUploadId },
    });

    revalidatePath("/admin/menu");
    revalidatePath("/menu");
    return ok({ id: menuUploadId }, "Menu removed.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Menu could not be removed.");
  }
}

export async function saveCouponAction(formData: FormData) {
  try {
    const admin = await requireAdmin();
    const parsed = couponSchema.safeParse(formObject(formData));

    if (!parsed.success) {
      return fail("Please fix the offer fields.", parsed.error.flatten().fieldErrors);
    }

    const { id, code, value, usageLimit, customerId, expiresAt, ...data } = parsed.data;
    const expiresDate = expiresAt ? new Date(expiresAt) : null;
    const coupon = await db.coupon.upsert({
      where: { id: id ?? "__new_coupon__" },
      create: {
        ...data,
        code: code.trim().toUpperCase(),
        value: new Prisma.Decimal(value),
        usageLimit: usageLimit === "" ? null : usageLimit,
        customerId: customerId || null,
        expiresAt: expiresDate,
      },
      update: {
        ...data,
        code: code.trim().toUpperCase(),
        value: new Prisma.Decimal(value),
        usageLimit: usageLimit === "" ? null : usageLimit,
        customerId: customerId || null,
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

// Paid orders are accepted automatically, so the only admin decision left is
// cancelling an order — which stops its packages and notifies the customer
// with the admin's reason.
export async function cancelOrderAction(orderId: string, reason?: string) {
  try {
    const admin = await requireAdmin();
    const trimmedReason = reason?.trim() || "";
    const order = await db.order.findFirst({
      where: { OR: [{ id: orderId }, { orderNumber: orderId }] },
      include: { customer: true },
    });

    if (!order) {
      throw new Error("Order was not found.");
    }

    if (order.status === "DECLINED" || order.status === "CANCELLED") {
      return ok({ id: order.id, status: order.status }, "Order is already cancelled.");
    }

    await db.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: "DECLINED" },
      });

      await tx.customerPackage.updateMany({
        where: { orderId: order.id },
        data: { status: "CANCELLED" },
      });
      await tx.packageDeliveryDay.updateMany({
        where: { customerPackage: { orderId: order.id } },
        data: { status: "CANCELLED" },
      });
      await tx.studentVerification.updateMany({
        where: { orderId: order.id, status: "PENDING" },
        data: { status: "REJECTED", adminNote: trimmedReason || "Order cancelled.", reviewedAt: new Date() },
      });
    });

    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "order.cancelled",
        entity: "order",
        entityId: order.id,
      },
    });

    const customerEmail = order.customer?.email ?? order.guestEmail;

    if (customerEmail) {
      await sendTransactionalEmail({
        to: customerEmail,
        email: createOrderCancelledEmail({
          customerName: order.customer?.name ?? order.guestName ?? "there",
          orderNumber: order.orderNumber,
          reason: trimmedReason,
        }),
        idempotencyKey: `order-cancelled/${order.id}`,
      });
    }

    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return ok({ id: order.id, status: "DECLINED" }, "Order cancelled and customer notified.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Order could not be cancelled.");
  }
}

export async function markPaymentPaidAction(paymentId: string) {
  try {
    const admin = await requireAdmin();
    const payment = await db.payment.findUnique({
      where: { id: paymentId },
      select: { id: true, orderId: true, status: true },
    });

    if (!payment) {
      return fail("Payment not found.");
    }

    if (payment.status === "PAID") {
      return ok({ id: payment.id }, "Payment is already marked as paid.");
    }

    await markOrderPaidAndActivate(payment.orderId);
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "payment.marked_paid",
        entity: "payment",
        entityId: payment.id,
      },
    });

    revalidatePath("/admin/payments");
    revalidatePath("/admin/orders");
    revalidatePath("/admin");
    return ok({ id: payment.id }, "Payment marked as paid and packages activated.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Payment could not be updated.");
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
      const rules = await getBusinessRules();
      const pendingPackages = await db.customerPackage.findMany({
        where: { orderId: verification.orderId, status: "PENDING_STUDENT_VERIFICATION" },
        include: { deliveryDays: true, package: true },
      });

      await db.$transaction(async (tx) => {
        for (const customerPackage of pendingPackages) {
          const startDate =
            customerPackage.startDate && customerPackage.startDate > new Date()
              ? customerPackage.startDate
              : nextEligiblePackageStartDate(new Date(), rules.deliveryWeekdays);
          const deliveryDates = calculateDeliveryDates(
            customerPackage.totalDeliveryDays,
            startDate,
            rules.deliveryWeekdays,
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
                deliveryWindow: rules.deliveryWindow,
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

    await sendVerificationDecisionEmail({ verificationId, approved: true });

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

    await sendVerificationDecisionEmail({ verificationId, approved: false, adminNote });

    revalidatePath("/admin/students");
    return ok({ id: verificationId }, "Student verification rejected.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Student verification could not be rejected.");
  }
}

export async function adminPausePackageAction(customerPackageId: string, reason?: string) {
  try {
    const admin = await requireAdmin();

    const { remainingDays, resumeBy } = await pausePackage({
      customerPackageId,
      requestedByUserId: admin.id,
      reason,
      adminNote: "Paused by admin.",
    });

    revalidatePath("/admin/customers");
    return ok(
      { id: customerPackageId },
      `Package paused with ${remainingDays} delivery days saved until ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(resumeBy)}.`,
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Package could not be paused.");
  }
}

export async function adminResumePackageAction(customerPackageId: string) {
  try {
    await requireAdmin();

    const { remainingDays } = await resumePackage(customerPackageId);

    revalidatePath("/admin/customers");
    return ok(
      { id: customerPackageId },
      remainingDays
        ? `Package resumed — ${remainingDays} delivery days rescheduled from the next delivery day.`
        : "Package had no delivery days left, so it has ended.",
    );
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
