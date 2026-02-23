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

const SELLERS = [
  {
    name: 'Rani Pratama',
    email: 'seller.summarecon@trolitoko.test',
    phone: '081200000101',
    businessName: 'Dapur Summarecon',
    businessType: 'small',
    rating: 4.8,
    totalReviews: 134,
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
        image: 'https://images.unsplash.com/photo-1536304993881-ff6e9eefa2a6?w=640&h=480&fit=crop',
      },
      {
        name: 'Soto Betawi Kuah Susu',
        description: 'Soto Betawi gurih dengan daging sapi empuk dan kentang goreng.',
        price: 35000,
        stock: 45,
        unit: 'mangkuk',
        tags: ['soto', 'betawi', 'kuah-gurih'],
        image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?w=640&h=480&fit=crop',
      },
      {
        name: 'Es Kopi Gula Aren',
        description: 'Kopi susu gula aren dengan espresso blend lokal.',
        price: 19000,
        stock: 120,
        unit: 'cup',
        tags: ['kopi', 'minuman', 'gula-aren'],
        image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=640&h=480&fit=crop',
      },
      {
        name: 'Pisang Goreng Cokelat Keju',
        description: 'Pisang goreng crispy dengan topping cokelat dan keju parut.',
        price: 22000,
        stock: 70,
        unit: 'box',
        tags: ['cemilan', 'pisang-goreng', 'manis'],
        image: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?w=640&h=480&fit=crop',
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
        image: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=640&h=480&fit=crop',
      },
      {
        name: 'Mie Chili Oil Beef',
        description: 'Mie kenyal dengan chili oil homemade dan irisan beef.',
        price: 32000,
        stock: 55,
        unit: 'mangkuk',
        tags: ['mie', 'chili-oil', 'beef'],
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=640&h=480&fit=crop',
      },
      {
        name: 'Croissant Tuna Mayo',
        description: 'Croissant buttery isi tuna mayo, cocok untuk sarapan cepat.',
        price: 25000,
        stock: 40,
        unit: 'pcs',
        tags: ['pastry', 'croissant', 'tuna'],
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=640&h=480&fit=crop',
      },
      {
        name: 'Matcha Latte',
        description: 'Matcha latte creamy dengan pilihan less sugar.',
        price: 21000,
        stock: 90,
        unit: 'cup',
        tags: ['matcha', 'minuman', 'latte'],
        image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=640&h=480&fit=crop',
      },
      {
        name: 'Mie Chili Oil Beef',
        description: 'Mie kenyal dengan chili oil homemade dan irisan beef.',
        price: 32000,
        stock: 55,
        unit: 'mangkuk',
        tags: ['mie', 'chili-oil', 'beef'],
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=640&h=480&fit=crop',
      },
      {
        name: 'Croissant Tuna Mayo',
        description: 'Croissant buttery isi tuna mayo, cocok untuk sarapan cepat.',
        price: 25000,
        stock: 40,
        unit: 'pcs',
        tags: ['pastry', 'croissant', 'tuna'],
        image: 'https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=640&h=480&fit=crop',
      },
      {
        name: 'Matcha Latte',
        description: 'Matcha latte creamy dengan pilihan less sugar.',
        price: 21000,
        stock: 90,
        unit: 'cup',
        tags: ['matcha', 'minuman', 'latte'],
        image: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?w=640&h=480&fit=crop',
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
        image: 'https://images.unsplash.com/photo-1617093727343-374698b1b08d?w=640&h=480&fit=crop',
      },
      {
        name: 'Gado-Gado Betawi',
        description: 'Sayuran segar, tahu, tempe, lontong, dengan bumbu kacang.',
        price: 24000,
        stock: 65,
        unit: 'porsi',
        tags: ['gado-gado', 'sayur', 'kacang'],
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=640&h=480&fit=crop',
      },
      {
        name: 'Bakso Urat Kuah Kaldu',
        description: 'Bakso urat sapi dengan kuah kaldu bening dan mie.',
        price: 27000,
        stock: 75,
        unit: 'mangkuk',
        tags: ['bakso', 'sapi', 'hangat'],
        image: 'https://images.unsplash.com/photo-1599084993091-1cb5c0721cc6?w=640&h=480&fit=crop',
      },
      {
        name: 'Es Teh Lemon Madu',
        description: 'Teh lemon segar dengan madu asli.',
        price: 12000,
        stock: 150,
        unit: 'cup',
        tags: ['teh', 'lemon', 'minuman'],
        image: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=640&h=480&fit=crop',
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

function buildProductDoc(product, sellerId, location) {
  const now = new Date();
  return {
    name: product.name,
    description: product.description,
    price: product.price,
    category: 'food',
    images: [product.image],
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
