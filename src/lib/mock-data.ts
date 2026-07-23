import type {
  AdminCustomer,
  AdminMetric,
  AdminOrder,
  Category,
  Coupon,
  Customer,
  CustomerProfile,
  Delivery,
  MenuItem,
  NotificationItem,
  Order,
  PackagePlan,
  PlanPerformance,
  ReviewItem,
  RevenuePoint,
  SeoEntry,
  Tag,
  TaxRate,
  Transaction,
  WeeklyMenuDay,
} from "./types";

export const packagePlans: PackagePlan[] = [
  {
    id: "monthly-small",
    name: "Small 4 Roti Tiffin",
    category: "Monthly",
    badge: "Starter favorite",
    price: 250,
    taxRate: 0.05,
    cadence: "5 days a week",
    servings: "4 roti, daal, sabzi, salad",
    image:
      "https://images.unsplash.com/photo-1630409346824-4f0e7b080087?auto=format&fit=crop&w=1200&q=80",
    description:
      "Balanced daily comfort meals for light appetites, students, and busy professionals.",
    bestFor: "Light appetite",
    includes: ["8oz daal", "6oz sabzi", "Yogurt 5 days", "Dessert once weekly"],
    addOns: [
      { id: "rice", name: "Rice bowl", description: "Replace 2 roti", price: 30 },
      { id: "extra-yogurt", name: "Extra yogurt", description: "Daily 6oz cup", price: 24 },
    ],
    accent: "leaf",
  },
  {
    id: "monthly-regular",
    name: "Regular 8 Roti Tiffin",
    category: "Monthly",
    badge: "Most loved",
    price: 350,
    taxRate: 0.05,
    cadence: "5 days a week",
    servings: "8 roti, daal, sabzi, rice option",
    image:
      "https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=1200&q=80",
    description:
      "The classic Curry Kitchen plan with filling portions and rotating homestyle dishes.",
    bestFor: "Daily dinner",
    includes: ["12oz daal", "8oz sabzi", "Salad included", "Dessert once weekly"],
    addOns: [
      { id: "rice", name: "Rice bowl", description: "Replace 2 roti", price: 30 },
      { id: "spice-note", name: "Spice note", description: "Personal preference", price: 0 },
    ],
    accent: "saffron",
  },
  {
    id: "monthly-xl",
    name: "Extra Large 12 Roti Tiffin",
    category: "Monthly",
    badge: "Family portion",
    price: 450,
    taxRate: 0.05,
    cadence: "5 days a week",
    servings: "12 roti, larger daal and sabzi",
    image:
      "https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=1200&q=80",
    description:
      "Generous portions for big appetites, shared meals, or families who want dinner handled.",
    bestFor: "Shared meals",
    includes: ["12oz daal", "12oz sabzi", "Yogurt 5 days", "Basmati rice option"],
    addOns: [
      { id: "rice", name: "Rice bowl", description: "Replace 2 roti", price: 30 },
      { id: "dessert", name: "Extra dessert", description: "Weekly sweet add-on", price: 18 },
    ],
    accent: "masala",
  },
  {
    id: "weekly-trial",
    name: "Weekly Trial Pack",
    category: "Weekly",
    badge: "Try first",
    price: 95,
    taxRate: 0.05,
    cadence: "One week",
    servings: "6 meals",
    image:
      "https://images.unsplash.com/photo-1604909052743-94e838986d24?auto=format&fit=crop&w=1200&q=80",
    description:
      "A flexible trial plan for customers who want to taste the weekly rotation first.",
    bestFor: "New customers",
    includes: ["6 fresh meals", "Rotating menu", "Delivery included", "Pause anytime"],
    addOns: [
      { id: "rice", name: "Rice bowl", description: "Add for the week", price: 10 },
      { id: "salad", name: "Extra salad", description: "Fresh daily side", price: 8 },
    ],
    accent: "leaf",
  },
  {
    id: "student-pack",
    name: "Student & Military Saver Pack",
    category: "Student",
    badge: "Verified pricing",
    price: 220,
    taxRate: 0.05,
    cadence: "Monthly",
    servings: "Simple daily meals",
    image:
      "https://images.unsplash.com/photo-1617692855027-33b14f061079?auto=format&fit=crop&w=1200&q=80",
    description:
      "Affordable, steady meals for study weeks, long shifts, and shared student housing.",
    bestFor: "Students / Military",
    includes: ["Veg meals", "Weekly menu", "Simple portions", "Verification pricing"],
    addOns: [
      { id: "rice", name: "Rice bowl", description: "Weekly add-on", price: 20 },
      { id: "roti", name: "Extra roti", description: "Two extra roti daily", price: 25 },
    ],
    accent: "saffron",
  },
];

