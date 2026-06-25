import { CustomerProfileClient } from "@/components/dashboard/customer-profile-client";
import { getCustomerProfileDetails } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function CustomerProfilePage() {
  const profile = await getCustomerProfileDetails();

  return <CustomerProfileClient profile={profile} />;
}
