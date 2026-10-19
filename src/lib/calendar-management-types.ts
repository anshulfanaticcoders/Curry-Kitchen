export type DeliveryTreatment = "AWAITING_RENEWAL" | "COMPLIMENTARY" | "PACKAGE" | "VOIDED";
export type ManagedDeliveryDay = {
  id: string; date: string; status: string; menuSummary: string | null; deliveryWindow: string;
};
export type ManagedPackage = {
  id: string; name: string; status: string; quantity: number; totalDeliveryDays: number; usedDeliveryDays: number; unrepresentedUsedDays?: number;
  startDate: string | null; endDate: string | null; paid: boolean; customerPauseUsed: boolean;
  days: ManagedDeliveryDay[];
  pauses: { startDate: string; endDate: string; status: string }[];
  protectedDayIds: string[];
};
export type ManualDeliveryRecord = {
  id: string; date: string; label: string; quantity: number; treatment: DeliveryTreatment; packageDeliveryDayId: string | null;
};
export type CalendarManagementState = {
  customerId: string; revision: number; packages: ManagedPackage[]; manualDeliveries: ManualDeliveryRecord[];
  holidays: { name: string; startDate: string; endDate: string }[];
  deliveryWeekdays: number[]; deliveryWindow: string;
};
export type CalendarChangeInput = {
  customerId: string;
  action: "mark-delivered" | "mark-missed" | "reschedule" | "record-delivery" | "assign-delivery" | "void-delivery" | "undo";
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
};
export type CalendarBalanceChange = {
  packageId: string; name: string; beforeCompleted: number; afterCompleted: number;
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
