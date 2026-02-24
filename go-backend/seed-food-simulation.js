#!/usr/bin/env node

/**
 * Food simulation seed for go-backend.
 * Creates test sellers/buyers and food products around:
 * - Summarecon Mall Bekasi
 * - BINUS Bekasi
 * - Harapan Indah Bekasi
 */

const fs = require('fs');
const path = require('path');

const DEFAULT_PASSWORD = 'test123';
const DEFAULT_DB_NAME = 'msme_marketplace';
const FALLBACK_UNSPLASH_FOOD_IMAGE =
  'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=640&h=480&fit=crop&auto=format&fm=jpg&q=80';

const SELLERS = [
  {
    name: 'Rani Pratama',
    email: 'seller.summarecon@trolitoko.test',
    phone: '081200000101',
    businessName: 'Dapur Summarecon',
    businessType: 'small',
    rating: 4.8,
    totalReviews: 134,
    isMember: true,
    membershipStatus: 'active',
    memberSince: new Date(),
    memberExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year free
    location: {
      type: 'Point',
      coordinates: [107.0029, -6.2247],
      address: 'Ruko Emerald Commercial, Summarecon Bekasi',
      city: 'Bekasi',
      state: 'Jawa Barat',
      pincode: '17142',
    },
    products: [
      {
        name: 'Nasi Bakar Ayam Kemangi',
        description: 'Nasi bakar dengan ayam suwir, kemangi segar, dan sambal khas.',
        price: 28000,
        stock: 60,
        unit: 'porsi',
        tags: ['nasi-bakar', 'ayam', 'pedas'],
        image: 'https://source.unsplash.com/640x480/?nasi-bakar,ayam,indonesian-food',
      },
      {
        name: 'Soto Betawi Kuah Susu',
        description: 'Soto Betawi gurih dengan daging sapi empuk dan kentang goreng.',
        price: 35000,
        stock: 45,
        unit: 'mangkuk',
        tags: ['soto', 'betawi', 'kuah-gurih'],
        image: 'https://source.unsplash.com/640x480/?soto,indonesian-soup,beef',
      },
      {
        name: 'Es Kopi Gula Aren',
        description: 'Kopi susu gula aren dengan espresso blend lokal.',
        price: 19000,
        stock: 120,
        unit: 'cup',
        tags: ['kopi', 'minuman', 'gula-aren'],
        image: 'https://source.unsplash.com/640x480/?iced-coffee,coffee,milk',
      },
      {
        name: 'Pisang Goreng Cokelat Keju',
        description: 'Pisang goreng crispy dengan topping cokelat dan keju parut.',
        price: 22000,
        stock: 70,
        unit: 'box',
        tags: ['cemilan', 'pisang-goreng', 'manis'],
        image: 'https://source.unsplash.com/640x480/?fried-banana,dessert,snack',
      },
    ],
  },
  {
    name: 'Farhan Alif',
    email: 'seller.binusbekasi@trolitoko.test',
    phone: '081200000102',
    businessName: 'BINUS Student Kitchen',
    businessType: 'micro',
    rating: 4.6,
    totalReviews: 89,
    isMember: true,
    membershipStatus: 'active',
    memberSince: new Date(),
    memberExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    location: {
      type: 'Point',
      coordinates: [107.0008, -6.2232],
      address: 'Jl. Bulevar Ahmad Yani, area BINUS Bekasi',
      city: 'Bekasi',
      state: 'Jawa Barat',
      pincode: '17143',
    },
    products: [
      {
        name: 'Rice Bowl Ayam Sambal Matah',
        description: 'Rice bowl ayam grilled dengan sambal matah segar.',
        price: 30000,
        stock: 80,
        unit: 'porsi',
        tags: ['rice-bowl', 'ayam', 'matah'],
        image: 'https://source.unsplash.com/640x480/?chicken-rice-bowl,indonesian-food',
      },
      {
        name: 'Mie Chili Oil Beef',
        description: 'Mie kenyal dengan chili oil homemade dan irisan beef.',
        price: 32000,
        stock: 55,
        unit: 'mangkuk',
        tags: ['mie', 'chili-oil', 'beef'],
        image: 'https://source.unsplash.com/640x480/?beef-noodles,chili-noodles,noodle-bowl',
      },
      {
        name: 'Croissant Tuna Mayo',
        description: 'Croissant buttery isi tuna mayo, cocok untuk sarapan cepat.',
        price: 25000,
        stock: 40,
        unit: 'pcs',
        tags: ['pastry', 'croissant', 'tuna'],
        image: 'https://source.unsplash.com/640x480/?croissant,tuna-sandwich,pastry',
      },
      {
        name: 'Matcha Latte',
        description: 'Matcha latte creamy dengan pilihan less sugar.',
        price: 21000,
        stock: 90,
        unit: 'cup',
        tags: ['matcha', 'minuman', 'latte'],
        image: 'https://source.unsplash.com/640x480/?matcha-latte,green-tea,drink',
      },
      {
        name: 'Mie Chili Oil Beef',
        description: 'Mie kenyal dengan chili oil homemade dan irisan beef.',
        price: 32000,
        stock: 55,
        unit: 'mangkuk',
        tags: ['mie', 'chili-oil', 'beef'],
        image: 'https://source.unsplash.com/640x480/?beef-noodles,chili-noodles,noodle-bowl',
      },
      {
        name: 'Croissant Tuna Mayo',
        description: 'Croissant buttery isi tuna mayo, cocok untuk sarapan cepat.',
        price: 25000,
        stock: 40,
        unit: 'pcs',
        tags: ['pastry', 'croissant', 'tuna'],
        image: 'https://source.unsplash.com/640x480/?croissant,tuna-sandwich,pastry',
      },
      {
        name: 'Matcha Latte',
        description: 'Matcha latte creamy dengan pilihan less sugar.',
        price: 21000,
        stock: 90,
        unit: 'cup',
        tags: ['matcha', 'minuman', 'latte'],
        image: 'https://source.unsplash.com/640x480/?matcha-latte,green-tea,drink',
      },
    ],
  },
  {
    name: 'Siska Lestari',
    email: 'seller.harapanindah@trolitoko.test',
    phone: '081200000103',
    businessName: 'Warung Harapan Indah',
    businessType: 'small',
    rating: 4.7,
    totalReviews: 112,
    isMember: true,
    membershipStatus: 'active',
    memberSince: new Date(),
    memberExpiry: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    location: {
      type: 'Point',
      coordinates: [106.9586, -6.1785],
      address: 'Sentra Kuliner Harapan Indah, Medan Satria',
      city: 'Bekasi',
      state: 'Jawa Barat',
      pincode: '17131',
    },
    products: [
      {
        name: 'Nasi Uduk Komplit',
        description: 'Nasi uduk dengan ayam goreng, bihun, telur balado, dan sambal.',
        price: 26000,
        stock: 100,
        unit: 'porsi',
        tags: ['nasi-uduk', 'sarapan', 'tradisional'],
        image: 'https://source.unsplash.com/640x480/?nasi-uduk,indonesian-rice,traditional-food',
      },
      {
        name: 'Gado-Gado Betawi',
        description: 'Sayuran segar, tahu, tempe, lontong, dengan bumbu kacang.',
        price: 24000,
        stock: 65,
        unit: 'porsi',
        tags: ['gado-gado', 'sayur', 'kacang'],
        image: 'https://source.unsplash.com/640x480/?gado-gado,salad,peanut-sauce',
      },
      {
        name: 'Bakso Urat Kuah Kaldu',
        description: 'Bakso urat sapi dengan kuah kaldu bening dan mie.',
        price: 27000,
        stock: 75,
        unit: 'mangkuk',
        tags: ['bakso', 'sapi', 'hangat'],
        image: 'https://source.unsplash.com/640x480/?bakso,meatball-soup,noodle-soup',
      },
      {
        name: 'Es Teh Lemon Madu',
        description: 'Teh lemon segar dengan madu asli.',
        price: 12000,
        stock: 150,
        unit: 'cup',
        tags: ['teh', 'lemon', 'minuman'],
        image: 'https://source.unsplash.com/640x480/?lemon-tea,iced-tea,honey-drink',
      },
    ],
  },
];

