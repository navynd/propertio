const mongoose = require('mongoose');
const { Schema, model } = mongoose;

const currencySchema = new Schema({
  code: { type: String, required: true },
  symbol: { type: String, required: true },
  exchangeRate: { type: Number, required: true, default: 1 },
  isDefault: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true }
});

const systemSettingsSchema = new Schema({
  appName: { type: String, default: 'Estatehub' },
  siteTitle: { type: String, default: 'Estatehub - Real Estate Platform' },
  logo: { type: String, default: '' },
  favicon: { type: String, default: '' },
  themeColor: { type: String, required: true, default: '#1F3D51' },

  seo: {
    metaTitle: { type: String, default: 'Estatehub' },
    metaDescription: { type: String, default: 'Find your dream property' },
    metaKeywords: { type: [String], default: [] }
  },

  currencies: { type: [currencySchema], default: [] }
}, { timestamps: true });

const SystemSettings = model('SystemSettings', systemSettingsSchema);
module.exports = SystemSettings;
