import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import Loader from "../../components/Loader/loader";
import { useToast } from "../../context/ToastContext";
import { useSystemSettings } from "../../context/SystemSettingsContext";
import { systemSettingsService } from "../../services/systemSettingsService";
import { getApiErrorMessage } from "../../services/apiClient";
import { inputClass, sectionClass, sectionTitleClass, labelClass, textareaClass } from "../CMSManagement/shared/CmsFormShared";

function SeoSettings() {
  const { push } = useToast();
  const { updateSettings } = useSystemSettings();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywordsInput, setMetaKeywordsInput] = useState("");

  useEffect(() => {
    let active = true;
    const fetchSettings = async () => {
      try {
        const data = await systemSettingsService.getSettings();
        if (active) {
          setMetaTitle(data.seo?.metaTitle || "");
          setMetaDescription(data.seo?.metaDescription || "");
          setMetaKeywordsInput((data.seo?.metaKeywords || []).join(", "));
        }
      } catch (error) {
        push({
          type: "error",
          title: "Error Loading SEO Settings",
          description: getApiErrorMessage(error, "Failed to retrieve SEO configuration.")
        });
      } finally {
        if (active) setLoading(false);
      }
    };
    void fetchSettings();
    return () => { active = false; };
  }, [push]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      // Split comma separated keyword string into array of trimmed strings
      const metaKeywords = metaKeywordsInput
        .split(",")
        .map(kw => kw.trim())
        .filter(Boolean);

      const payload = {
        seo: {
          metaTitle: metaTitle.trim(),
          metaDescription: metaDescription.trim(),
          metaKeywords
        }
      };

      const updated = await systemSettingsService.saveSettings(payload);
      updateSettings(updated);

      push({
        type: "success",
        title: "SEO Settings Saved",
        description: "Global metadata defaults have been successfully updated."
      });
    } catch (error) {
      push({
        type: "error",
        title: "Failed to Save SEO Settings",
        description: getApiErrorMessage(error, "An error occurred while saving.")
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="flex flex-col h-full bg-[#FAFAFA] p-[20px] lg:p-[40px] overflow-y-auto">
      <Header title="SEO Settings" />

      <form onSubmit={handleSave} className="flex flex-col gap-[20px] max-w-[800px] mt-[20px]">
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Search Engine Optimization (SEO)</h3>

          <div className="flex flex-col gap-[16px]">
            <div>
              <label className={labelClass}>Default Meta Title</label>
              <input
                type="text"
                value={metaTitle}
                onChange={(e) => setMetaTitle(e.target.value)}
                placeholder="Molumulk | Buy, Rent & Sell Properties"
                className={inputClass}
                required
              />
              <p className="text-[11px] text-[#888] mt-[4px]">Used as the fallback page title across the platform.</p>
            </div>

            <div>
              <label className={labelClass}>Default Meta Keywords</label>
              <input
                type="text"
                value={metaKeywordsInput}
                onChange={(e) => setMetaKeywordsInput(e.target.value)}
                placeholder="real estate, apartments for rent, villas for sale"
                className={inputClass}
              />
              <p className="text-[11px] text-[#888] mt-[4px]">Separate keywords with commas.</p>
            </div>

            <div>
              <label className={labelClass}>Default Meta Description</label>
              <textarea
                value={metaDescription}
                onChange={(e) => setMetaDescription(e.target.value)}
                placeholder="Search thousands of properties for sale and rent on Molumulk. Find your next villa, townhouse or apartment easily."
                rows={4}
                className={textareaClass}
                required
              />
              <p className="text-[11px] text-[#888] mt-[4px]">A brief summary of your site that appears in search engine results snippets.</p>
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

export default SeoSettings;
