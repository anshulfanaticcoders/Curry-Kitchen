export type PackageCategory = "Monthly" | "Weekly" | "Student";

export type PackagePlan = {
  id: string;
  slug: string;
  name: string;
  category: PackageCategory;
  badge: string;
  price: number;
  cadence: string;
  servings: string;
  image: string;
  description: string;
  bestFor: string;
  includes: string[];
  accent: "saffron" | "leaf" | "masala";
  updatedAt?: string;
};

export type AdminPackageRecord = PackagePlan & {
  categoryId: string;
  deliveryDayCount: number;
  status: ProductStatus;
  studentOnly: boolean;
};

export type AdminCustomPackageItemRecord = {
  id: string;
  name: string;
  unitLabel: string;
  pricePerUnit: number;
  required: boolean;
  sortOrder: number;
  status: ProductStatus;
};

export type DeliveryZoneRecord = {
  id: string;
  name: string;
  cities: string[];
  postalCodes: string[];
  fee: number;
  isFreeDelivery: boolean;
  outsideZone: boolean;
  status: ProductStatus;
};

export type AdminSettings = {
  maintenanceMode: boolean;
  businessName: string;
  supportEmail: string;
  phone: string;
  currency: string;
  taxRate: number;
  serviceAreas: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  orderCutoff: string;
  deliveryDays: string;
  customMonthlyDays: number;
  acceptWeeklyTrials: boolean;
  enableCheckoutPauses: boolean;
  orderConfirmationEmails: boolean;
  packageReminderEmails: boolean;
  packageReminderSms: boolean;
  packageCompletedEmails: boolean;
  outForDeliverySms: boolean;
  weeklyMenuEmails: boolean;
};

export type AdminSeoRecord = {
  id?: string;
  targetType: "STATIC_PAGE" | "PACKAGE";
  packageId?: string;
  page: string;
  path: string;
  title: string;
  description: string;
  defaultTitle: string;
  defaultDescription: string;
  ogTitle: string;
  ogDescription: string;
  ogImageUrl: string;
  ogImageAlt: string;
  indexed: boolean;
  includeInSitemap: boolean;
  schemaEnabled: boolean;
  configured: boolean;
  status: ProductStatus;
  updatedAt?: string;
};

export type SeoSettings = {
  titleSuffix: string;
  defaultDescription: string;
  defaultSocialImage: string;
  logoUrl: string;
  cuisine: string;
  priceRange: string;
  socialProfiles: string[];
  googleVerification: string;
};

export type AdminSeoManagerData = {
  origin: string;
  settings: SeoSettings;
  records: AdminSeoRecord[];
};

export type WeeklyMenuDay = {
  day: string;
  date: string;
  headline: string;
  daal: string;
  sabzi: string;
  rice: string;
  side: string;
  dessert?: string;
  spice: "Mild" | "Medium" | "Homestyle";
  image: string;
};


// Paid orders are accepted automatically; the only other states are waiting
// on payment (Zelle) or cancelled by an admin.
export type OrderDecision = "Pending payment" | "Accepted" | "Cancelled";

export type Order = {
  id: string;
  plan: string;
  date: string;
  total: number;
  status: OrderDecision;
};

export type Delivery = {
  id: string;
  day: string;
  date: string;
  meal: string;
};

export type CustomerProfile = {
  name: string;
  email: string;
  phone: string;
  plan: string;
  renewalDate: string;
  address: string;
  preferences: string[];
};

export type CustomerProfileDetails = CustomerProfile & {
  emailReceipts: boolean;
  smsUpdates: boolean;
  addressId?: string;
  line1: string;
  city: string;
  state: string;
  postalCode: string;
};

export type CustomerPackageSummary = {
  id?: string;
  plan: string;
  quantity: number;
  status: "Active" | "Paused" | "Pending payment" | "Needs student approval" | "Cancelled" | "Expired" | "No active plan";
  totalDeliveryDays: number;
  usedDeliveryDays: number;
  remainingDeliveryDays: number;
  customerPauseUsed: boolean;
  canSelfPause: boolean;
  startDate: string;
  endDate: string;
};

