import { apiClient } from "./apiClient";

export type CurrencyEntry = {
  _id?: string;
  code: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  isActive: boolean;
};

export type SystemSettings = {
  appName: string;
  siteTitle: string;
  logo: string;
  favicon: string;
  themeColor: string;
  seo: {
    metaTitle: string;
    metaDescription: string;
    metaKeywords: string[];
  };
  currencies: CurrencyEntry[];
};

export const systemSettingsService = {
  getSettings(signal?: AbortSignal) {
    return apiClient.get<SystemSettings>("/system-settings", { auth: true, signal });
  },

  saveSettings(payload: FormData | Partial<SystemSettings>, signal?: AbortSignal) {
    // If it's a FormData object, pass it directly. Otherwise, send as JSON.
    const isFormData = payload instanceof FormData;
    return apiClient.put<SystemSettings>("/system-settings", payload, {
      auth: true,
      signal,
      headers: isFormData ? {} : { "Content-Type": "application/json" }
    } as any);
  }
};
