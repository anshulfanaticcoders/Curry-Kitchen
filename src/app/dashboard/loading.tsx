import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return <div className="space-y-6"><div><Skeleton className="h-9 w-52" /><Skeleton className="mt-3 h-5 w-72" /></div><div className="grid gap-4 sm:grid-cols-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-28" />)}</div><Skeleton className="h-80" /></div>;
}
