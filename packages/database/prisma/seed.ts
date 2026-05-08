import { PrismaClient, UserRole, RestaurantStatus, OrderStatus, PaymentStatus, PaymentMethod, CouponType, VehicleType, CourierStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const HASH = (pw: string) => bcrypt.hashSync(pw, 10);

const CUISINES = {
  PAKISTANI: 'Pakistani',
  INDIAN: 'Indian',
  MIDDLE_EASTERN: 'Middle Eastern',
  FAST_FOOD: 'Fast Food',
  PIZZA: 'Pizza',
  BURGERS: 'Burgers',
  CHINESE: 'Chinese',
  HEALTHY: 'Healthy Bowls',
  DESSERTS: 'Desserts',
  COFFEE: 'Coffee',
};

interface RestaurantSeed {
  name: string;
  cuisines: string[];
  city: string;
  lat: number;
  lon: number;
  prepTime: number;
  rating: number;
  cloud?: boolean;
  halal?: boolean;
  veg?: boolean;
  brands?: string[];
  menu: Array<{
    cat: string;
    items: Array<{
      name: string;
      desc: string;
      price: number;
      tags?: string[];
      allergens?: string[];
      calories?: number;
      spice?: number;
      image?: string;
    }>;
  }>;
}

const RESTAURANTS: RestaurantSeed[] = [
  {
    name: 'Karachi Biryani House',
    cuisines: [CUISINES.PAKISTANI, CUISINES.INDIAN],
    city: 'Karachi',
    lat: 24.8607,
    lon: 67.0011,
    prepTime: 22,
    rating: 4.7,
    halal: true,
    menu: [
      {
        cat: 'Biryani',
        items: [
          { name: 'Chicken Biryani', desc: 'Aromatic basmati rice, tender chicken, raita.', price: 7.5, tags: ['HALAL', 'SPICY'], spice: 3, calories: 720 },
          { name: 'Beef Biryani', desc: 'Slow-cooked beef biryani with saffron.', price: 8.5, tags: ['HALAL'], spice: 3, calories: 820 },
          { name: 'Veg Biryani', desc: 'Fragrant rice with mixed vegetables.', price: 6.5, tags: ['VEGETARIAN', 'HALAL'], spice: 2, calories: 610 },
        ],
      },
      {
        cat: 'Karahi',
        items: [
          { name: 'Chicken Karahi', desc: 'Wok-cooked chicken in tomato gravy.', price: 9.9, tags: ['HALAL'], spice: 4, calories: 680 },
          { name: 'Mutton Karahi', desc: 'Bone-in mutton with spices.', price: 12.0, tags: ['HALAL'], spice: 4, calories: 760 },
        ],
      },
    ],
  },
  {
    name: 'Lahore Tikka Grill',
    cuisines: [CUISINES.PAKISTANI],
    city: 'Lahore',
    lat: 31.5497,
    lon: 74.3436,
    prepTime: 25,
    rating: 4.6,
    halal: true,
    menu: [
      {
        cat: 'Grill',
        items: [
          { name: 'Chicken Tikka', desc: 'Charcoal-grilled chicken tikka.', price: 6.0, tags: ['HALAL'], spice: 3, calories: 410 },
          { name: 'Seekh Kebab', desc: 'Spiced minced beef skewers.', price: 7.0, tags: ['HALAL'], spice: 3, calories: 520 },
          { name: 'Chicken Malai Boti', desc: 'Creamy marinated grilled chicken.', price: 7.5, tags: ['HALAL'], spice: 1, calories: 460 },
        ],
      },
      {
        cat: 'Curries',
        items: [
          { name: 'Butter Chicken', desc: 'Rich tomato cream curry.', price: 9.0, tags: ['HALAL'], spice: 2, calories: 690 },
        ],
      },
    ],
  },
  {
    name: 'Falafel & Co.',
    cuisines: [CUISINES.MIDDLE_EASTERN, CUISINES.HEALTHY],
    city: 'Dubai',
    lat: 25.2048,
    lon: 55.2708,
    prepTime: 15,
    rating: 4.5,
    halal: true,
    veg: true,
    menu: [
      {
        cat: 'Wraps',
        items: [
          { name: 'Falafel Wrap', desc: 'Falafel, hummus, tahini, pickles.', price: 5.5, tags: ['VEGAN', 'HALAL'], allergens: ['SESAME'], calories: 480 },
          { name: 'Shawarma', desc: 'Marinated chicken shawarma wrap.', price: 6.5, tags: ['HALAL'], calories: 560 },
        ],
      },
      {
        cat: 'Bowls',
        items: [
          { name: 'Mezze Platter', desc: 'Hummus, baba ghanoush, falafel, pita.', price: 8.0, tags: ['VEGETARIAN', 'HALAL'], calories: 620 },
        ],
      },
    ],
  },
  {
    name: 'Pizza Republic',
    cuisines: [CUISINES.PIZZA, CUISINES.FAST_FOOD],
    city: 'Karachi',
    lat: 24.8138,
    lon: 67.0299,
    prepTime: 20,
    rating: 4.4,
    menu: [
      {
        cat: 'Pizzas',
        items: [
          { name: 'Margherita Pizza', desc: 'Tomato, mozzarella, basil.', price: 8.0, tags: ['VEGETARIAN'], allergens: ['DAIRY', 'GLUTEN'], calories: 720 },
          { name: 'Pepperoni Pizza', desc: 'Loaded pepperoni and cheese.', price: 10.0, allergens: ['DAIRY', 'GLUTEN'], calories: 840 },
          { name: 'BBQ Chicken Pizza', desc: 'Smoky BBQ chicken with onions.', price: 11.0, tags: ['HALAL'], allergens: ['DAIRY', 'GLUTEN'], calories: 880 },
        ],
      },
    ],
  },
  {
    name: 'Burger Bros',
    cuisines: [CUISINES.BURGERS, CUISINES.FAST_FOOD],
    city: 'Lahore',
    lat: 31.5204,
    lon: 74.3587,
    prepTime: 18,
    rating: 4.3,
    menu: [
      {
        cat: 'Burgers',
        items: [
          { name: 'Beef Burger', desc: 'Smashed beef patty, cheddar, pickles.', price: 6.5, allergens: ['DAIRY', 'GLUTEN'], calories: 740 },
          { name: 'Zinger Burger', desc: 'Crispy spicy chicken fillet.', price: 5.5, tags: ['SPICY', 'HALAL'], allergens: ['GLUTEN'], spice: 3, calories: 690 },
          { name: 'Veggie Crunch', desc: 'Crunchy chickpea-bean patty.', price: 5.0, tags: ['VEGETARIAN'], allergens: ['GLUTEN'], calories: 580 },
        ],
      },
      {
        cat: 'Sides',
        items: [
          { name: 'Loaded Fries', desc: 'Cheese, jalapeño, sauces.', price: 3.5, tags: ['VEGETARIAN'], calories: 460 },
        ],
      },
    ],
  },
  {
    name: 'Dragon Wok',
    cuisines: [CUISINES.CHINESE],
    city: 'Karachi',
    lat: 24.8911,
    lon: 67.0299,
    prepTime: 22,
    rating: 4.2,
    menu: [
      {
        cat: 'Mains',
        items: [
          { name: 'Kung Pao Chicken', desc: 'Spicy Sichuan-style chicken.', price: 8.5, tags: ['SPICY'], allergens: ['PEANUTS', 'SOY'], spice: 4, calories: 640 },
          { name: 'Veg Chow Mein', desc: 'Stir-fried noodles with vegetables.', price: 6.0, tags: ['VEGETARIAN'], allergens: ['SOY', 'GLUTEN'], calories: 540 },
        ],
      },
    ],
  },
  {
    name: 'Green Bowl Kitchen',
    cuisines: [CUISINES.HEALTHY],
    city: 'Dubai',
    lat: 25.2532,
    lon: 55.3657,
    prepTime: 14,
    rating: 4.8,
    cloud: true,
    veg: true,
    brands: ['Green Bowl', 'Protein Lab'],
    menu: [
      {
        cat: 'Bowls',
        items: [
          { name: 'Grilled Chicken Bowl', desc: 'Quinoa, grilled chicken, avocado, greens.', price: 9.5, tags: ['HALAL', 'HIGH_PROTEIN', 'GLUTEN_FREE'], calories: 540 },
          { name: 'Vegan Buddha Bowl', desc: 'Chickpeas, kale, roasted veg, tahini.', price: 8.5, tags: ['VEGAN', 'GLUTEN_FREE'], calories: 480 },
          { name: 'Salmon Power Bowl', desc: 'Salmon, brown rice, edamame.', price: 11.5, tags: ['HIGH_PROTEIN'], allergens: ['FISH', 'SOY'], calories: 620 },
        ],
      },
    ],
  },
  {
    name: 'Sweet Spot Desserts',
    cuisines: [CUISINES.DESSERTS],
    city: 'Karachi',
    lat: 24.8138,
    lon: 67.0299,
    prepTime: 10,
    rating: 4.6,
    menu: [
      {
        cat: 'Desserts',
        items: [
          { name: 'Chocolate Brownie', desc: 'Fudgy brownie with walnuts.', price: 3.5, tags: ['VEGETARIAN'], allergens: ['GLUTEN', 'DAIRY', 'NUTS'], calories: 420 },
          { name: 'Cheesecake Slice', desc: 'New York-style cheesecake.', price: 4.5, tags: ['VEGETARIAN'], allergens: ['DAIRY', 'GLUTEN'], calories: 480 },
        ],
      },
    ],
  },
  {
    name: 'Bean & Brew',
    cuisines: [CUISINES.COFFEE],
    city: 'Lahore',
    lat: 31.5204,
    lon: 74.3587,
    prepTime: 8,
    rating: 4.7,
    menu: [
      {
        cat: 'Coffee',
        items: [
          { name: 'Iced Latte', desc: 'Double espresso over chilled milk.', price: 3.5, tags: ['VEGETARIAN'], allergens: ['DAIRY'], calories: 180 },
          { name: 'Cappuccino', desc: 'Espresso topped with foam.', price: 3.0, tags: ['VEGETARIAN'], allergens: ['DAIRY'], calories: 140 },
          { name: 'Cold Brew', desc: '12-hour slow-brewed coffee.', price: 3.8, calories: 30 },
        ],
      },
    ],
  },
  {
    name: 'Spice Route Indian',
    cuisines: [CUISINES.INDIAN],
    city: 'Dubai',
    lat: 25.0760,
    lon: 55.1392,
    prepTime: 26,
    rating: 4.5,
    halal: true,
    menu: [
      {
        cat: 'Curries',
        items: [
          { name: 'Paneer Tikka Masala', desc: 'Cottage cheese in spiced tomato gravy.', price: 8.5, tags: ['VEGETARIAN', 'HALAL'], allergens: ['DAIRY'], spice: 2, calories: 560 },
          { name: 'Lamb Rogan Josh', desc: 'Slow-cooked Kashmiri lamb curry.', price: 11.5, tags: ['HALAL'], spice: 3, calories: 720 },
        ],
      },
      {
        cat: 'Breads',
        items: [
          { name: 'Garlic Naan', desc: 'Tandoori naan with garlic butter.', price: 1.8, tags: ['VEGETARIAN'], allergens: ['GLUTEN', 'DAIRY'], calories: 280 },
        ],
      },
    ],
  },
];

const CUSTOMER_NAMES = [
  'Aisha Khan', 'Bilal Ahmed', 'Sara Ali', 'Omar Farooq', 'Hina Malik',
  'Zainab Iqbal', 'Hassan Raza', 'Maryam Shah', 'Faisal Tariq', 'Nida Yousaf',
  'Imran Saleem', 'Rabia Hussain', 'Usman Akhtar', 'Sana Javed', 'Adeel Mirza',
  'Fatima Noor', 'Kashif Mehmood', 'Lubna Aziz', 'Junaid Khan', 'Asma Pervez',
];

const COURIER_NAMES = [
  'Ali Raza', 'Bilal Aslam', 'Daniyal Khan', 'Ehsan Ali', 'Farhan Sheikh',
  'Ghazi Hussain', 'Haris Iqbal', 'Imran Akram', 'Jawad Yousuf', 'Kamran Mughal',
];

function slugify(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function pad(n: number, len = 6) {
  return String(n).padStart(len, '0');
}

async function main() {
  console.log('🌱 Seeding database...');

  await prisma.$transaction([
    prisma.orderEvent.deleteMany(),
    prisma.deliveryAssignment.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.review.deleteMany(),
    prisma.orderItem.deleteMany(),
    prisma.order.deleteMany(),
    prisma.cartItem.deleteMany(),
    prisma.cart.deleteMany(),
    prisma.addOn.deleteMany(),
    prisma.addOnGroup.deleteMany(),
    prisma.menuItemVariant.deleteMany(),
    prisma.menuItem.deleteMany(),
    prisma.menuCategory.deleteMany(),
    prisma.restaurantPromotion.deleteMany(),
    prisma.restaurantPayout.deleteMany(),
    prisma.courierLocation.deleteMany(),
    prisma.courierPayout.deleteMany(),
    prisma.courier.deleteMany(),
    prisma.restaurant.deleteMany(),
    prisma.address.deleteMany(),
    prisma.loyaltyTransaction.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.supportMessage.deleteMany(),
    prisma.supportTicket.deleteMany(),
    prisma.notification.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.otpCode.deleteMany(),
    prisma.coupon.deleteMany(),
    prisma.demandForecast.deleteMany(),
    prisma.demandZone.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.platformConfig.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  // ---------- Users ----------
  const adminUser = await prisma.user.create({
    data: {
      name: 'Platform Admin',
      email: 'admin@example.com',
      phone: '+10000000000',
      passwordHash: HASH('Admin@12345'),
      role: UserRole.ADMIN,
      emailVerified: true,
      avatarUrl: 'https://api.dicebear.com/9.x/initials/svg?seed=Admin',
    },
  });

  const customerUsers = await Promise.all(
    CUSTOMER_NAMES.map((name, idx) =>
      prisma.user.create({
        data: {
          name,
          email: idx === 0 ? 'customer@example.com' : `customer${idx + 1}@example.com`,
          phone: `+92300${pad(1000000 + idx, 7)}`,
          passwordHash: HASH('Customer@123'),
          role: UserRole.CUSTOMER,
          emailVerified: true,
          loyaltyPoints: 50 + idx * 10,
          walletBalance: 25,
          avatarUrl: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name)}`,
          preferences: {
            language: 'en',
            dietary: idx % 4 === 0 ? ['VEGETARIAN'] : idx % 5 === 0 ? ['VEGAN'] : [],
            cuisines: idx % 2 === 0 ? ['Pakistani', 'Pizza'] : ['Healthy Bowls', 'Coffee'],
          },
        },
      }),
    ),
  );

  // ---------- Addresses ----------
  for (const u of customerUsers) {
    await prisma.address.create({
      data: {
        userId: u.id,
        label: 'HOME',
        line1: `Apt ${Math.floor(Math.random() * 200) + 1}, Block ${Math.floor(Math.random() * 20) + 1}`,
        city: 'Karachi',
        country: 'PK',
        latitude: 24.8607 + (Math.random() - 0.5) * 0.05,
        longitude: 67.0011 + (Math.random() - 0.5) * 0.05,
        isDefault: true,
        deliveryInstructions: 'Ring the bell twice.',
      },
    });
  }

  // ---------- Merchants & Restaurants ----------
  const merchantOwners = await Promise.all(
    RESTAURANTS.map((r, idx) =>
      prisma.user.create({
        data: {
          name: `${r.name} Owner`,
          email: idx === 0 ? 'merchant@example.com' : `merchant${idx + 1}@example.com`,
          phone: `+92301${pad(2000000 + idx, 7)}`,
          passwordHash: HASH('Merchant@123'),
          role: UserRole.MERCHANT,
          emailVerified: true,
        },
      }),
    ),
  );

  const restaurants = [];
  for (let i = 0; i < RESTAURANTS.length; i++) {
    const r = RESTAURANTS[i];
    const created = await prisma.restaurant.create({
      data: {
        ownerId: merchantOwners[i].id,
        name: r.name,
        slug: slugify(r.name),
        description: `${r.name} – ${r.cuisines.join(', ')} delivered fresh.`,
        cuisineTypes: r.cuisines,
        logoUrl: `https://api.dicebear.com/9.x/icons/svg?seed=${encodeURIComponent(r.name)}`,
        bannerUrl: `https://source.unsplash.com/featured/1200x600/?${encodeURIComponent(r.cuisines[0])}`,
        addressLine: `${r.name} Plaza, ${r.city}`,
        city: r.city,
        latitude: r.lat,
        longitude: r.lon,
        rating: r.rating,
        reviewCount: 50 + i * 7,
        status: RestaurantStatus.APPROVED,
        isCloudKitchen: !!r.cloud,
        isHalalCertified: !!r.halal,
        isVegetarian: !!r.veg,
        sustainabilityScore: 50 + Math.random() * 40,
        averagePrepTime: r.prepTime,
        deliveryRadiusKm: 8,
        commissionRate: 0.18,
        virtualBrands: r.brands ?? [],
        openingHours: {
          mon: [{ from: '09:00', to: '23:00' }],
          tue: [{ from: '09:00', to: '23:00' }],
          wed: [{ from: '09:00', to: '23:00' }],
          thu: [{ from: '09:00', to: '23:00' }],
          fri: [{ from: '09:00', to: '23:30' }],
          sat: [{ from: '10:00', to: '23:30' }],
          sun: [{ from: '10:00', to: '22:30' }],
        },
      },
    });

    for (let c = 0; c < r.menu.length; c++) {
      const cat = r.menu[c];
      const category = await prisma.menuCategory.create({
        data: { restaurantId: created.id, name: cat.cat, sortOrder: c },
      });
      for (const item of cat.items) {
        await prisma.menuItem.create({
          data: {
            restaurantId: created.id,
            categoryId: category.id,
            name: item.name,
            description: item.desc,
            imageUrl: `https://source.unsplash.com/featured/600x400/?${encodeURIComponent(item.name)}`,
            price: item.price,
            isAvailable: true,
            prepTime: r.prepTime,
            calories: item.calories ?? null,
            spiceLevel: item.spice ?? 0,
            allergens: item.allergens ?? [],
            dietaryTags: item.tags ?? [],
            aiTags: [],
            sustainabilityTags: i % 2 === 0 ? ['ECO_PACKAGING'] : [],
          },
        });
      }
    }

    restaurants.push(created);
  }

  // ---------- Couriers ----------
  const courierUsers = await Promise.all(
    COURIER_NAMES.map((name, idx) =>
      prisma.user.create({
        data: {
          name,
          email: idx === 0 ? 'courier@example.com' : `courier${idx + 1}@example.com`,
          phone: `+92302${pad(3000000 + idx, 7)}`,
          passwordHash: HASH('Courier@123'),
          role: UserRole.COURIER,
          emailVerified: true,
        },
      }),
    ),
  );

  const couriers = await Promise.all(
    courierUsers.map((u, idx) =>
      prisma.courier.create({
        data: {
          userId: u.id,
          vehicleType: idx % 3 === 0 ? VehicleType.BICYCLE : idx % 3 === 1 ? VehicleType.MOTORCYCLE : VehicleType.SCOOTER,
          status: idx < 5 ? CourierStatus.ONLINE : CourierStatus.OFFLINE,
          isApproved: true,
          rating: 4.4 + Math.random() * 0.6,
          totalDeliveries: 50 + Math.floor(Math.random() * 200),
          currentLat: 24.8607 + (Math.random() - 0.5) * 0.05,
          currentLon: 67.0011 + (Math.random() - 0.5) * 0.05,
          fairnessScore: Math.random(),
          lastPingAt: new Date(),
        },
      }),
    ),
  );

  // ---------- Coupons ----------
  await prisma.coupon.createMany({
    data: [
      { code: 'WELCOME10', description: '10% off first order', type: CouponType.PERCENT, value: 10, minOrderAmount: 5, maxDiscount: 5, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 86400000 * 90), usageLimit: 1000 },
      { code: 'FREESHIP', description: 'Free delivery', type: CouponType.FREE_DELIVERY, value: 0, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 86400000 * 30), usageLimit: 5000 },
      { code: 'SAVE5', description: '$5 off orders over $25', type: CouponType.FIXED, value: 5, minOrderAmount: 25, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 86400000 * 60) },
      { code: 'WEEKEND15', description: '15% off weekend orders', type: CouponType.PERCENT, value: 15, minOrderAmount: 10, maxDiscount: 8, startsAt: new Date(Date.now() - 86400000), endsAt: new Date(Date.now() + 86400000 * 14) },
      { code: 'PLUS20', description: '20% for Plus members', type: CouponType.PERCENT, value: 20, minOrderAmount: 12, maxDiscount: 10, startsAt: new Date(), endsAt: new Date(Date.now() + 86400000 * 30) },
    ],
  });

  // ---------- Demand zones ----------
  const zones = await Promise.all([
    prisma.demandZone.create({ data: { name: 'Clifton', city: 'Karachi', polygon: { type: 'Polygon', coordinates: [] }, centroidLat: 24.8138, centroidLon: 67.0299 } }),
    prisma.demandZone.create({ data: { name: 'Defence', city: 'Karachi', polygon: { type: 'Polygon', coordinates: [] }, centroidLat: 24.8019, centroidLon: 67.0309 } }),
    prisma.demandZone.create({ data: { name: 'Gulshan', city: 'Karachi', polygon: { type: 'Polygon', coordinates: [] }, centroidLat: 24.9135, centroidLon: 67.0925 } }),
    prisma.demandZone.create({ data: { name: 'DHA Lahore', city: 'Lahore', polygon: { type: 'Polygon', coordinates: [] }, centroidLat: 31.4789, centroidLon: 74.4040 } }),
    prisma.demandZone.create({ data: { name: 'Marina', city: 'Dubai', polygon: { type: 'Polygon', coordinates: [] }, centroidLat: 25.0772, centroidLon: 55.1392 } }),
  ]);

  for (const z of zones) {
    const now = new Date();
    for (let h = 0; h < 24; h++) {
      const forecastHour = new Date(now);
      forecastHour.setHours(h, 0, 0, 0);
      const base = h >= 11 && h <= 14 ? 80 : h >= 18 && h <= 22 ? 110 : 25;
      await prisma.demandForecast.create({
        data: {
          zoneId: z.id,
          forecastHour,
          predictedOrders: base + Math.floor(Math.random() * 30),
          confidence: 0.6 + Math.random() * 0.3,
          modelVersion: 'baseline-v1',
        },
      });
    }
  }

  // ---------- Historical orders ----------
  const allMenuItems = await prisma.menuItem.findMany();
  const customerAddresses = await prisma.address.findMany();
  let orderCounter = 1;

  for (let i = 0; i < 50; i++) {
    const customer = customerUsers[i % customerUsers.length];
    const address = customerAddresses.find((a) => a.userId === customer.id)!;
    const restaurant = restaurants[i % restaurants.length];
    const restaurantItems = allMenuItems.filter((m) => m.restaurantId === restaurant.id);
    if (!restaurantItems.length) continue;

    const itemsForOrder = restaurantItems
      .slice()
      .sort(() => Math.random() - 0.5)
      .slice(0, 1 + Math.floor(Math.random() * 3));

    const quantities = itemsForOrder.map(() => 1 + Math.floor(Math.random() * 2));
    const subtotal = itemsForOrder.reduce((s, it, idx) => s + Number(it.price) * quantities[idx], 0);
    const deliveryFee = 1.99;
    const serviceFee = +(subtotal * 0.05).toFixed(2);
    const tax = +(subtotal * 0.08).toFixed(2);
    const total = +(subtotal + deliveryFee + serviceFee + tax).toFixed(2);

    const status = i < 40 ? OrderStatus.DELIVERED : i < 45 ? OrderStatus.CANCELLED : OrderStatus.PREPARING;
    const courier = couriers[i % couriers.length];
    const createdAt = new Date(Date.now() - i * 3600 * 1000 * 6);

    const order = await prisma.order.create({
      data: {
        orderNumber: `FD-${pad(orderCounter++, 6)}`,
        customerId: customer.id,
        restaurantId: restaurant.id,
        courierId: status !== OrderStatus.CANCELLED ? courier.id : null,
        addressId: address.id,
        status,
        subtotal,
        deliveryFee,
        serviceFee,
        tax,
        tip: status === OrderStatus.DELIVERED ? 1 : 0,
        total,
        paymentStatus: status === OrderStatus.CANCELLED ? PaymentStatus.REFUNDED : PaymentStatus.PAID,
        paymentMethod: i % 3 === 0 ? PaymentMethod.CASH : PaymentMethod.CARD,
        estimatedDeliveryAt: new Date(createdAt.getTime() + 35 * 60_000),
        deliveredAt: status === OrderStatus.DELIVERED ? new Date(createdAt.getTime() + 38 * 60_000) : null,
        cancelledAt: status === OrderStatus.CANCELLED ? new Date(createdAt.getTime() + 5 * 60_000) : null,
        ecoFriendly: i % 4 === 0,
        createdAt,
        items: {
          create: itemsForOrder.map((it, idx) => ({
            menuItemId: it.id,
            nameSnapshot: it.name,
            priceSnapshot: it.price,
            quantity: quantities[idx],
          })),
        },
        events: {
          create: [
            { status: OrderStatus.PLACED, createdAt },
            ...(status !== OrderStatus.CANCELLED
              ? [
                  { status: OrderStatus.ACCEPTED, createdAt: new Date(createdAt.getTime() + 60_000) },
                  { status: OrderStatus.PREPARING, createdAt: new Date(createdAt.getTime() + 5 * 60_000) },
                ]
              : [{ status: OrderStatus.CANCELLED, createdAt: new Date(createdAt.getTime() + 5 * 60_000) }]),
            ...(status === OrderStatus.DELIVERED
              ? [
                  { status: OrderStatus.PICKED_UP, createdAt: new Date(createdAt.getTime() + 25 * 60_000) },
                  { status: OrderStatus.DELIVERED, createdAt: new Date(createdAt.getTime() + 38 * 60_000) },
                ]
              : []),
          ],
        },
      },
    });

    if (status === OrderStatus.DELIVERED && Math.random() > 0.3) {
      await prisma.review.create({
        data: {
          orderId: order.id,
          customerId: customer.id,
          restaurantId: restaurant.id,
          courierId: courier.id,
          foodRating: 4 + Math.round(Math.random()),
          deliveryRating: 4 + Math.round(Math.random()),
          comment: i % 2 === 0
            ? 'Food was hot and arrived earlier than expected. Loved the packaging!'
            : 'Tasty meal, but the delivery took a bit long during rush hour.',
          aiSentiment: i % 5 === 0 ? 'NEGATIVE' : 'POSITIVE',
        },
      });
    }
  }

  // ---------- Platform config ----------
  await prisma.platformConfig.createMany({
    data: [
      { key: 'BASE_DELIVERY_FEE', value: 1.99 },
      { key: 'PER_KM_FEE', value: 0.5 },
      { key: 'SERVICE_FEE_PCT', value: 0.05 },
      { key: 'TAX_PCT', value: 0.08 },
      { key: 'SURGE_MULTIPLIER_MAX', value: 1.5 },
      { key: 'SUSTAINABILITY_BADGE_THRESHOLD', value: 70 },
    ],
  });

  console.log('✅ Seed complete.');
  console.log('Demo accounts (all passwords below):');
  console.log('  Admin:     admin@example.com / Admin@12345');
  console.log('  Customer:  customer@example.com / Customer@123');
  console.log('  Merchant:  merchant@example.com / Merchant@123');
  console.log('  Courier:   courier@example.com / Courier@123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
