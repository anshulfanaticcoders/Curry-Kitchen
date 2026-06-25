"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fail, ok } from "@/lib/action-result";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/lib/db";

const profileSchema = z.object({
  name: z.string().min(2),
  phone: z.string().optional(),
  addressId: z.string().optional(),
  line1: z.string().min(4),
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

    const { addressId, line1, city, state, postalCode, ...data } = parsed.data;
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
        data: { line1, city, state, postalCode, isDefault: true },
      });
    } else {
      await db.address.create({
        data: {
          customerId: customer.id,
          name: data.name,
          line1,
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

export async function requestCustomerPauseAction(customerPackageId: string, reason?: string) {
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
      return fail("You can only pause your own package.");
    }

    if (customerPackage.customerPauseUsed) {
      return fail("This package has already used its one customer pause.");
    }

    await db.$transaction([
      db.customerPackage.update({
        where: { id: customerPackageId },
        data: {
          status: "PAUSED",
          customerPauseUsed: true,
        },
      }),
      db.pauseRequest.create({
        data: {
          customerPackageId,
          requestedByUserId: user.id,
          status: "ACTIVE",
          startDate: new Date(),
          endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          reason,
        },
      }),
      db.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: "Package paused",
          body: "Your package is paused for this week. Admin can resume or extend it if needed.",
        },
      }),
    ]);

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/orders");
    return ok({ id: customerPackageId }, "Package paused.");
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Package could not be paused.");
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
