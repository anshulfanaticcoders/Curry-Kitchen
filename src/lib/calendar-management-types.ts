export type DeliveryTreatment = "AWAITING_RENEWAL" | "COMPLIMENTARY" | "PACKAGE" | "VOIDED";
export type ManagedDeliveryDay = {
  id: string; date: string; status: string; menuSummary: string | null; deliveryWindow: string; requiresConfirmation?: boolean;
};
export type ManagedPackage = {
  id: string; name: string; status: string; quantity: number; totalDeliveryDays: number; usedDeliveryDays: number; unrepresentedUsedDays?: number;
  startDate: string | null; endDate: string | null; paid: boolean; customerPauseUsed: boolean;
  days: ManagedDeliveryDay[];
  pauses: { startDate: string; endDate: string; status: string }[];
  protectedDayIds: string[];
  purchasedDeliveryDays?: number | null;
  orderId?: string; orderNumber?: string; orderStatus?: string;
  verificationStatus?: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
  foodPreferences?: string; allergies?: string; deliveryAddress?: string[];
};
export type ManualDeliveryRecord = {
  id: string; date: string; label: string; quantity: number; treatment: DeliveryTreatment; packageDeliveryDayId: string | null;
  status?: string; sourcePackageId?: string | null;
};
export type CalendarManagementState = {
  customerId: string; revision: number; packages: ManagedPackage[]; manualDeliveries: ManualDeliveryRecord[];
  holidays: { name: string; startDate: string; endDate: string }[];
  deliveryWeekdays: number[]; deliveryWindow: string;
};
export type CalendarChangeInput = {
  customerId: string;
  action: "mark-delivered" | "mark-missed" | "reschedule" | "record-delivery" | "assign-delivery" | "void-delivery" | "undo" | "set-delivered" | "set-not-delivered" | "set-dates" | "apply-renewal";
  date: string;
  packageId?: string;
  deliveryDayId?: string;
  manualDeliveryId?: string;
  targetDate?: string;
  treatment?: "AWAITING_RENEWAL" | "COMPLIMENTARY" | "PACKAGE";
  label?: string;
  quantity?: number;
  reason: string;
  acknowledgeConflict?: boolean;
  changeId?: string;
  dates?: string[];
  startDate?: string;
  endDate?: string;
  sourcePackageId?: string;
  manualDeliveryIds?: string[];
};
export type CalendarBalanceChange = {
  packageId: string; name: string; beforeCompleted: number; afterCompleted: number;
  beforeTotal?: number; afterTotal?: number;
  beforeRemaining: number; afterRemaining: number; beforeEnd: string | null; afterEnd: string | null;
};
export type CalendarChangePreview = {
  fingerprint: string; summary: string; warnings: string[]; balances: CalendarBalanceChange[];
};
export type AdminCalendarData = {
  state: CalendarManagementState;
  today: string;
  history: { id: string; summary: string; reason: string; actor: string; createdAt: string; canUndo: boolean }[];
};
