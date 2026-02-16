const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },
  isSeller: {
    type: Boolean,
    default: false
  },
  automationEnabled: {
    type: Boolean,
    default: false
  },
  businessName: {
    type: String,
    default: null
  },
  businessType: {
    type: String,
    enum: ['micro', 'small', 'medium', 'none'],
    default: 'none'
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      default: [0, 0]
    },
    address: String,
    city: String,
    state: String,
    pincode: String
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  profileImage: {
    type: String,
    default: null
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  savedProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],

  // Logo generation fields
  logoGenerationCount: {
    count: { type: Number, default: 0 },
    lastResetDate: { type: Date, default: Date.now }
  },

  generatedLogos: [{
    _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
    logoId: { type: String },
    url: { type: String, required: true },
    prompt: { type: String, required: true },
    filePath: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) }
  }],

  businessLogo: {
    type: String,
    default: null
  },

  hasCustomLogo: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

userSchema.index({ location: '2dsphere' });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