export const weeklyMenu: WeeklyMenuDay[] = [
  {
    day: "Monday",
    date: "Jun 22",
    headline: "Creamy comfort start",
    daal: "Dal makhani",
    sabzi: "Aloo gobi",
    rice: "Jeera rice",
    side: "Kachumber salad",
    dessert: "Gulab jamun",
    spice: "Medium",
    image:
      "https://images.unsplash.com/photo-1585937421612-70a008356fbe?auto=format&fit=crop&w=900&q=80",
  },
  {
    day: "Tuesday",
    date: "Jun 23",
    headline: "Bright Punjabi plate",
    daal: "Yellow tadka dal",
    sabzi: "Matar paneer",
    rice: "Steamed basmati",
    side: "Boondi raita",
    spice: "Homestyle",
    image:
      "https://images.unsplash.com/photo-1631452180539-96aca7d48617?auto=format&fit=crop&w=900&q=80",
  },
  {
    day: "Wednesday",
    date: "Jun 24",
    headline: "Light midweek thali",
    daal: "Moong dal",
    sabzi: "Bhindi masala",
    rice: "Lemon rice",
    side: "Pickled onion",
    spice: "Mild",
    image:
      "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?auto=format&fit=crop&w=900&q=80",
  },
  {
    day: "Thursday",
    date: "Jun 25",
    headline: "North Indian classic",
    daal: "Chana dal",
    sabzi: "Rajma masala",
    rice: "Basmati pulao",
    side: "Cucumber salad",
    spice: "Medium",
    image:
      "https://images.unsplash.com/photo-1631292784640-2b24be784d5d?auto=format&fit=crop&w=900&q=80",
  },
  {
    day: "Friday",
    date: "Jun 26",
    headline: "Weekend warm-up",
    daal: "Kadhi pakora",
    sabzi: "Mixed veg curry",
    rice: "Peas pulao",
    side: "Mint chutney",
    dessert: "Kheer",
    spice: "Homestyle",
    image:
      "https://images.unsplash.com/photo-1596797038530-2c107229654b?auto=format&fit=crop&w=900&q=80",
  },
];

export const testimonials = [
  {
    name: "Priya Sharma",
    role: "Monthly plan customer",
    area: "San Diego",
    rating: "5.0",
    quote:
      "It feels like someone planned dinner for my week, not like I ordered takeout again.",
  },
  {
    name: "Aman Gill",
    role: "Student and military saver plan",
    area: "UC San Diego",
    rating: "5.0",
    quote:
      "The meals are consistent, filling, and easy on my budget. I do not have to think about dinner after class.",
  },
  {
    name: "Neha Patel",
    role: "Weekly trial customer",
    area: "Chula Vista",
    rating: "4.9",
    quote:
      "The weekly menu helped me decide before ordering. Everything felt homemade, especially the dal and sabzi.",
  },
  {
    name: "Rohan Mehta",
    role: "Family portion plan",
    area: "La Jolla",
    rating: "5.0",
    quote:
      "The larger tiffin works perfectly for our house. Portions are clear and delivery is dependable.",
  },
];

export const customerProfile: CustomerProfile = {
  name: "Priya Sharma",
  email: "priya@example.com",
  phone: "(858) 555-0148",
  plan: "Regular 8 Roti Tiffin",
  renewalDate: "Jul 22, 2026",
  address: "750 B St, San Diego, CA",
  preferences: ["Medium spice", "Rice on Monday", "No onion salad"],
};

