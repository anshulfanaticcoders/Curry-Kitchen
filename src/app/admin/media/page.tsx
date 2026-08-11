import { AdminMediaClient } from "@/components/dashboard/admin-media-client";
import { getAdminMediaLibrary } from "@/lib/server/admin";

export const dynamic = "force-dynamic";

export default async function AdminMediaPage() {
  const { assets, folders } = await getAdminMediaLibrary();

  return <AdminMediaClient assets={assets} folders={folders} />;
}
