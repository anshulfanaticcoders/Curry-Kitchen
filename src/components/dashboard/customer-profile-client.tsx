"use client";

import Link from "next/link";
import { Loader2 } from "lucide-react";
import { type FormEvent, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, Field, Input, PageHeader } from "@/components/dashboard/primitives";
import { Toggle } from "@/components/dashboard/interactive";
import { Button } from "@/components/ui/button";
import { saveCustomerProfileAction } from "@/lib/actions/customer";
import type { CustomerProfileDetails } from "@/lib/types";

export function CustomerProfileClient({ profile }: { profile: CustomerProfileDetails }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function saveDetails(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);

    startTransition(async () => {
      const result = await saveCustomerProfileAction(formData);

      if (result.ok) {
        toast.success(result.message ?? "Profile updated.");
        router.refresh();
        return;
      }

      toast.error("Profile update failed", {
        description: result.error ?? "Please check the fields and try again.",
      });
    });
  }

  return (
    <div>
      <PageHeader title="Profile" description="Manage your details, delivery address, and meal preferences." />

      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="grid gap-6">
          <Card>
            <CardHeader title="Personal details" />
            <form className="grid gap-5 p-5 md:grid-cols-2" onSubmit={saveDetails}>
              {profile.addressId ? <input type="hidden" name="addressId" value={profile.addressId} /> : null}
              <Field label="Full name">
                <Input name="name" defaultValue={profile.name} required />
              </Field>
              <Field label="Email">
                <Input type="email" defaultValue={profile.email} disabled />
              </Field>
              <Field label="Phone">
                <Input name="phone" defaultValue={profile.phone} />
              </Field>
              <Field label="Street address">
                <Input name="line1" defaultValue={profile.line1} required />
              </Field>
              <Field label="City">
                <Input name="city" defaultValue={profile.city} required />
              </Field>
              <Field label="State">
                <Input name="state" defaultValue={profile.state} required />
              </Field>
              <Field label="ZIP / postal code">
                <Input name="postalCode" defaultValue={profile.postalCode} required />
              </Field>
              <div className="md:col-span-2 flex justify-end gap-3">
                <Button variant="secondary" type="reset" disabled={pending}>
                  Reset
                </Button>
                <Button type="submit" disabled={pending}>
                  {pending ? <Loader2 className="animate-spin" size={18} /> : null}
                  {pending ? "Saving" : "Save details"}
                </Button>
              </div>
            </form>
          </Card>

          <Card>
            <CardHeader title="Food preferences" description="Latest checkout notes saved from your most recent order." />
            <div className="p-5">
              <div className="flex flex-wrap gap-2">
                {profile.preferences.length ? (
                  profile.preferences.map((pref) => (
                    <span
                      key={pref}
                      className="inline-flex items-center rounded-full border border-saffron/30 bg-saffron/15 px-3 py-1.5 text-sm font-bold text-masala"
                    >
                      {pref}
                    </span>
                  ))
                ) : (
                  <p className="text-sm font-bold text-ink/50">No saved food notes yet.</p>
                )}
              </div>
              <p className="mt-4 text-sm leading-6 text-ink/55">
                Add or change food notes during checkout so they stay attached to the next order.
              </p>
            </div>
          </Card>
        </div>

        <div className="grid h-fit gap-6">
          <Card>
            <CardHeader title="Current plan" />
            <div className="p-5">
              <p className="font-display text-2xl font-black">{profile.plan}</p>
              <p className="mt-1 text-sm text-ink/55">Ends {profile.renewalDate}</p>
              <Link
                href="/packages"
                className="mt-5 inline-flex h-11 items-center justify-center rounded-button border border-ink/15 bg-white px-4 text-sm font-extrabold text-ink transition hover:border-saffron hover:bg-rose"
              >
                Change plan
              </Link>
            </div>
          </Card>

          <Card>
            <CardHeader title="Account preferences" />
            <div className="grid gap-3 p-5">
              <Toggle label="Email receipts" description="Get a receipt after each order." defaultChecked />
              <Toggle label="SMS updates" description="Delivery texts on the day." defaultChecked />
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