const BUYERS = [
  {
    name: 'Budi Test Nearby',
    email: 'buyer.nearby1@trolitoko.test',
    phone: '081200000201',
    location: {
      type: 'Point',
      coordinates: [107.0017, -6.2258],
      address: 'Apartemen dekat Summarecon Mall Bekasi',
      city: 'Bekasi',
      state: 'Jawa Barat',
      pincode: '17142',
    },
  },
  {
    name: 'Nadia Test Nearby',
    email: 'buyer.nearby2@trolitoko.test',
    phone: '081200000202',
    location: {
      type: 'Point',
      coordinates: [106.9601, -6.1792],
      address: 'Perumahan Harapan Indah',
      city: 'Bekasi',
      state: 'Jawa Barat',
      pincode: '17131',
    },
  },
];

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const sep = trimmed.indexOf('=');
    if (sep < 1) {
      continue;
    }

    const key = trimmed.slice(0, sep).trim();
    let value = trimmed.slice(sep + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function loadEnv() {
  const candidates = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '.env'),
    path.join(__dirname, '../.env'),
  ];
  for (const envPath of candidates) {
    loadEnvFile(envPath);
  }
}

function requireDependency(packageName) {
  const candidates = [
    packageName,
    path.join(__dirname, 'node_modules', packageName),
    path.join(__dirname, '..', 'node_modules', packageName),
  ];

  for (const candidate of candidates) {
    try {
      return require(candidate);
    } catch {
      // try next
    }
  }

  throw new Error(
    `Cannot find dependency "${packageName}". Run "cd go-backend && npm install" first.`
  );
}

