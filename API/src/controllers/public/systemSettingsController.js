const asyncHandler = require('express-async-handler');
const SystemSettings = require('../../models/systemSettingsModel');
const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

const getSettings = asyncHandler(async (req, res) => {
  try {
    let settings = await SystemSettings.findOne().lean();
    if (!settings) {
      // Fallback defaults if not seeded yet
      settings = {
        appName: 'Molumulk',
        siteTitle: 'Molumulk - Real Estate Platform',
        themeColor: '#1F3D51',
        logo: '',
        favicon: '',
        seo: {
          metaTitle: 'Molumulk',
          metaDescription: 'Find your dream property',
          metaKeywords: ['real estate', 'molumulk', 'property']
        },
        currencies: [
          { code: 'AED', symbol: 'د.إ', exchangeRate: 1, isDefault: true, isActive: true },
          { code: 'USD', symbol: '$', exchangeRate: 0.27, isDefault: false, isActive: true },
          { code: 'EUR', symbol: '€', exchangeRate: 0.25, isDefault: false, isActive: true }
        ]
      };
    }
    return success(res, 'Settings fetched successfully', settings);
  } catch (error) {
    logger.error('Failed to get public settings', { error: error.message });
    return failure(res, 500, 'Failed to fetch settings', 'SERVER_ERROR', error.message);
  }
});

module.exports = {
  getSettings
};
