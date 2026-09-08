import React, { createContext, useContext, useState, useEffect } from "react";
import { systemSettingsService, type SystemSettings } from "../services/systemSettingsService";
import { adjustColorBrightness } from "../pages/SystemSettings/SiteSettings";

type SystemSettingsContextType = {
  settings: SystemSettings | null;
  loading: boolean;
  updateSettings: (newSettings: SystemSettings) => void;
};

const SystemSettingsContext = createContext<SystemSettingsContextType | undefined>(undefined);

export const SystemSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const applyTheme = (color: string, favicon?: string) => {
    const hoverColor = adjustColorBrightness(color, -15);
    const primaryAlpha = color + "26"; // 15% opacity
    const hoverAlpha = color + "0d"; // 5% opacity

    let styleEl = document.getElementById("dynamic-theme-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dynamic-theme-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `
      :root {
        --primary-color: ${color};
        --primary-hover: ${hoverColor};
        --primary-color-alpha: ${primaryAlpha};
        --primary-hover-alpha: ${hoverAlpha};
      }
    `;

    if (favicon) {
      let faviconEl = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!faviconEl) {
        faviconEl = document.createElement("link");
        faviconEl.rel = "icon";
        document.head.appendChild(faviconEl);
      }
      faviconEl.href = `http://localhost:5000/${favicon}`;
    }
  };

  const fetchSettings = async () => {
    try {
      const data = await systemSettingsService.getSettings();
      setSettings(data);
      if (data.themeColor) {
        applyTheme(data.themeColor, data.favicon);
      }
      if (data.siteTitle) {
        document.title = data.siteTitle;
      }
    } catch (e) {
      applyTheme("#1F3D51");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchSettings();
  }, []);

  const updateSettings = (newSettings: SystemSettings) => {
    setSettings(newSettings);
    if (newSettings.themeColor) {
      applyTheme(newSettings.themeColor, newSettings.favicon);
    }
    if (newSettings.siteTitle) {
      document.title = newSettings.siteTitle;
    }
  };

  return (
    <SystemSettingsContext.Provider value={{ settings, loading, updateSettings }}>
      {children}
    </SystemSettingsContext.Provider>
  );
};

export const useSystemSettings = () => {
  const context = useContext(SystemSettingsContext);
  if (!context) {
    throw new Error("useSystemSettings must be used within a SystemSettingsProvider");
  }
  return context;
};
