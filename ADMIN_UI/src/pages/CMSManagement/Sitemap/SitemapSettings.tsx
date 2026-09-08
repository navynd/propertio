import { useCallback, useEffect, useMemo, useState } from "react";
import "quill/dist/quill.snow.css";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { sitemapService } from "../../../services/sitemapService";
import type { CountryRecord, SitemapDocumentRecord, SitemapPageSettings } from "../../../types/api";
import {
  Dropdown,
  SaveBar,
  TextField,
  sectionClass,
  sectionTitleClass,
} from "../shared/CmsFormShared";
import { SitemapCategorySection } from "./SitemapCategorySection";

const emptySettings: SitemapPageSettings = {
  breadcrumbHomeLabel: "Home",
  breadcrumbLabel: "Site map",
  pageTitle: "Sitemap",
  defaultCountryCode: "AE",
  locationNames: {
    AE: "Umm Al Quwain",
  },
};

function SitemapSettings() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SitemapPageSettings>(emptySettings);
  const [countries, setCountries] = useState<CountryRecord[]>([]);
  const [documents, setDocuments] = useState<SitemapDocumentRecord[]>([]);
  const [filterCountry, setFilterCountry] = useState("AE");
  const [refreshKey, setRefreshKey] = useState(0);

  const countryOptions = useMemo(
    () =>
      countries
        .map((country) => ({
          value: country.code || "",
          label: country.name || country.code || "",
        }))
        .filter((country) => country.value),
    [countries]
  );

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sitemapService.getSitemap({ countryCode: filterCountry });
      setSettings({ ...emptySettings, ...data.settings });
      setCountries(data.countries ?? []);
      setDocuments(data.documents ?? []);
    } catch (error) {
      push({
        type: "error",
        title: "Failed to load sitemap",
        description: getApiErrorMessage(error, "Unable to fetch sitemap CMS data."),
      });
    } finally {
      setLoading(false);
    }
  }, [filterCountry, push]);

  useEffect(() => {
    void fetchData();
  }, [fetchData, refreshKey]);

  const updateSettings = <K extends keyof SitemapPageSettings>(
    key: K,
    value: SitemapPageSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateLocationNameForCountry = (countryCode: string, value: string) => {
    setSettings((prev) => ({
      ...prev,
      locationNames: {
        ...(prev.locationNames || {}),
        [countryCode.toUpperCase()]: value,
      },
    }));
  };

  const handleSaveSettings = async () => {
    try {
      await sitemapService.saveSettings(settings);
      push({
        type: "success",
        title: "Settings saved",
        description: "Sitemap page settings updated successfully.",
      });
    } catch (error) {
      push({
        type: "error",
        title: "Save failed",
        description: getApiErrorMessage(error, "Could not save sitemap settings."),
      });
    }
  };

  if (loading) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex justify-center py-[80px]">
        <Loader size={80} />
      </div>
    );
  }

  const defaultCountry = settings.defaultCountryCode || "AE";

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <Header title="Sitemap" showBack={false} onBackClick={() => {}} />

      <div className="mt-[20px]">
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Page Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
            <TextField
              label="Page Title"
              value={settings.pageTitle || ""}
              onChange={(value) => updateSettings("pageTitle", value)}
            />
            <TextField
              label="Breadcrumb Home Label"
              value={settings.breadcrumbHomeLabel || ""}
              onChange={(value) => updateSettings("breadcrumbHomeLabel", value)}
            />
            <TextField
              label="Breadcrumb Label"
              value={settings.breadcrumbLabel || ""}
              onChange={(value) => updateSettings("breadcrumbLabel", value)}
            />
            <Dropdown
              label="Default Country"
              value={defaultCountry}
              options={countryOptions.length ? countryOptions : [{ value: "AE", label: "UAE" }]}
              onChange={(value) => updateSettings("defaultCountryCode", value)}
            />
            <TextField
              label="Location Name (page title)"
              value={settings.locationNames?.[defaultCountry.toUpperCase()] || ""}
              onChange={(value) => updateLocationNameForCountry(defaultCountry, value)}
              placeholder="Umm Al Quwain"
            />
          </div>
          <SaveBar onSave={() => void handleSaveSettings()} />
        </div>

        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Content by Location</h3>
          <p className="text-[13px] text-[#707070] mb-[16px]">
            Add sitemap categories per location using + Add category. Empty categories are hidden
            on the public site.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mb-[8px]">
            <Dropdown
              label="Location (Country)"
              value={filterCountry}
              options={countryOptions.length ? countryOptions : [{ value: "AE", label: "UAE" }]}
              onChange={setFilterCountry}
            />
          </div>

          <SitemapCategorySection
            key={filterCountry}
            countryCode={filterCountry}
            documents={documents}
            onSaved={() => setRefreshKey((key) => key + 1)}
          />
        </div>
      </div>
    </div>
  );
}

export default SitemapSettings;