export const recentOrders: Order[] = [
  {
    id: "CK-1048",
    plan: "Regular 8 Roti Tiffin",
    date: "Jun 21, 2026",
    total: 368,
    status: "Delivered",
    deliveryWindow: "6:00 PM - 8:00 PM",
  },
  {
    id: "CK-1041",
    plan: "Weekly Trial Pack",
    date: "Jun 14, 2026",
    total: 100,
    status: "Delivered",
    deliveryWindow: "6:00 PM - 8:00 PM",
  },
  {
    id: "CK-1033",
    plan: "Student & Military Saver Pack",
    date: "Jun 07, 2026",
    total: 231,
    status: "Paused",
    deliveryWindow: "5:00 PM - 7:00 PM",
  },
];

export const upcomingDeliveries: Delivery[] = [
  {
    id: "DEL-2201",
    day: "Today",
    meal: "Dal makhani with aloo gobi",
    status: "Preparing",
    eta: "7:15 PM",
  },
  {
    id: "DEL-2202",
    day: "Tuesday",
    meal: "Yellow dal with matar paneer",
    status: "Preparing",
    eta: "7:00 PM",
  },
  {
    id: "DEL-2203",
    day: "Wednesday",
    meal: "Moong dal with bhindi masala",
    status: "Preparing",
    eta: "7:20 PM",
  },
];

export const adminMetrics: AdminMetric[] = [
  { label: "Monthly revenue", value: "$18.4k", change: "+14% this month", tone: "good" },
  { label: "Active plans", value: "146", change: "18 renew this week", tone: "neutral" },
  { label: "Today deliveries", value: "82", change: "9 need attention", tone: "watch" },
  { label: "Repeat customers", value: "71%", change: "+6% vs last month", tone: "good" },
];

export const adminCustomers: AdminCustomer[] = [
  { name: "Priya Sharma", plan: "Regular Monthly", area: "San Diego", status: "Active", renewal: "Jul 22" },
  { name: "Aman Gill", plan: "Student & Military Saver", area: "UC San Diego", status: "Active", renewal: "Jul 10" },
  { name: "Neha Patel", plan: "Weekly Trial", area: "Chula Vista", status: "Trial", renewal: "Jun 29" },
  { name: "Rohan Mehta", plan: "Extra Large", area: "La Jolla", status: "Paused", renewal: "Jul 02" },
];

export const revenueData: RevenuePoint[] = [
  { label: "Mon", orders: 52, revenue: 2800 },
  { label: "Tue", orders: 61, revenue: 3300 },
  { label: "Wed", orders: 58, revenue: 3180 },
  { label: "Thu", orders: 74, revenue: 4100 },
  { label: "Fri", orders: 82, revenue: 5020 },
];

export const planPerformance: PlanPerformance[] = [
  { name: "Regular", value: 42 },
  { name: "Small", value: 24 },
  { name: "Student", value: 18 },
  { name: "XL", value: 16 },
];

export const productCategories: Category[] = [
  { id: "cat-monthly", name: "Monthly", slug: "monthly", count: 3, description: "Full-month tiffin plans billed every 4 weeks." },
  { id: "cat-weekly", name: "Weekly", slug: "weekly", count: 1, description: "Short trial plans for new customers." },
  { id: "cat-student", name: "Student", slug: "student", count: 1, description: "Budget plans with student pricing." },
  { id: "cat-addons", name: "Add-ons", slug: "add-ons", count: 6, description: "Rice bowls, extra roti, yogurt, and dessert upgrades." },
];

export const productTags: Tag[] = [
  { id: "tag-veg", name: "Vegetarian", slug: "vegetarian", count: 5 },
  { id: "tag-bestseller", name: "Bestseller", slug: "bestseller", count: 2 },
  { id: "tag-budget", name: "Budget", slug: "budget", count: 2 },
  { id: "tag-family", name: "Family", slug: "family", count: 1 },
  { id: "tag-trial", name: "Trial", slug: "trial", count: 1 },
];

export const taxRates: TaxRate[] = [
  { id: "tax-ca", region: "California sales tax", rate: 8.75, appliesTo: "All plans", status: "Active" },
  { id: "tax-local", region: "Local add-on tax", rate: 2.5, appliesTo: "Add-ons only", status: "Active" },
  { id: "tax-student", region: "Student exemption", rate: 0, appliesTo: "Student plans", status: "Inactive" },
];

