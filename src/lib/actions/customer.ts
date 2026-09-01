"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok } from "@/lib/action-result";
import { getCurrentSession } from "@/lib/auth";
import { getBusinessRules } from "@/lib/business-rules";
import { db } from "@/lib/db";
import { scheduleCustomerPause } from "@/lib/server/delivery-schedule-adjustments";
import { resumePackage } from "@/lib/server/package-pause";

const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  addressId: z.string().optional(),
  line1: z.string().min(4),
  line2: z.string().optional(),
  city: z.string().min(2),
  state: z.string().min(2).default("CA"),
  postalCode: z.string().min(5),
});

async function getSessionUser() {
  const session = await getCurrentSession();

  if (!session?.user?.id) {
    throw new Error("Please sign in to continue.");
  }

  return session.user;
}

export async function saveCustomerProfileAction(formData: FormData) {
  try {
    const user = await getSessionUser();
    const parsed = profileSchema.safeParse(Object.fromEntries(formData.entries()));

    if (!parsed.success) {
      return fail("Please fix the profile fields.", parsed.error.flatten().fieldErrors);
    }

    const { addressId, line1, line2, city, state, postalCode, ...data } = parsed.data;
    const customer = await db.customer.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        name: data.name,
        email: user.email ?? "",
        phone: data.phone,
      },
      update: {
        name: data.name,
        phone: data.phone,
      },
    });

    await db.user.update({
      where: { id: user.id },
      data: { name: data.name },
    });

    if (addressId) {
      await db.address.updateMany({
        where: { id: addressId, customerId: customer.id },
        data: { line1, line2: line2 || null, city, state, postalCode, isDefault: true },
      });
    } else {
      await db.address.create({
        data: {
          customerId: customer.id,
          name: data.name,
          line1,
          line2: line2 || null,
          city,
          state,
          postalCode,
          isDefault: true,
        },
      });
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/profile");
    return ok({ id: customer.id }, "Profile updated.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Profile could not be updated.");
  }
}

const pauseScheduleSchema = z
  .object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid pause start date."),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose a valid pause end date."),
    reason: z.string().trim().max(300).optional(),
  })
  .refine((value) => value.endDate >= value.startDate, {
    message: "Pause end date must be on or after its start date.",
    path: ["endDate"],
  });

export async function requestCustomerPauseAction(
  customerPackageId: string,
  startDate: string,
  endDate: string,
  reason?: string,
) {
  try {
    const user = await getSessionUser();
    const rules = await getBusinessRules();
    if (!rules.enableCheckoutPauses) {
      return fail("Customer package pauses are not available right now.");
    }
    const customerPackage = await db.customerPackage.findUnique({
      where: { id: customerPackageId },
      include: { customer: true },
    });

    if (!customerPackage) {
      return fail("Package was not found.");
    }

    if (customerPackage.customer?.userId !== user.id) {
      return fail("You can only pause your own package.");
    }

    if (customerPackage.customerPauseUsed) {
      return fail("This package has already used its one customer pause.");
    }

    const parsed = pauseScheduleSchema.safeParse({ startDate, endDate, reason });
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "Choose a valid pause range.");
    }

    const result = await scheduleCustomerPause({
      customerPackageId,
      requestedByUserId: user.id,
      startDateInput: parsed.data.startDate,
      endDateInput: parsed.data.endDate,
      reason: parsed.data.reason,
    });

    const formatDate = (date: Date) => new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(date);

    await db.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "Package pause scheduled",
        body: `Deliveries are paused ${formatDate(result.startDate)}–${formatDate(result.endDate)}. ${result.creditedDays} ${result.creditedDays === 1 ? "day was" : "days were"} moved to the end of your package.`,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/calendar");
    return ok(
      { id: customerPackageId, creditedDays: result.creditedDays },
      `Pause scheduled. Deliveries automatically resume ${formatDate(result.resumeDate)}.`,
    );
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Package could not be paused.");
  }
}

export async function resumeCustomerPackageAction(customerPackageId: string) {
  try {
    const user = await getSessionUser();
    const customerPackage = await db.customerPackage.findUnique({
      where: { id: customerPackageId },
      include: { customer: true },
    });

    if (!customerPackage) {
      return fail("Package was not found.");
    }

    if (customerPackage.customer?.userId !== user.id) {
      return fail("You can only resume your own package.");
    }

    const { remainingDays } = await resumePackage(customerPackageId);

    if (!remainingDays) {
      return fail("This package has no delivery days left, so it has ended.");
    }

    await db.notification.create({
      data: {
        userId: user.id,
        type: "SYSTEM",
        title: "Package resumed",
        body: `Deliveries restart on the next delivery day — ${remainingDays} delivery days to go.`,
      },
    });

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    revalidatePath("/dashboard/calendar");
    return ok({ id: customerPackageId }, "Package resumed. Deliveries restart on the next delivery day.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Package could not be resumed.");
  }
}

export async function markNotificationReadAction(notificationId: string) {
  try {
    const user = await getSessionUser();
    const notification = await db.notification.findUnique({
      where: { id: notificationId },
    });

    if (!notification || notification.userId !== user.id) {
      return fail("Notification was not found.");
    }

    await db.notification.update({
      where: { id: notificationId },
      data: { read: true },
    });

    revalidatePath("/dashboard/notifications");
    return ok({ id: notificationId, userId: user.id }, "Notification marked read.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Notification could not be updated.");
  }
}

export async function markAllNotificationsReadAction() {
  try {
    const user = await getSessionUser();

    await db.notification.updateMany({
      where: { userId: user.id },
      data: { read: true },
    });

    revalidatePath("/dashboard/notifications");
    return ok({ userId: user.id }, "All notifications marked read.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Notifications could not be updated.");
  }
}

export async function saveCustomerCommunicationPreferencesAction(
  emailReceipts: boolean,
  smsUpdates: boolean,
) {
  try {
    const user = await getSessionUser();

    await db.customer.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        name: user.name?.trim() || user.email?.split("@")[0] || "Curry Kitchen customer",
        email: user.email ?? "",
        emailReceipts,
        smsUpdates,
      },
      update: { emailReceipts, smsUpdates },
    });

    revalidatePath("/dashboard/profile");
    return ok({ userId: user.id }, "Communication preferences updated.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Preferences could not be updated.");
  }
}
