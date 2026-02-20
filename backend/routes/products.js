const express = require('express');
const Product = require('../models/Product');
const { auth } = require('../middleware/auth');
const router = express.Router();

// Get user's own products (for dashboard)
router.get('/my-products', auth, async (req, res) => {
  try {
    const products = await Product.find({ seller: req.user._id })
      .sort({ createdAt: -1 })
      .populate('seller', 'businessName rating isVerified location name');

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get product counts per category
router.get('/categories/counts', async (req, res) => {
  try {
    const counts = await Product.aggregate([
      { $match: { isAvailable: true } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Transform to object for easier frontend consumption
    const categoryCounts = {};
    counts.forEach(item => {
      categoryCounts[item._id] = item.count;
    });

    res.json(categoryCounts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const {
      lat,
      lng,
      radius = 5000,
      category,
      search,
      minPrice,
      maxPrice,
      sort,
      page = 1,
      limit = 20
    } = req.query;

    // Build sort options
    let sortOptions = {};
    switch (sort) {
      case 'rating':
        sortOptions = { rating: -1, createdAt: -1 };
        break;
      case 'price-low':
        sortOptions = { price: 1 };
        break;
      case 'price-high':
        sortOptions = { price: -1 };
        break;
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      default:
        sortOptions = { createdAt: -1 };
    }

    let query = { isAvailable: true };

    if (category) {
      query.category = category;
    }

    if (search) {
      query.$text = { $search: search };
    }

    if (minPrice !== undefined || maxPrice !== undefined) {
      query.price = {};
      if (minPrice !== undefined) query.price.$gte = Number(minPrice);
      if (maxPrice !== undefined) query.price.$lte = Number(maxPrice);
    }

    let products;
    let total;
    const skip = (Number(page) - 1) * Number(limit);

    if (lat && lng) {
      // Build full geo query for both fetching and counting
      const geoQuery = {
        ...query,
        location: {
          $near: {
            $geometry: {
              type: 'Point',
              coordinates: [Number(lng), Number(lat)]
            },
            $maxDistance: Number(radius)
          }
        }
      };

      products = await Product.find(geoQuery)
        .populate('seller', 'name businessName rating phone location')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit));

      // Count with geo filter using $geoWithin (countDocuments doesn't support $near)
      const geoCountQuery = {
        ...query,
        'location.coordinates': {
          $geoWithin: {
            $centerSphere: [[Number(lng), Number(lat)], Number(radius) / 6378100] // radius in radians
          }
        }
      };
      total = await Product.countDocuments(geoCountQuery);
    } else {
      products = await Product.find(query)
        .populate('seller', 'name businessName rating phone location')
        .sort(sortOptions)
        .skip(skip)
        .limit(Number(limit));
      total = await Product.countDocuments(query);
    }

    res.json({
      products,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


router.get('/seller/:sellerId', async (req, res) => {
  try {
    const products = await Product.find({
      seller: req.params.sellerId
    }).populate('seller', 'name businessName rating location');

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('seller', 'name businessName rating phone email location isVerified');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// All authenticated users can create products
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, price, category, stock, unit, images, tags, currentLocation, hasVariants, variants, optionGroups } = req.body;

    // Check if user has valid location in profile
    const userLocation = req.user.location;
    const hasValidProfileLocation = userLocation &&
      userLocation.coordinates &&
      userLocation.coordinates.length === 2 &&
      (userLocation.coordinates[0] !== 0 || userLocation.coordinates[1] !== 0);

    // Check if current location was provided from frontend
    const hasValidCurrentLocation = currentLocation &&
      currentLocation.coordinates &&
      currentLocation.coordinates.length === 2 &&
      (currentLocation.coordinates[0] !== 0 || currentLocation.coordinates[1] !== 0);

    // Use profile location first, then current location as fallback
    let productLocation;
    console.log('--- Product Creation Debug ---');
    console.log('User:', req.user.email);
    console.log('User Profile Location:', JSON.stringify(userLocation));
    console.log('Frontend Current Location:', JSON.stringify(currentLocation));
    console.log('Has Valid Profile Loc:', hasValidProfileLocation);
    console.log('Has Valid Current Loc:', hasValidCurrentLocation);

    if (hasValidProfileLocation) {
      productLocation = {
        type: 'Point',
        coordinates: userLocation.coordinates,
        address: userLocation.address,
        city: userLocation.city,
        state: userLocation.state
      };
    } else if (hasValidCurrentLocation) {
      productLocation = {
        type: 'Point',
        coordinates: currentLocation.coordinates,
        address: currentLocation.address || 'Current Location',
        city: currentLocation.city || '',
        state: currentLocation.state || ''
      };
    } else {
      console.log('❌ REJECTED: No valid location found');
      return res.status(400).json({
        message: 'Location required. Please enable location access or update your profile with a valid address.'
      });
    }

    // Keep profile discoverable for nearby seller features.
    // Creating a product should mark account as seller and backfill missing profile location.
    const userUpdates = {};
    if (!req.user.isSeller) {
      userUpdates.isSeller = true;
    }
    if (!hasValidProfileLocation && hasValidCurrentLocation) {
      userUpdates.location = productLocation;
    }
    if (Object.keys(userUpdates).length > 0) {
      await User.findByIdAndUpdate(req.user._id, { $set: userUpdates });
    }

    const product = new Product({
      name,
      description,
      price,
      category,
      stock,
      unit,
      images,
      tags,
      seller: req.user._id,
      location: productLocation,
      hasVariants: hasVariants || false,
      variants: hasVariants ? variants : [],
      optionGroups: optionGroups || []
    });

    await product.save();
    res.status(201).json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});


// All authenticated users can update their own products
router.put('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, seller: req.user._id });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    const updates = req.body;
    Object.keys(updates).forEach(key => {
      product[key] = updates[key];
    });

    await product.save();
    res.json(product);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// All authenticated users can delete their own products
router.delete('/:id', auth, async (req, res) => {
  try {
    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      seller: req.user._id
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found or unauthorized' });
    }

    res.json({ message: 'Product deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;
