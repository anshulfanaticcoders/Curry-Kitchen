import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient, RecordStatus, PackageCadence, UserRole, CustomerPackageStatus, OrderStatus, PaymentStatus, PaymentMethod, StudentVerificationStatus, NotificationType, CouponType } from "@prisma/client";
import bcrypt from "bcryptjs";

const databaseUrl =
  process.env.DATABASE_URL ?? "mysql://root:@127.0.0.1:3306/currykitchen_next";

function numberFromEnv(name, fallback) {
  const value = Number(process.env[name]);

  return Number.isFinite(value) && value > 0 ? value : fallback;
}

function mariaDbConfigFromUrl(url) {
  const parsed = new URL(url);
  const host = parsed.hostname === "localhost" ? "127.0.0.1" : parsed.hostname;

  return {
    host,
    port: parsed.port ? Number(parsed.port) : 3306,
    user: decodeURIComponent(parsed.username),
    password: decodeURIComponent(parsed.password),
    database: parsed.pathname.replace(/^\//, ""),
    connectionLimit: numberFromEnv("DB_CONNECTION_LIMIT", 1),
    connectTimeout: numberFromEnv("DB_CONNECT_TIMEOUT_MS", 1_500),
    acquireTimeout: numberFromEnv("DB_ACQUIRE_TIMEOUT_MS", 1_500),
    idleTimeout: numberFromEnv("DB_IDLE_TIMEOUT_SECONDS", 60),
  };
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(mariaDbConfigFromUrl(databaseUrl)),
});

