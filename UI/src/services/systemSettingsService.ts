import axios from "axios";

const apiBaseUrl = (import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api").replace(/\/$/, "");

const apiClient = axios.create({
  baseURL: apiBaseUrl,
  headers: { "Content-Type": "application/json" },
});

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
  currencies: {
    code: string;
    symbol: string;
    exchangeRate: number;
    isDefault: boolean;
    isActive: boolean;
  }[];
};

export const systemSettingsService = {
  async getSettings(): Promise<SystemSettings> {
    const response = await apiClient.get<{ status: boolean; message: string; data: SystemSettings }>("/settings");
    return response.data.data;
  }
};