export const menuItems: MenuItem[] = [
  { id: "mi-1", name: "Dal makhani", type: "Daal", spice: "Medium", veg: true, status: "Active" },
  { id: "mi-2", name: "Yellow tadka dal", type: "Daal", spice: "Homestyle", veg: true, status: "Active" },
  { id: "mi-3", name: "Aloo gobi", type: "Sabzi", spice: "Medium", veg: true, status: "Active" },
  { id: "mi-4", name: "Matar paneer", type: "Sabzi", spice: "Homestyle", veg: true, status: "Active" },
  { id: "mi-5", name: "Bhindi masala", type: "Sabzi", spice: "Mild", veg: true, status: "Active" },
  { id: "mi-6", name: "Jeera rice", type: "Rice", spice: "Mild", veg: true, status: "Active" },
  { id: "mi-7", name: "Lemon rice", type: "Rice", spice: "Mild", veg: true, status: "Draft" },
  { id: "mi-8", name: "Soft roti", type: "Roti", spice: "Mild", veg: true, status: "Active" },
  { id: "mi-9", name: "Kachumber salad", type: "Side", spice: "Mild", veg: true, status: "Active" },
  { id: "mi-10", name: "Gulab jamun", type: "Dessert", spice: "Mild", veg: true, status: "Active" },
  { id: "mi-11", name: "Kheer", type: "Dessert", spice: "Mild", veg: true, status: "Draft" },
];

export const coupons: Coupon[] = [
  { id: "cp-1", code: "WELCOME15", type: "Percent", value: 15, status: "Active", usage: 128, limit: 500, expires: "Aug 31, 2026" },
  { id: "cp-2", code: "STUDENT20", type: "Percent", value: 20, status: "Active", usage: 64, limit: 200, expires: "Dec 31, 2026" },
  { id: "cp-3", code: "FREEDELIVERY", type: "Flat", value: 10, status: "Scheduled", usage: 0, limit: 300, expires: "Jul 15, 2026" },
  { id: "cp-4", code: "DIWALI25", type: "Percent", value: 25, status: "Expired", usage: 410, limit: 410, expires: "Nov 5, 2025" },
];

export const customers: Customer[] = [
  { id: "cu-1", name: "Priya Sharma", email: "priya@example.com", phone: "(858) 555-0148", plan: "Regular 8 Roti Tiffin", status: "Active", joined: "Jan 12, 2026", orders: 18, spend: 6240, area: "San Diego" },
  { id: "cu-2", name: "Aman Gill", email: "aman@example.com", phone: "(619) 555-0192", plan: "Student & Military Saver Pack", status: "Active", joined: "Feb 3, 2026", orders: 12, spend: 2640, area: "UC San Diego" },
  { id: "cu-3", name: "Neha Patel", email: "neha@example.com", phone: "(619) 555-0110", plan: "Weekly Trial Pack", status: "Trial", joined: "Jun 14, 2026", orders: 1, spend: 95, area: "Chula Vista" },
  { id: "cu-4", name: "Rohan Mehta", email: "rohan@example.com", phone: "(858) 555-0173", plan: "Extra Large 12 Roti Tiffin", status: "Paused", joined: "Mar 22, 2026", orders: 9, spend: 4050, area: "La Jolla" },
  { id: "cu-5", name: "Simran Kaur", email: "simran@example.com", phone: "(858) 555-0166", plan: "Regular 8 Roti Tiffin", status: "Active", joined: "Apr 8, 2026", orders: 7, spend: 2450, area: "San Diego" },
];

export const transactions: Transaction[] = [
  { id: "tx-9001", orderId: "CK-1048", customer: "Priya Sharma", method: "Visa •4242", amount: 368, status: "Paid", date: "Jun 21, 2026" },
  { id: "tx-9000", orderId: "CK-1047", customer: "Simran Kaur", method: "Mastercard •8821", amount: 350, status: "Paid", date: "Jun 20, 2026" },
  { id: "tx-8999", orderId: "CK-1046", customer: "Aman Gill", method: "Interac", amount: 220, status: "Paid", date: "Jun 19, 2026" },
  { id: "tx-8998", orderId: "CK-1041", customer: "Neha Patel", method: "Visa •1190", amount: 100, status: "Refunded", date: "Jun 14, 2026" },
  { id: "tx-8997", orderId: "CK-1040", customer: "Rohan Mehta", method: "Amex •3007", amount: 450, status: "Pending", date: "Jun 13, 2026" },
];