const image = (id, width = 1200) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${width}&q=80`;

async function reset() {
  await prisma.auditLog.deleteMany();
  await prisma.setting.deleteMany();
  await prisma.review.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.studentVerification.deleteMany();
  await prisma.pauseRequest.deleteMany();
  await prisma.packageDeliveryDay.deleteMany();
  await prisma.customerPackage.deleteMany();
  await prisma.stripeEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderAddon.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItemAddon.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.cart.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.deliveryZone.deleteMany();
  await prisma.weeklyMenuDay.deleteMany();
  await prisma.weeklyMenu.deleteMany();
  await prisma.menuItem.deleteMany();
  await prisma.packageAddon.deleteMany();
  await prisma.addon.deleteMany();
  await prisma.packageItem.deleteMany();
  await prisma.package.deleteMany();
  await prisma.packageCategory.deleteMany();
  await prisma.address.deleteMany();
  await prisma.adminProfile.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.session.deleteMany();
  await prisma.account.deleteMany();
  await prisma.user.deleteMany();
}

async function main() {
  await reset();

  const passwordHash = await bcrypt.hash("Password123!", 12);

  const adminUser = await prisma.user.create({
    data: {
      name: "Priya Owner",
      email: "admin@currykitchen.test",
      passwordHash,
      role: UserRole.ADMIN,
      adminProfile: { create: { title: "Owner" } },
    },
  });

  const customerUser = await prisma.user.create({
    data: {
      name: "Maya Patel",
      email: "customer@currykitchen.test",
      passwordHash,
      role: UserRole.CUSTOMER,
    },
  });

  const studentUser = await prisma.user.create({
    data: {
      name: "Arjun Singh",
      email: "student@currykitchen.test",
      passwordHash,
      role: UserRole.CUSTOMER,
    },
  });

  const categories = await Promise.all([
    prisma.packageCategory.create({ data: { name: "Monthly", slug: "monthly", description: "Full-month tiffin plans.", sortOrder: 1 } }),
    prisma.packageCategory.create({ data: { name: "Weekly", slug: "weekly", description: "Trial weekly packages.", sortOrder: 2 } }),
    prisma.packageCategory.create({ data: { name: "Student", slug: "student", description: "Student and military-priced plans pending verification.", sortOrder: 3 } }),
  ]);
  const [monthly, weekly, student] = categories;

  const addons = await Promise.all([
    prisma.addon.create({ data: { name: "Rice bowl", slug: "rice-bowl", description: "Add steamed basmati rice.", price: "3.50" } }),
    prisma.addon.create({ data: { name: "Extra roti", slug: "extra-roti", description: "Two soft rotis.", price: "2.50" } }),
    prisma.addon.create({ data: { name: "Extra sabzi", slug: "extra-sabzi", description: "8oz seasonal sabzi.", price: "5.00" } }),
    prisma.addon.create({ data: { name: "Dessert cup", slug: "dessert-cup", description: "Weekly sweet add-on.", price: "4.00" } }),
  ]);

  async function createPackage({ category, name, slug, price, cadence, days, studentOnly = false, badge, imageUrl, items }) {
    return prisma.package.create({
      data: {
        categoryId: category.id,
        name,
        slug,
        badge,
        description: `${name} with homestyle dal, sabzi, roti, rice options, salad, and rotating weekly comfort dishes.`,
        price,
        taxRate: "0.0875",
        cadence,
        deliveryDayCount: days,
        servings: items.join(", "),
        imageUrl,
        bestFor: studentOnly ? "Students / Military" : cadence === PackageCadence.WEEKLY ? "Trial week" : "Daily dinner",
        studentOnly,
        status: RecordStatus.ACTIVE,
        items: {
          create: items.map((item, index) => ({ name: item, sortOrder: index + 1 })),
        },
        addons: {
          create: addons.map((addon) => ({ addonId: addon.id })),
        },
      },
    });
  }

  const regular = await createPackage({
    category: monthly,
    name: "Regular 8 Roti Tiffin",
    slug: "regular-8-roti-tiffin",
    price: "350.00",
    cadence: PackageCadence.MONTHLY,
    days: 20,
    badge: "Most loved",
    imageUrl: image("1626777552726-4a6b54c97e46"),
    items: ["12oz dal", "8oz sabzi", "8 roti", "salad", "weekly dessert"],
  });

  await createPackage({
    category: monthly,
    name: "Small 4 Roti Tiffin",
    slug: "small-4-roti-tiffin",
    price: "250.00",
    cadence: PackageCadence.MONTHLY,
    days: 20,
    badge: "Starter favorite",
    imageUrl: image("1630409346824-4f0e7b080087"),
    items: ["8oz dal", "6oz sabzi", "4 roti", "salad"],
  });

  const trial = await createPackage({
    category: weekly,
    name: "Weekly Trial Pack",
    slug: "weekly-trial-pack",
    price: "95.00",
    cadence: PackageCadence.WEEKLY,
    days: 5,
    badge: "Try first",
    imageUrl: image("1604909052743-94e838986d24"),
    items: ["5 meals", "rotating menu", "delivery included"],
  });

  const studentPack = await createPackage({
    category: student,
    name: "Student & Military Saver Pack",
    slug: "student-saver-pack",
    price: "220.00",
    cadence: PackageCadence.STUDENT,
    days: 20,
    badge: "Student / military pricing",
    imageUrl: image("1617692855027-33b14f061079"),
    items: ["simple veg meals", "4 roti", "dal", "sabzi"],
    studentOnly: true,
  });

  await prisma.deliveryZone.createMany({
    data: [
      { name: "Downtown San Diego Free Zone", cities: ["San Diego"], postalCodes: ["92101", "92103", "92104", "92105", "92108"], fee: "0.00", isFreeDelivery: true },
      { name: "Chula Vista Zone", cities: ["Chula Vista"], postalCodes: ["91910", "91911"], fee: "5.00" },
      { name: "La Jolla Zone", cities: ["La Jolla"], postalCodes: ["92037", "92093"], fee: "6.00" },
      { name: "Outside Service Zone", cities: [], postalCodes: [], fee: "12.00", outsideZone: true },
    ],
  });

  const customer = await prisma.customer.create({
    data: {
      userId: customerUser.id,
      name: "Maya Patel",
      email: "customer@currykitchen.test",
      phone: "(858) 555-0148",
      addresses: {
        create: {
          name: "Home",
          line1: "750 B St",
          city: "San Diego",
          postalCode: "92101",
          isDefault: true,
        },
      },
    },
    include: { addresses: true },
  });

  const studentCustomer = await prisma.customer.create({
    data: {
      userId: studentUser.id,
      name: "Arjun Singh",
      email: "student@currykitchen.test",
      phone: "(619) 555-0192",
      addresses: {
        create: {
          name: "Apartment",
          line1: "9500 Gilman Dr",
          city: "La Jolla",
          postalCode: "92093",
          isDefault: true,
        },
      },
    },
    include: { addresses: true },
  });

  const order = await prisma.order.create({
    data: {
      orderNumber: "CK-1001",
      customerId: customer.id,
      addressId: customer.addresses[0].id,
      status: OrderStatus.PAID,
      subtotal: "353.50",
      deliveryFee: "0.00",
      taxAmount: "30.93",
      total: "384.43",
      foodPreferences: "Medium spice, no raw onions.",
      items: {
        create: [{
          packageId: regular.id,
          quantity: 1,
          startDate: new Date("2026-06-01T18:00:00-07:00"),
          unitPrice: "350.00",
          total: "350.00",
        }],
      },
      payments: {
        create: {
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.PAID,
          amount: "384.43",
          currency: "USD",
          stripeSessionId: "cs_test_seed_regular",
        },
      },
    },
    include: { items: true },
  });

  await prisma.orderAddon.create({
    data: {
      orderId: order.id,
      orderItemId: order.items[0].id,
      addonId: addons[0].id,
      quantity: 1,
      unitPrice: "3.50",
      total: "3.50",
    },
  });

  const activePackage = await prisma.customerPackage.create({
    data: {
      customerId: customer.id,
      orderId: order.id,
      orderItemId: order.items[0].id,
      packageId: regular.id,
      quantity: 1,
      status: CustomerPackageStatus.ACTIVE,
      totalDeliveryDays: regular.deliveryDayCount,
      usedDeliveryDays: 6,
      startDate: new Date("2026-06-01T00:00:00-07:00"),
      endDate: new Date("2026-06-28T00:00:00-07:00"),
    },
  });

  await prisma.packageDeliveryDay.createMany({
    data: Array.from({ length: 5 }).map((_, index) => ({
      customerPackageId: activePackage.id,
      deliveryDate: new Date(`2026-06-${24 + index}T18:00:00-07:00`),
      status: index === 0 ? OrderStatus.PREPARING : OrderStatus.PAID,
      menuSummary: ["Dal makhani, aloo gobi", "Yellow dal, matar paneer", "Moong dal, bhindi", "Rajma masala, pulao", "Kadhi pakora, mixed veg"][index],
    })),
  });

  const studentOrder = await prisma.order.create({
    data: {
      orderNumber: "CK-1002",
      customerId: studentCustomer.id,
      addressId: studentCustomer.addresses[0].id,
      status: OrderStatus.PAID,
      subtotal: "222.50",
      deliveryFee: "6.00",
      taxAmount: "19.47",
      total: "247.97",
      foodPreferences: "Mild spice.",
      items: {
        create: [{
          packageId: studentPack.id,
          quantity: 1,
          startDate: new Date("2026-07-27T18:00:00-07:00"),
          unitPrice: "220.00",
          total: "220.00",
        }],
      },
      payments: {
        create: {
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.PAID,
          amount: "247.97",
          currency: "USD",
          stripeSessionId: "cs_test_seed_student",
        },
      },
    },
    include: { items: true },
  });

  await prisma.orderAddon.create({
    data: {
      orderId: studentOrder.id,
      orderItemId: studentOrder.items[0].id,
      addonId: addons[1].id,
      quantity: 1,
      unitPrice: "2.50",
      total: "2.50",
    },
  });

  await prisma.customerPackage.create({
    data: {
      customerId: studentCustomer.id,
      orderId: studentOrder.id,
      orderItemId: studentOrder.items[0].id,
      packageId: studentPack.id,
      quantity: 1,
      status: CustomerPackageStatus.PENDING_STUDENT_VERIFICATION,
      totalDeliveryDays: studentPack.deliveryDayCount,
      startDate: new Date("2026-07-27T18:00:00-07:00"),
    },
  });

  await prisma.studentVerification.create({
    data: {
      customerId: studentCustomer.id,
      orderId: studentOrder.id,
      universityName: "UC San Diego",
      studentNumber: "UCSD-2026-1048",
      idCardUrl: "/uploads/student-id-placeholder.jpg",
      status: StudentVerificationStatus.PENDING,
    },
  });

  await prisma.weeklyMenu.create({
    data: {
      title: "San Diego Tiffin Week",
      weekStart: new Date("2026-06-22T00:00:00-07:00"),
      days: {
        create: [
          ["Monday", "Creamy comfort start", "Dal makhani", "Aloo gobi", "Jeera rice", "Kachumber salad", "Gulab jamun", "Medium", "1585937421612-70a008356fbe"],
          ["Tuesday", "Bright Punjabi plate", "Yellow tadka dal", "Matar paneer", "Steamed basmati", "Boondi raita", null, "Homestyle", "1631452180539-96aca7d48617"],
          ["Wednesday", "Light midweek thali", "Moong dal", "Bhindi masala", "Lemon rice", "Pickled onion", null, "Mild", "1604329760661-e71dc83f8f26"],
          ["Thursday", "North Indian classic", "Chana dal", "Rajma masala", "Basmati pulao", "Cucumber salad", null, "Medium", "1631292784640-2b24be784d5d"],
          ["Friday", "Weekend warm-up", "Kadhi pakora", "Mixed veg curry", "Peas pulao", "Mint chutney", "Kheer", "Homestyle", "1596797038530-2c107229654b"],
        ].map((day, index) => ({
          dayOfWeek: index + 1,
          date: new Date(`2026-06-${22 + index}T00:00:00-07:00`),
          headline: day[1],
          daal: day[2],
          sabzi: day[3],
          rice: day[4],
          side: day[5],
          dessert: day[6],
          spice: day[7],
          imageUrl: image(day[8], 900),
        })),
      },
    },
  });

  await prisma.menuItem.createMany({
    data: [
      ["Dal makhani", "Daal", "Medium"],
      ["Yellow tadka dal", "Daal", "Homestyle"],
      ["Aloo gobi", "Sabzi", "Medium"],
      ["Matar paneer", "Sabzi", "Homestyle"],
      ["Jeera rice", "Rice", "Mild"],
      ["Soft roti", "Roti", "Mild"],
      ["Gulab jamun", "Dessert", "Mild"],
    ].map(([name, type, spice]) => ({ name, type, spice })),
  });

  await prisma.review.createMany({
    data: [
      { name: "Maya Patel", planName: regular.name, rating: 5, text: "Dinner finally feels planned without feeling like takeout.", status: RecordStatus.ACTIVE },
      { name: "Arjun Singh", planName: studentPack.name, rating: 5, text: "Affordable, filling, and perfect after class.", status: RecordStatus.ACTIVE },
      { name: "Neha Shah", planName: trial.name, rating: 4, text: "The trial pack made it easy to choose a monthly plan.", status: RecordStatus.DRAFT },
      { name: "Unknown", planName: null, rating: 1, text: "Buy cheap meds online now www.spam-link.example", status: RecordStatus.ARCHIVED },
    ],
  });

  await prisma.coupon.createMany({
    data: [
      { code: "WELCOME15", type: CouponType.PERCENT, value: "15.00", status: RecordStatus.ACTIVE, usageLimit: 500 },
      { code: "STUDENT20", type: CouponType.PERCENT, value: "20.00", status: RecordStatus.ACTIVE, usageLimit: 200 },
    ],
  });

  await prisma.notification.createMany({
    data: [
      { userId: customerUser.id, title: "Out for delivery", body: "Your tiffin is being prepared for tonight.", type: NotificationType.ORDER },
      { userId: studentUser.id, title: "Student verification pending", body: "We received your student details. Admin review is pending.", type: NotificationType.VERIFICATION },
      { userId: adminUser.id, title: "Student verification waiting", body: "Arjun Singh submitted a student package verification.", type: NotificationType.SYSTEM },
    ],
  });

  await prisma.setting.createMany({
    data: [
      { key: "business", value: { name: "Curry Kitchen Inc.", currency: "USD", state: "CA", supportEmail: "currykitcheninc@gmail.com" } },
      { key: "delivery", value: { defaultWindow: "6:00 PM - 8:00 PM", outsideZoneFee: 12, deliveryDays: ["Mon", "Tue", "Wed", "Thu", "Fri"] } },
      { key: "pausePolicy", value: { customerSelfPauseLimit: 1, adminUnlimited: true } },
    ],
  });

  console.log("Seed complete");
  console.log("Admin: admin@currykitchen.test / Password123!");
  console.log("Customer: customer@currykitchen.test / Password123!");
  console.log("Student: student@currykitchen.test / Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
