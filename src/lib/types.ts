export type PackageCategory = "Monthly" | "Weekly" | "Student";

export type PackageAddOn = {
  id: string;
  name: string;
  description: string;
  price: number;
};

export type PackagePlan = {
  id: string;
  name: string;
  category: PackageCategory;
  badge: string;
  price: number;
  taxRate: number;
  cadence: string;
  servings: string;
  image: string;
  description: string;
  bestFor: string;
  includes: string[];
  addOns: PackageAddOn[];
  accent: "saffron" | "leaf" | "masala";
};

export type AdminPackageRecord = PackagePlan & {
  categoryId: string;
  deliveryDayCount: number;
  status: ProductStatus;
  studentOnly: boolean;
  addonIds: string[];
};

export type AdminAddonRecord = PackageAddOn & {
  imageUrl?: string;
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

export type OrderStatus = "Preparing" | "Out for delivery" | "Delivered" | "Paused";

export type Order = {
  id: string;
  plan: string;
  date: string;
  total: number;
  status: OrderStatus;
  deliveryWindow: string;
};

export type Delivery = {
  id: string;
  day: string;
  meal: string;
  status: OrderStatus;
  eta: string;
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
  status: "Active" | "Paused" | "Pending payment" | "Needs student approval" | "Expired" | "No active plan";
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

export type TaxRate = {
  id: string;
  region: string;
  rate: number;
  appliesTo: string;
  status: "Active" | "Inactive";
};

export type MenuItem = {
  id: string;
  name: string;
  type: "Daal" | "Sabzi" | "Rice" | "Roti" | "Side" | "Dessert";
  spice: "Mild" | "Medium" | "Homestyle";
  veg: boolean;
  status: "Active" | "Draft";
  description?: string;
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
};

export type PackagingPackage = {
  id: string;
  name: string;
  status: string;
  startDate: string;
  deliveryProgress: string;
  nextDelivery: string;
  deliveryWindow: string;
  includes: string[];
  addons: string[];
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
  status: OrderStatus;
  date: string;
  window: string;
};

export type PlanPerformance = {
  name: string;
  value: number;
};