export const reviewItems: ReviewItem[] = [
  { id: "rv-1", name: "Priya Sharma", plan: "Regular Monthly", rating: 5, text: "It feels like someone planned dinner for my week, not like I ordered takeout again.", status: "Published", date: "Jun 18, 2026" },
  { id: "rv-2", name: "Aman Gill", plan: "Student & Military Saver", rating: 5, text: "Consistent, filling, and easy on my budget. I don't think about dinner after class.", status: "Published", date: "Jun 16, 2026" },
  { id: "rv-3", name: "Neha Patel", plan: "Weekly Trial", rating: 4, text: "The weekly menu helped me decide before ordering. Dal and sabzi felt homemade.", status: "Pending", date: "Jun 22, 2026" },
  { id: "rv-4", name: "Unknown", plan: "—", rating: 1, text: "Buy cheap meds online now www.spam-link.example", status: "Spam", date: "Jun 21, 2026" },
];

export const notifications: NotificationItem[] = [
  { id: "nt-1", title: "Out for delivery", body: "Your Monday tiffin is on the way, arriving ~7:15 PM.", time: "10 min ago", type: "order", read: false },
  { id: "nt-2", title: "Payment received", body: "We charged $368 to Visa ending 4242 for your June plan.", time: "2 hours ago", type: "payment", read: false },
  { id: "nt-3", title: "New weekly menu", body: "Next week's menu is live. Peek before Monday.", time: "Yesterday", type: "system", read: true },
  { id: "nt-4", title: "Offer unlocked", body: "Use STUDENT20 for 20% off your next renewal.", time: "2 days ago", type: "offer", read: true },
];

export const seoEntries: SeoEntry[] = [
  { id: "seo-home", page: "Home", path: "/", title: "Curry Kitchen - Homemade Tiffin Delivery in San Diego", description: "Fresh Indian meals cooked daily and delivered Monday to Friday across San Diego delivery zones.", indexed: true },
  { id: "seo-menu", page: "Weekly menu", path: "/menu", title: "This Week's Tiffin Menu | Curry Kitchen", description: "See the full week of dal, sabzi, rice, roti, salad, and desserts before you order.", indexed: true },
  { id: "seo-packages", page: "Packages", path: "/packages", title: "Tiffin Plans & Pricing | Curry Kitchen", description: "Compare monthly, weekly, and student tiffin plans with clear portions and pricing.", indexed: true },
  { id: "seo-about", page: "Our story", path: "/about", title: "About Curry Kitchen — A Local Home Kitchen", description: "Why Curry Kitchen exists: dependable, home-style Indian dinners for busy weekdays.", indexed: false },
];

export const adminOrders: AdminOrder[] = [
  { id: "CK-1048", customer: "Priya Sharma", plan: "Regular 8 Roti Tiffin", items: 5, total: 368, payment: "Paid", status: "Preparing", date: "Jun 21, 2026", window: "6:00 – 8:00 PM" },
  { id: "CK-1047", customer: "Simran Kaur", plan: "Regular 8 Roti Tiffin", items: 5, total: 350, payment: "Paid", status: "Out for delivery", date: "Jun 21, 2026", window: "6:00 – 8:00 PM" },
  { id: "CK-1046", customer: "Aman Gill", plan: "Student & Military Saver Pack", items: 5, total: 220, payment: "Paid", status: "Delivered", date: "Jun 20, 2026", window: "5:00 – 7:00 PM" },
  { id: "CK-1041", customer: "Neha Patel", plan: "Weekly Trial Pack", items: 6, total: 100, payment: "Refunded", status: "Delivered", date: "Jun 14, 2026", window: "6:00 – 8:00 PM" },
  { id: "CK-1040", customer: "Rohan Mehta", plan: "Extra Large 12 Roti Tiffin", items: 5, total: 450, payment: "Pending", status: "Paused", date: "Jun 13, 2026", window: "6:00 – 8:00 PM" },
];