function buildUserDoc(user, hashedPassword, isSeller) {
  const now = new Date();
  return {
    name: user.name,
    email: user.email,
    password: hashedPassword,
    phone: user.phone,
    isSeller,
    automationEnabled: false,
    businessName: isSeller ? user.businessName : null,
    businessType: isSeller ? user.businessType || 'micro' : 'none',
    location: user.location,
    isVerified: true,
    profileImage: null,
    rating: isSeller ? user.rating || 4.5 : 0,
    totalReviews: isSeller ? user.totalReviews || 0 : 0,
    savedProducts: [],
    logoGenerationCount: {
      count: 0,
      lastResetDate: now,
    },
    imageEnhancementCount: {
      count: 0,
      lastResetDate: now,
    },
    generatedLogos: [],
    businessLogo: null,
    hasCustomLogo: false,
    updatedAt: now,
  };
}

function normalizeSeedImageUrl(imageUrl) {
  const raw = typeof imageUrl === 'string' ? imageUrl.trim() : '';
  if (!raw) return FALLBACK_UNSPLASH_FOOD_IMAGE;

  if (raw.includes('source.unsplash.com')) {
    const queryStart = raw.indexOf('?');
    const queryRaw = queryStart >= 0 ? raw.slice(queryStart + 1) : '';
    const firstPart = (queryRaw.split('&')[0] || '').trim();
    const keywords = sanitizeKeywords(firstPart);
    const lock = hashToLock(keywords);
    return `https://loremflickr.com/640/480/${keywords}?lock=${lock}`;
  }

  if (raw.includes('images.unsplash.com')) {
    if (raw.includes('auto=format') || raw.includes('fm=')) {
      return raw;
    }
    const separator = raw.includes('?') ? '&' : '?';
    return `${raw}${separator}auto=format&fm=jpg&q=80`;
  }

  return FALLBACK_UNSPLASH_FOOD_IMAGE;
}

