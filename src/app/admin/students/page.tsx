import { ShieldCheck } from "lucide-react";
import { AdminStudentsClient } from "@/components/dashboard/admin-students-client";
import { PageHeader, StatCard } from "@/components/dashboard/primitives";
import { getAdminStudentVerifications } from "@/lib/server/catalog";

export const dynamic = "force-dynamic";

export default async function AdminStudentsPage() {
  const verifications = await getAdminStudentVerifications();
  const pending = verifications.filter((verification) => verification.status === "PENDING").length;
  const approved = verifications.filter((verification) => verification.status === "APPROVED").length;
  const rejected = verifications.filter((verification) => verification.status === "REJECTED").length;

  return (
    <div>
      <PageHeader
        title="Student & military verification"
        description="Review uploaded IDs, then approve to activate the discounted packages or reject with a note."
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <StatCard label="Pending review" value={String(pending)} tone="watch" icon={<ShieldCheck size={20} />} />
        <StatCard label="Approved" value={String(approved)} tone="good" />
        <StatCard label="Rejected" value={String(rejected)} />
      </div>
      <AdminStudentsClient verifications={verifications} />
    </div>
  );
}
