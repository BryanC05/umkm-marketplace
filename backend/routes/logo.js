const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const uuidv4 = () => crypto.randomUUID();
const { auth } = require('../middleware/auth');
const { logoGenerationLimiter, incrementGenerationCount, getGenerationStatus } = require('../middleware/logoLimiter');
const { generateLogo } = require('../utils/logoGenerator');
const { deleteLogo } = require('../utils/logoCleanup');
const User = require('../models/User');

// Ensure logos directory exists
const logosDir = path.join(__dirname, '..', 'uploads', 'logos');
if (!fs.existsSync(logosDir)) {
  fs.mkdirSync(logosDir, { recursive: true });
}

// Configure Multer for logo uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, logosDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${req.user._id}-${Date.now()}-${uuidv4()}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uniqueSuffix}-custom${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/svg+xml'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PNG, JPG, and SVG files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024 // 2MB limit
  }
});

/**
 * POST /api/logo/generate
 * Generate a new logo using AI
 */
router.post('/generate', auth, logoGenerationLimiter, async (req, res) => {
  try {
    const { prompt } = req.body;

    // Validate prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Invalid prompt',
        message: 'Please provide a valid logo description'
      });
    }

    if (prompt.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Prompt too long',
        message: 'Prompt must be less than 500 characters'
      });
    }

    // Generate unique filename
    const logoId = uuidv4();
    const baseFilename = `${req.user._id}-${Date.now()}-${logoId}`;
    const pngFilename = `${baseFilename}.png`;
    const outputPath = path.join(logosDir, pngFilename);

    // Generate logo using AI
    const generatedPath = await generateLogo(prompt.trim(), outputPath);

    // Determine actual filename and extension
    const actualExt = path.extname(generatedPath);
    const actualFilename = `${baseFilename}${actualExt}`;
    const relativePath = path.join('uploads', 'logos', actualFilename);
    const urlPath = `/uploads/logos/${actualFilename}`;

    // Increment user's generation count
    await incrementGenerationCount(req.user._id);

    // Save to user's generated logos
    const user = await User.findById(req.user._id);
    const logoEntry = {
      logoId: logoId, // Custom ID for reference
      url: urlPath,
      prompt: prompt.trim(),
      filePath: relativePath,
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    };

    user.generatedLogos.push(logoEntry);

    // Keep only last 20 logos in history
    if (user.generatedLogos.length > 20) {
      const removed = user.generatedLogos.shift();
      // Delete old file
      try {
        const oldPath = path.join(process.cwd(), removed.filePath);
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (err) {
        console.error('Error deleting old logo file:', err);
      }
    }

    await user.save();

    // Get updated generation status
    const status = await getGenerationStatus(req.user._id);

    res.json({
      success: true,
      logo: logoEntry,
      remainingGenerations: status.remaining,
      message: 'Logo generated successfully'
    });

  } catch (error) {
    console.error('Logo generation error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Generation failed',
      message: error.message || 'Failed to generate logo. Please try again.',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * GET /api/logo/history
 * Get user's logo generation history
 */
router.get('/history', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .select('generatedLogos businessLogo hasCustomLogo');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Filter out expired logos
    const now = new Date();
    const validLogos = user.generatedLogos.filter(
      logo => new Date(logo.expiresAt) > now
    );

    res.json({
      success: true,
      logos: validLogos.reverse(), // Most recent first
      businessLogo: user.businessLogo,
      hasCustomLogo: user.hasCustomLogo,
      totalGenerated: user.generatedLogos.length
    });

  } catch (error) {
    console.error('Error fetching logo history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch logo history'
    });
  }
});

/**
 * GET /api/logo/status
 * Get user's generation limit status
 */
router.get('/status', auth, async (req, res) => {
  try {
    const status = await getGenerationStatus(req.user._id);

    if (!status) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({
      success: true,
      status
    });

  } catch (error) {
    console.error('Error fetching generation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch generation status'
    });
  }
});

/**
 * POST /api/logo/reset-limit
 * Reset daily generation limit (for testing only)
 */
router.post('/reset-limit', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.logoGenerationCount.count = 0;
    user.logoGenerationCount.lastResetDate = new Date();
    await user.save();

    const { DAILY_LIMIT } = require('../middleware/logoLimiter');

    res.json({
      success: true,
      message: 'Logo generation limit reset successfully',
      status: {
        limit: DAILY_LIMIT,
        used: 0,
        remaining: DAILY_LIMIT,
        resetTime: (() => {
          const t = new Date();
          t.setUTCHours(24, 0, 0, 0);
          return t.toISOString();
        })(),
      }
    });
  } catch (error) {
    console.error('Error resetting limit:', error);
    res.status(500).json({ success: false, error: 'Failed to reset limit' });
  }
});

