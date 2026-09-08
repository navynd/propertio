import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import Loader from "../../components/Loader/loader";
import { useToast } from "../../context/ToastContext";
import { useSystemSettings } from "../../context/SystemSettingsContext";
import { systemSettingsService, type SystemSettings } from "../../services/systemSettingsService";
import { getApiErrorMessage } from "../../services/apiClient";
import { inputClass, sectionClass, sectionTitleClass, labelClass } from "../CMSManagement/shared/CmsFormShared";

// Helper to darken/lighten hex colors programmatically
export function adjustColorBrightness(hex: string, percent: number): string {
  let num = parseInt(hex.replace("#", ""), 16),
    amt = Math.round(2.55 * percent),
    R = (num >> 16) + amt,
    G = (num >> 8 & 0x00FF) + amt,
    B = (num & 0x0000FF) + amt;

  R = Math.max(0, Math.min(255, R));
  G = Math.max(0, Math.min(255, G));
  B = Math.max(0, Math.min(255, B));

  return "#" + (0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1);
}

function SiteSettings() {
  const { push } = useToast();
  const { updateSettings } = useSystemSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [appName, setAppName] = useState("Propertio");
  const [siteTitle, setSiteTitle] = useState("Propertio - Real Estate Platform");
  const [themeColor, setThemeColor] = useState("#1F3D51");
  const [logoPreview, setLogoPreview] = useState("");
  const [faviconPreview, setFaviconPreview] = useState("");

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [faviconFile, setFaviconFile] = useState<File | null>(null);

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const data = await systemSettingsService.getSettings();
        if (active) {
          setAppName(data.appName || "Propertio");
          setSiteTitle(data.siteTitle || "Propertio - Real Estate Platform");
          setThemeColor(data.themeColor || "#1F3D51");
          if (data.logo) setLogoPreview(data.logo);
          if (data.favicon) setFaviconPreview(data.favicon);
        }
      } catch (error) {
        push({
          type: "error",
          title: "Error Loading Settings",
          description: getApiErrorMessage(error, "Failed to retrieve site configuration.")
        });
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchSettings();
    return () => { active = false; };
  }, [push]);

  // Live styling injection wrapper updates the CSS variables locally on dragging the picker
  const handleColorPickerChange = (color: string) => {
    setThemeColor(color);
    let styleEl = document.getElementById("dynamic-theme-style");
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "dynamic-theme-style";
      document.head.appendChild(styleEl);
    }
    const hoverColor = adjustColorBrightness(color, -15);
    const primaryAlpha = color + "26"; // 15% opacity
    const hoverAlpha = color + "0d"; // 5% opacity
    styleEl.textContent = `
      :root {
        --primary-color: ${color};
        --primary-hover: ${hoverColor};
        --primary-color-alpha: ${primaryAlpha};
        --primary-hover-alpha: ${hoverAlpha};
      }
    `;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleFaviconUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFaviconFile(file);
      setFaviconPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const formData = new FormData();
      formData.append("appName", appName.trim());
      formData.append("siteTitle", siteTitle.trim());
      formData.append("themeColor", themeColor);

      if (logoFile) {
        formData.append("logo", logoFile);
      }
      if (faviconFile) {
        formData.append("favicon", faviconFile);
      }

      const updated = await systemSettingsService.saveSettings(formData);
      updateSettings(updated);
      
      // Seed dynamically updated settings
      setAppName(updated.appName);
      setSiteTitle(updated.siteTitle);
      setThemeColor(updated.themeColor);
      if (updated.logo) setLogoPreview(updated.logo);
      if (updated.favicon) setFaviconPreview(updated.favicon);

      push({
        type: "success",
        title: "Settings Saved",
        description: "Branding settings and theme color have been updated globally."
      });
    } catch (error) {
      push({
        type: "error",
        title: "Failed to Save Settings",
        description: getApiErrorMessage(error, "An error occurred while saving.")
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] p-[20px] lg:p-[40px] overflow-y-auto">
      <Header title="Site Settings" />

      <form onSubmit={handleSave} className="flex flex-col gap-[20px] max-w-[800px] mt-[20px]">
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Branding & Theme Engine</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mb-[20px]">
            <div>
              <label className={labelClass}>App Name</label>
              <input
                type="text"
                value={appName}
                onChange={(e) => setAppName(e.target.value)}
                className={inputClass}
                required
              />
            </div>
            <div>
              <label className={labelClass}>Site Title</label>
              <input
                type="text"
                value={siteTitle}
                onChange={(e) => setSiteTitle(e.target.value)}
                className={inputClass}
                required
              />
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-start gap-[30px] mb-[20px] border-t border-[#F2F2F2] pt-[20px]">
            {/* Dynamic theme color picker */}
            <div className="flex flex-col gap-[8px]">
              <label className={labelClass}>Theme Brand Color</label>
              <div className="flex items-center gap-[12px]">
                <input
                  type="color"
                  value={themeColor}
                  onChange={(e) => handleColorPickerChange(e.target.value)}
                  className="w-[50px] h-[50px] border border-[#EAEAEA] rounded-[8px] cursor-pointer"
                />
                <input
                  type="text"
                  value={themeColor}
                  onChange={(e) => handleColorPickerChange(e.target.value)}
                  placeholder="#1F3D51"
                  className={`${inputClass} w-[120px] text-center font-mono`}
                  maxLength={7}
                />
              </div>
              <p className="text-[11px] text-[#888]">Drag picker or input a hex color (e.g. #1F3D51).</p>
            </div>
          </div>

          {/* Logo & Favicon uploads */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[24px] border-t border-[#F2F2F2] pt-[20px]">
            <div className="flex flex-col gap-[8px]">
              <label className={labelClass}>Brand Logo</label>
              {logoPreview && (
                <div className="w-full max-w-[200px] h-[80px] border border-[#EAEAEA] rounded-[10px] p-[10px] flex items-center justify-center bg-[#FDFDFD] mb-[10px]">
                  <img src={logoPreview.startsWith("blob:") ? logoPreview : `http://localhost:5000/${logoPreview}`} alt="Logo Preview" className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleLogoUpload} className="text-[12px]" />
            </div>

            <div className="flex flex-col gap-[8px]">
              <label className={labelClass}>Favicon</label>
              {faviconPreview && (
                <div className="w-[50px] h-[50px] border border-[#EAEAEA] rounded-[10px] p-[5px] flex items-center justify-center bg-[#FDFDFD] mb-[10px]">
                  <img src={faviconPreview.startsWith("blob:") ? faviconPreview : `http://localhost:5000/${faviconPreview}`} alt="Favicon Preview" className="max-h-full max-w-full object-contain" />
                </div>
              )}
              <input type="file" accept="image/*" onChange={handleFaviconUpload} className="text-[12px]" />
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="h-[44px] px-[28px] rounded-[10px] text-[#fff] text-[14px] font-[Bold] cursor-pointer theme-primary-button disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default SiteSettings;