export type AdminMetric = {
  label: string;
  value: string;
  change: string;
  tone: "good" | "watch" | "neutral";
};

export type AdminCustomer = {
  name: string;
  plan: string;
  area: string;
  status: "Active" | "Trial" | "Paused";
  renewal: string;
};

export type RevenuePoint = {
  label: string;
  orders: number;
  revenue: number;
};

export type ProductStatus = "Active" | "Draft" | "Archived";

export type Category = {
  id: string;
  name: string;
  slug: string;
  count: number;
  description: string;
  status?: ProductStatus;
};

export type Tag = { id: string; name: string; slug: string; count: number };

export type MenuItem = {
  id: string;
  name: string;
  type: "Daal" | "Sabzi" | "Rice" | "Roti" | "Side" | "Dessert";
  spice: "Mild" | "Medium" | "Homestyle";
  veg: boolean;
  status: "Active" | "Draft";
  description?: string;
};

export type MenuUploadView = {
  id: string;
  title: string;
  fileUrl: string;
  isPdf: boolean;
  dateRangeLabel: string;
  current: boolean;
};

export type CalendarEventType =
  | "delivery"
  | "pause"
  | "package-start"
  | "package-end";

export type CalendarEvent = {
  date: string;
  type: CalendarEventType;
  label: string;
};

export type CustomerCalendarData = {
  customerId: string;
  customerName: string;
  deliveryWeekdays: number[];
  packages: Array<{
    name: string;
    status: string;
    startDate: string | null;
    endDate: string | null;
    remainingDays: number;
    resumeBy: string | null;
  }>;
  events: CalendarEvent[];
};

export type AdminMediaAsset = {
  id: string;
  fileName: string;
  fileUrl: string;
  folder: string;
  sizeLabel: string;
  uploadedAt: string;
};

export type AdminMenuUpload = {
  id: string;
  title: string;
  fileUrl: string;
  isPdf: boolean;
  startDate: string;
  endDate: string;
  dateRangeLabel: string;
  expired: boolean;
};

export type Coupon = {
  id: string;
  code: string;
  type: "Percent" | "Flat";
  value: number;
  status: "Active" | "Scheduled" | "Expired";
  usage: number;
  limit: number;
  expires: string;
  expiresAt?: string;
  customerId?: string | null;
  customerName?: string | null;
};

export type AdminCustomerOption = {
  id: string;
  name: string;
  email: string;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: string;
  status: "Active" | "Trial" | "Paused";
  joined: string;
  orders: number;
  spend: number;
  area: string;
  activePackageId?: string;
};

export type PackagingPackage = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  deliveryProgress: string;
  nextDelivery: string;
  includes: string[];
  foodPreferences: string;
};

export type PackagingRecord = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  packages: PackagingPackage[];
};

export type Transaction = {
  id: string;
  orderId: string;
  customer: string;
  method: string;
  amount: number;
  status: "Paid" | "Refunded" | "Pending";
  date: string;
};

export type ReviewItem = {
  id: string;
  name: string;
  plan: string;
  rating: number;
  text: string;
  status: "Published" | "Pending" | "Spam";
  date: string;
};

export type NotificationItem = {
  id: string;
  title: string;
  body: string;
  time: string;
  type: "order" | "payment" | "system" | "offer";
  read: boolean;
};

export type SeoEntry = {
  id: string;
  page: string;
  path: string;
  title: string;
  description: string;
  indexed: boolean;
};

export type AdminOrder = {
  id: string;
  customer: string;
  plan: string;
  items: number;
  total: number;
  payment: "Paid" | "Pending" | "Refunded";
  status: OrderDecision;
  date: string;
};

export type PlanPerformance = {
  name: string;
  value: number;
};

export type AdminStudentVerification = {
  id: string;
  customerName: string;
  customerEmail: string;
  orderNumber: string | null;
  verificationType: "STUDENT" | "MILITARY";
  universityName: string;
  studentNumber: string;
  idCardUrl: string | null;
  idCardBackUrl: string | null;
  status: "NOT_REQUIRED" | "PENDING" | "APPROVED" | "REJECTED";
  adminNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
};