function hashToLock(input = '') {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 100000) + 1;
}

function sanitizeKeywords(input = '') {
  const raw = String(input).toLowerCase().trim();
  const cleaned = raw.replace(/[^a-z0-9-]+/g, ',').replace(/^,+|,+$/g, '');
  return cleaned || 'indonesian-food';
}

function buildProductDoc(product, sellerId, location) {
  const now = new Date();
  return {
    name: product.name,
    description: product.description,
    price: product.price,
    category: 'food',
    images: [normalizeSeedImageUrl(product.image)],
    seller: sellerId,
    location,
    stock: product.stock,
    unit: product.unit || 'porsi',
    isAvailable: true,
    hasVariants: false,
    variants: [],
    optionGroups: [],
    tags: product.tags || [],
    rating: 4.5,
    totalReviews: 0,
    createdAt: now,
    updatedAt: now,
  };
}

async function upsertUser(usersCollection, userDoc) {
  await usersCollection.updateOne(
    { email: userDoc.email },
    {
      $set: userDoc,
      $setOnInsert: { createdAt: new Date() },
    },
    { upsert: true }
  );

  return usersCollection.findOne({ email: userDoc.email });
}

async function main() {
  loadEnv();

  const { MongoClient } = requireDependency('mongodb');
  const bcrypt = requireDependency('bcryptjs');

  const uri = process.env.MONGODB_URI || `mongodb://localhost:27017/${DEFAULT_DB_NAME}`;
  const dbName = process.env.MONGODB_DB_NAME || DEFAULT_DB_NAME;
  const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 10);

  const client = new MongoClient(uri);
  await client.connect();

  try {
    const db = client.db(dbName);
    const usersCollection = db.collection('users');
    const productsCollection = db.collection('products');

    console.log(`Connected to database: ${dbName}`);
    console.log('Seeding sellers and products...');

    const sellerOutputs = [];

    for (const seller of SELLERS) {
      const userDoc = buildUserDoc(seller, passwordHash, true);
      const savedSeller = await upsertUser(usersCollection, userDoc);

      await productsCollection.deleteMany({ seller: savedSeller._id });

      const productDocs = seller.products.map((product) =>
        buildProductDoc(product, savedSeller._id, seller.location)
      );
      if (productDocs.length > 0) {
        await productsCollection.insertMany(productDocs);
      }

      sellerOutputs.push({
        email: seller.email,
        password: DEFAULT_PASSWORD,
        businessName: seller.businessName,
        location: seller.location,
        products: seller.products.map((product) => product.name),
      });
    }

    console.log('Seeding buyer accounts...');
    const buyerOutputs = [];

    for (const buyer of BUYERS) {
      const userDoc = buildUserDoc(buyer, passwordHash, false);
      await upsertUser(usersCollection, userDoc);
      buyerOutputs.push({
        email: buyer.email,
        password: DEFAULT_PASSWORD,
        name: buyer.name,
      });
    }

    console.log('\nSeed completed successfully.\n');

    console.log('Seller Accounts');
    console.log('---------------');
    for (const seller of sellerOutputs) {
      console.log(`${seller.businessName}`);
      console.log(`  email: ${seller.email}`);
      console.log(`  password: ${seller.password}`);
      console.log(`  location: [${seller.location.coordinates[0]}, ${seller.location.coordinates[1]}]`);
      console.log('  products:');
      for (const productName of seller.products) {
        console.log(`    - ${productName}`);
      }
      console.log('');
    }

    console.log('Buyer Accounts');
    console.log('--------------');
    for (const buyer of buyerOutputs) {
      console.log(`${buyer.name}`);
      console.log(`  email: ${buyer.email}`);
      console.log(`  password: ${buyer.password}`);
      console.log('');
    }
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error('Failed to seed simulation data:', error.message);
  process.exit(1);
});
