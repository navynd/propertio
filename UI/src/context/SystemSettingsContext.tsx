import React, { createContext, useContext, useState, useEffect } from "react";
import { systemSettingsService, type SystemSettings } from "../services/systemSettingsService";

type SystemSettingsContextType = {
  settings: SystemSettings | null;
  loading: boolean;
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const adjustColorBrightness = (hex: string, percent: number): string => {
  let num = parseInt(hex.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;
  R = Math.max(0, Math.min(255, R));
  G = Math.max(0, Math.min(255, G));
  B = Math.max(0, Math.min(255, B));
  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
};

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const applyTheme = (color: string, favicon?: string) => {
    const hoverColor = adjustColorBrightness(color, -15);
    const primaryAlpha = color + "26";
    const hoverAlpha = color + "0d";
    let styleEl = document.getElementById("dynamic-theme-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dynamic-theme-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `:root { --primary-color: ${color}; --primary-hover: ${hoverColor}; --primary-color-alpha: ${primaryAlpha}; --primary-hover-alpha: ${hoverAlpha}; }`;
    if (favicon) {
      let faviconEl = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!faviconEl) { faviconEl = document.createElement("link"); faviconEl.rel = "icon"; document.head.appendChild(faviconEl); }
      faviconEl.href = `http://localhost:5000/${favicon}`;
    }
  };

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const data = await systemSettingsService.getSettings();
        setSettings(data);
        applyTheme(data.themeColor || "#1F3D51", data.favicon);
        if (data.siteTitle) document.title = data.siteTitle;
        if (data.seo?.metaDescription) {
          let descEl = document.querySelector("meta[name='description']") as HTMLMetaElement;
          if (!descEl) { descEl = document.createElement("meta"); descEl.name = "description"; document.head.appendChild(descEl); }
          descEl.content = data.seo.metaDescription;
        }
        if (data.seo?.metaKeywords?.length) {
          let keysEl = document.querySelector("meta[name='keywords']") as HTMLMetaElement;
          if (!keysEl) { keysEl = document.createElement("meta"); keysEl.name = "keywords"; document.head.appendChild(keysEl); }
          keysEl.content = data.seo.metaKeywords.join(", ");
        }
      } catch {
        applyTheme("#1F3D51");
      } finally {
        setLoading(false);
      }
    };
    void fetchSettings();
  }, []);

  return (
    <SystemSettingsContext.Provider value={{ settings, loading }}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
  return context;
};
