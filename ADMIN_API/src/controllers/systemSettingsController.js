const asyncHandler = require('express-async-handler');
const SystemSettings = require('../models/systemSettingsModel');
const uploadService = require('../services/uploadService');
const { success, failure } = require('../utils/helpers');
const { logger } = require('../utils/logger');

// Fetch or seed default settings
const getSystemSettings = asyncHandler(async (req, res) => {
  try {
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings({
        appName: 'Propertio',
        siteTitle: 'Propertio - Real Estate Platform',
        themeColor: '#1F3D51',
        seo: {
          metaTitle: 'Propertio',
          metaDescription: 'Find your dream property',
          metaKeywords: ['real estate', 'propertio', 'property']
        },
        currencies: [
          { code: 'AED', symbol: 'د.إ', exchangeRate: 1, isDefault: true, isActive: true },
          { code: 'USD', symbol: '$', exchangeRate: 0.27, isDefault: false, isActive: true },
          { code: 'EUR', symbol: '€', exchangeRate: 0.25, isDefault: false, isActive: true }
        ]
      });
      await settings.save();
    }
    return success(res, 'System settings fetched successfully', settings);
  } catch (error) {
    logger.error('Failed to get system settings', { error: error.message });
    return failure(res, 500, 'Failed to fetch settings', 'SERVER_ERROR', error.message);
  }
});

// Update system settings with file uploads support
const updateSystemSettings = asyncHandler(async (req, res) => {
  try {
    const { appName, siteTitle, themeColor, seo, currencies } = req.body || {};
    let settings = await SystemSettings.findOne();
    if (!settings) {
      settings = new SystemSettings();
    }

    // Branding updates
    if (appName !== undefined) settings.appName = appName;
    if (siteTitle !== undefined) settings.siteTitle = siteTitle;
    if (themeColor !== undefined) settings.themeColor = themeColor;

    // Handle branding file uploads
    if (req.files) {
      if (req.files.logo && req.files.logo[0]) {
        try {
          const uploadedLogo = await uploadService.upload(req.files.logo[0], 'branding');
          settings.logo = uploadedLogo.path || `branding/${uploadedLogo.filename}`;
        } catch (uploadError) {
          logger.warn('Failed to upload branding logo', { error: uploadError.message });
        }
      }
      if (req.files.favicon && req.files.favicon[0]) {
        try {
          const uploadedFavicon = await uploadService.upload(req.files.favicon[0], 'branding');
          settings.favicon = uploadedFavicon.path || `branding/${uploadedFavicon.filename}`;
        } catch (uploadError) {
          logger.warn('Failed to upload branding favicon', { error: uploadError.message });
        }
      }
    }

    // SEO updates (handle both JSON string and raw object)
    if (seo !== undefined) {
      let parsedSeo = seo;
      if (typeof seo === 'string') {
        try {
          parsedSeo = JSON.parse(seo);
        } catch (e) {
          logger.warn('Failed to parse SEO string', { error: e.message });
        }
      }
      settings.seo = {
        metaTitle: parsedSeo.metaTitle !== undefined ? parsedSeo.metaTitle : settings.seo.metaTitle,
        metaDescription: parsedSeo.metaDescription !== undefined ? parsedSeo.metaDescription : settings.seo.metaDescription,
        metaKeywords: parsedSeo.metaKeywords !== undefined ? parsedSeo.metaKeywords : settings.seo.metaKeywords
      };
    }

    // Currencies updates (handle both JSON string and raw array)
    if (currencies !== undefined) {
      let parsedCurrencies = currencies;
      if (typeof currencies === 'string') {
        try {
          parsedCurrencies = JSON.parse(currencies);
        } catch (e) {
          logger.warn('Failed to parse currencies string', { error: e.message });
        }
      }
      if (Array.isArray(parsedCurrencies)) {
        settings.currencies = parsedCurrencies;
      }
    }

    await settings.save();
    return success(res, 'System settings updated successfully', settings);
  } catch (error) {
    logger.error('Failed to update system settings', { error: error.message });
    return failure(res, 500, 'Failed to update settings', 'SERVER_ERROR', error.message);
  }
});

module.exports = {
  getSystemSettings,
  updateSystemSettings
};
