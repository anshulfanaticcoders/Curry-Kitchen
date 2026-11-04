export const ADMIN_ORDER_PAGE_SIZE = 50;
export const ADMIN_CUSTOMER_PAGE_SIZE = 80;
export const ADMIN_ORDER_FILTERS = ["all", "Accepted", "Pending payment", "Cancelled"] as const;
export type AdminListQuery = { q: string; page: number; status: (typeof ADMIN_ORDER_FILTERS)[number] };
export type AdminSearchParams = Record<string, string | string[] | undefined>;

export function parseAdminListQuery(params: AdminSearchParams): AdminListQuery {
  const first = (value: string | string[] | undefined) => Array.isArray(value) ? value[0] ?? "" : value ?? "";
  const page = Number(first(params.page));
  const status = first(params.status);
  return {
    q: first(params.q).trim().replace(/\s+/g, " ").slice(0, 120),
    page: Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1,
    status: ADMIN_ORDER_FILTERS.find((value) => value === status) ?? "all",
  };
}

export function adminListHref(path: string, query: AdminListQuery) {
  const params = new URLSearchParams();
  if (query.q) params.set("q", query.q);
  if (query.page > 1) params.set("page", String(query.page));
  if (query.status !== "all") params.set("status", query.status);
  return `${path}${params.size ? `?${params}` : ""}`;
}