/**
 * PUT /api/logo/select/:logoId
 * Select a logo as the business logo
 */
router.put('/select/:logoId', auth, async (req, res) => {
  try {
    const { logoId } = req.params;
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Find the logo in generated logos (check both logoId and _id for backward compat)
    const logo = user.generatedLogos.find(l => l.logoId === logoId || l._id.toString() === logoId);

    if (!logo) {
      return res.status(404).json({
        success: false,
        error: 'Logo not found',
        message: 'The requested logo was not found in your history'
      });
    }

    // Check if logo has expired
    if (new Date(logo.expiresAt) < new Date()) {
      return res.status(400).json({
        success: false,
        error: 'Logo expired',
        message: 'This logo has expired. Please generate a new one.'
      });
    }

    // Set as business logo
    user.businessLogo = logo.url;
    await user.save();

    res.json({
      success: true,
      message: 'Logo selected as business logo',
      businessLogo: user.businessLogo
    });

  } catch (error) {
    console.error('Error selecting logo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to select logo'
    });
  }
});

/**
 * DELETE /api/logo/:logoId
 * Delete a specific logo
 */
router.delete('/:logoId', auth, async (req, res) => {
  try {
    const { logoId } = req.params;

    await deleteLogo(req.user._id, logoId);

    res.json({
      success: true,
      message: 'Logo deleted successfully'
    });

  } catch (error) {
    console.error('Error deleting logo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete logo',
      message: error.message
    });
  }
});

/**
 * POST /api/logo/upload
 * Upload a custom logo
 */
router.post('/upload', auth, upload.single('logo'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
        message: 'Please select a file to upload'
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      // Delete uploaded file if user not found
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ message: 'User not found' });
    }

    // Delete previous custom logo if exists
    if (user.businessLogo && user.hasCustomLogo) {
      try {
        const oldPath = path.join(process.cwd(), 'uploads', user.businessLogo.replace('/uploads/', ''));
        if (fs.existsSync(oldPath)) {
          fs.unlinkSync(oldPath);
        }
      } catch (err) {
        console.error('Error deleting old custom logo:', err);
      }
    }

    // Set as business logo
    const relativePath = path.join('uploads', 'logos', req.file.filename);
    user.businessLogo = `/uploads/logos/${req.file.filename}`;
    user.hasCustomLogo = true;
    await user.save();

    res.json({
      success: true,
      message: 'Logo uploaded successfully',
      businessLogo: user.businessLogo
    });

  } catch (error) {
    console.error('Logo upload error:', error);

    // Delete uploaded file if error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({
      success: false,
      error: 'Upload failed',
      message: error.message || 'Failed to upload logo'
    });
  }
});

/**
 * DELETE /api/logo/custom
 * Remove custom logo and revert to AI-generated or none
 */
router.delete('/custom/remove', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.hasCustomLogo && user.businessLogo) {
      // Delete the custom logo file
      try {
        const filePath = path.join(process.cwd(), 'uploads', user.businessLogo.replace('/uploads/', ''));
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      } catch (err) {
        console.error('Error deleting custom logo:', err);
      }
    }

    // Check if user has any AI-generated logos to fall back to
    const now = new Date();
    const validLogos = user.generatedLogos.filter(l => new Date(l.expiresAt) > now);

    if (validLogos.length > 0) {
      // Use most recent AI-generated logo
      user.businessLogo = validLogos[validLogos.length - 1].url;
    } else {
      user.businessLogo = null;
    }

    user.hasCustomLogo = false;
    await user.save();

    res.json({
      success: true,
      message: 'Custom logo removed',
      businessLogo: user.businessLogo
    });

  } catch (error) {
    console.error('Error removing custom logo:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to remove custom logo'
    });
  }
});

// Error handling middleware for multer
router.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        success: false,
        error: 'File too large',
        message: 'Logo must be less than 2MB'
      });
    }
    return res.status(400).json({
      success: false,
      error: 'Upload error',
      message: error.message
    });
  }

  if (error) {
    return res.status(400).json({
      success: false,
      error: 'Invalid file',
      message: error.message
    });
  }

  next();
});

module.exports = router;
