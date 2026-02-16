const cron = require('node-cron');
const fs = require('fs');
const path = require('path');
const User = require('../models/User');

const RETENTION_DAYS = parseInt(process.env.LOGO_RETENTION_DAYS) || 7;

/**
 * Clean up expired logos (older than RETENTION_DAYS)
 * Runs daily at 3:00 AM
 */
function startLogoCleanupJob() {
  // Schedule: 0 3 * * * = At 3:00 AM every day
  cron.schedule('0 3 * * *', async () => {
    console.log('[Logo Cleanup] Starting daily cleanup job...');

    try {
      const now = new Date();
      let deletedCount = 0;
      let usersUpdated = 0;

      // Find all users with generated logos
      const users = await User.find({
        'generatedLogos.0': { $exists: true }
      });

      for (const user of users) {
        const expiredLogos = [];
        const validLogos = [];

        // Separate expired and valid logos
        for (const logo of user.generatedLogos) {
          if (new Date(logo.expiresAt) < now) {
            expiredLogos.push(logo);
          } else {
            validLogos.push(logo);
          }
        }

        if (expiredLogos.length > 0) {
          // Delete files from disk
          for (const logo of expiredLogos) {
            try {
              const filePath = path.join(process.cwd(), logo.filePath);
              if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
                console.log(`[Logo Cleanup] Deleted: ${filePath}`);
                deletedCount++;
              }
            } catch (err) {
              console.error(`[Logo Cleanup] Error deleting file ${logo.filePath}:`, err.message);
            }
          }

          // Check if any expired logo was the current business logo
          const currentLogoExpired = expiredLogos.some(
            logo => user.businessLogo === logo.url
          );

          // Update user's generated logos array
          user.generatedLogos = validLogos;

          // If current business logo was expired, clear it
          if (currentLogoExpired) {
            user.businessLogo = null;
          }

          await user.save();
          usersUpdated++;
        }
      }

      console.log(`[Logo Cleanup] Complete. Deleted ${deletedCount} files, updated ${usersUpdated} users.`);
    } catch (error) {
      console.error('[Logo Cleanup] Error during cleanup:', error);
    }
  }, {
    scheduled: true,
    timezone: 'UTC'
  });

  console.log('[Logo Cleanup] Job scheduled to run daily at 3:00 AM UTC');
}

/**
 * Manually trigger cleanup (for testing or immediate cleanup)
 */
async function manualCleanup() {
  console.log('[Logo Cleanup] Running manual cleanup...');

  try {
    const now = new Date();
    let deletedCount = 0;
    let usersUpdated = 0;

    const users = await User.find({
      'generatedLogos.0': { $exists: true }
    });

    for (const user of users) {
      const expiredLogos = [];
      const validLogos = [];

      for (const logo of user.generatedLogos) {
        if (new Date(logo.expiresAt) < now) {
          expiredLogos.push(logo);
        } else {
          validLogos.push(logo);
        }
      }

      if (expiredLogos.length > 0) {
        for (const logo of expiredLogos) {
          try {
            const filePath = path.join(process.cwd(), logo.filePath);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`[Logo Cleanup] Deleted: ${filePath}`);
              deletedCount++;
            }
          } catch (err) {
            console.error(`[Logo Cleanup] Error deleting file ${logo.filePath}:`, err.message);
          }
        }

        const currentLogoExpired = expiredLogos.some(
          logo => user.businessLogo === logo.url
        );

        user.generatedLogos = validLogos;

        if (currentLogoExpired) {
          user.businessLogo = null;
        }

        await user.save();
        usersUpdated++;
      }
    }

    console.log(`[Logo Cleanup] Manual cleanup complete. Deleted ${deletedCount} files, updated ${usersUpdated} users.`);
    return { deletedCount, usersUpdated };
  } catch (error) {
    console.error('[Logo Cleanup] Error during manual cleanup:', error);
    throw error;
  }
}

/**
 * Delete a specific logo file and update user record
 */
async function deleteLogo(userId, logoId) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const logoIndex = user.generatedLogos.findIndex(
      logo => logo.logoId === logoId || logo._id.toString() === logoId
    );

    if (logoIndex === -1) {
      throw new Error('Logo not found');
    }

    const logo = user.generatedLogos[logoIndex];

    // Delete file from disk
    try {
      const filePath = path.join(process.cwd(), logo.filePath);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[Logo Cleanup] Deleted: ${filePath}`);
      }
    } catch (err) {
      console.error(`[Logo Cleanup] Error deleting file ${logo.filePath}:`, err.message);
    }

    // If this was the current business logo, clear it
    if (user.businessLogo === logo.url) {
      user.businessLogo = null;
    }

    // Remove from array
    user.generatedLogos.splice(logoIndex, 1);
    await user.save();

    return true;
  } catch (error) {
    console.error('[Logo Cleanup] Error deleting logo:', error);
    throw error;
  }
}

module.exports = {
  startLogoCleanupJob,
  manualCleanup,
  deleteLogo,
  RETENTION_DAYS
};
