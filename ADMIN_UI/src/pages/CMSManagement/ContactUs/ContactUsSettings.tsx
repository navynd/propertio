import { useCallback, useEffect, useState } from "react";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useToast } from "../../../context/ToastContext";
import { contactService } from "../../../services/contactService";
import { getApiErrorMessage } from "../../../services/apiClient";
import type {
  ContactOfficeLocation,
  ContactPageSettings,
  ContactSubmissionRecord,
} from "../../../types/api";
import { defaultContactPageSettings } from "../cmsData";
import {
  SaveBar,
  SeoSection,
  TextAreaField,
  TextField,
  Toggle,
  sectionClass,
  sectionTitleClass,
} from "../shared/CmsFormShared";

const emptySeo = defaultContactPageSettings.seo;

const formatSubmittedAt = (value: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function ContactUsSettings() {
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<ContactPageSettings>(defaultContactPageSettings);
  const [formSubjects, setFormSubjects] = useState<string[]>([]);
  const [locations, setLocations] = useState<ContactOfficeLocation[]>([]);
  const [submissions, setSubmissions] = useState<ContactSubmissionRecord[]>([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await contactService.getContact();
      setSettings({
        ...defaultContactPageSettings,
        ...data.settings,
        seo: { ...emptySeo, ...data.settings?.seo },
      });
      setFormSubjects(data.formSubjects?.length ? data.formSubjects : ["General inquiry"]);
      setLocations(data.locations ?? []);
      setSubmissions(data.submissions ?? []);
    } catch (error) {
      push({
        type: "error",
        title: "Failed to load Contact Us",
        description: getApiErrorMessage(error, "Unable to fetch contact page data."),
      });
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    void fetchData();
  }, [fetchData]);

  const update = <K extends keyof ContactPageSettings>(
    key: K,
    value: ContactPageSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const updateLocation = (id: string, patch: Partial<ContactOfficeLocation>) => {
    setLocations((prev) => prev.map((loc) => (loc.id === id ? { ...loc, ...patch } : loc)));
  };

  const addSubject = () => {
    setFormSubjects((prev) => [...prev, "New subject"]);
  };

  const removeSubject = (index: number) => {
    setFormSubjects((prev) => prev.filter((_, i) => i !== index));
  };

  const addLocation = () => {
    const nextOrder = locations.length
      ? Math.max(...locations.map((loc) => loc.displayOrder)) + 1
      : 1;
    setLocations((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        city: "",
        country: "",
        locationType: "",
        address: "",
        mapUrl: "",
        phone: "",
        email: "",
        displayOrder: nextOrder,
        isActive: true,
      },
    ]);
  };

  const removeLocation = (id: string) => {
    setLocations((prev) => prev.filter((loc) => loc.id !== id));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await contactService.saveContact({
        settings,
        formSubjects: formSubjects.map((s) => s.trim()).filter(Boolean),
        locations,
      });
      setSettings({
        ...defaultContactPageSettings,
        ...data.settings,
        seo: { ...emptySeo, ...data.settings?.seo },
      });
      setFormSubjects(data.formSubjects ?? []);
      setLocations(data.locations ?? []);
      setSubmissions(data.submissions ?? []);
      push({
        type: "success",
        title: "Contact page saved",
        description: "Contact Us content updated successfully.",
      });
    } catch (error) {
      push({
        type: "error",
        title: "Save failed",
        description: getApiErrorMessage(error, "Could not save contact page."),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex justify-center py-[80px]">
        <Loader size={80} />
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <Header title="Contact Us" showBack={false} onBackClick={() => {}} />

      <div className="mt-[20px]">
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Hero Section</h3>
          <div className="grid grid-cols-1 gap-[16px]">
            <TextField
              label="Hero Title"
              value={settings.heroTitle || ""}
              onChange={(v) => update("heroTitle", v)}
              required
            />
            <TextAreaField
              label="Hero Subtitle"
              value={settings.heroSubtitle || ""}
              onChange={(v) => update("heroSubtitle", v)}
            />
            <TextField
              label="Hero Background Image URL"
              value={settings.heroBackgroundImage || ""}
              onChange={(v) => update("heroBackgroundImage", v)}
              placeholder="https://..."
            />
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Main Contact Info</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
            <TextField
              label="Section Title"
              value={settings.sectionTitle || ""}
              onChange={(v) => update("sectionTitle", v)}
            />
            <TextField
              label="Section Subtext"
              value={settings.sectionSubtext || ""}
              onChange={(v) => update("sectionSubtext", v)}
            />
            <TextField
              label="Email"
              value={settings.email || ""}
              onChange={(v) => update("email", v)}
              type="email"
              required
            />
            <TextField
              label="Phone"
              value={settings.phone || ""}
              onChange={(v) => update("phone", v)}
              required
            />
            <div className="md:col-span-2">
              <TextAreaField
                label="Office Address"
                value={settings.officeAddress || ""}
                onChange={(v) => update("officeAddress", v)}
              />
            </div>
            <TextField
              label="Map URL"
              value={settings.mapUrl || ""}
              onChange={(v) => update("mapUrl", v)}
            />
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Social Media Links</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
            <TextField
              label="Facebook URL"
              value={settings.facebookUrl || ""}
              onChange={(v) => update("facebookUrl", v)}
            />
            <TextField
              label="Instagram URL"
              value={settings.instagramUrl || ""}
              onChange={(v) => update("instagramUrl", v)}
            />
            <TextField
              label="X (Twitter) URL"
              value={settings.twitterUrl || ""}
              onChange={(v) => update("twitterUrl", v)}
            />
            <TextField
              label="LinkedIn URL"
              value={settings.linkedinUrl || ""}
              onChange={(v) => update("linkedinUrl", v)}
            />
          </div>
        </div>

        <div className={sectionClass}>
          <div className="flex items-center justify-between mb-[12px]">
            <h3 className={sectionTitleClass + " mb-0"}>Contact Form — Subject Options</h3>
            <button
              type="button"
              onClick={addSubject}
              className="h-[36px] px-[16px] rounded-[8px] border border-[#6A3CA8] text-[#6A3CA8] text-[13px] font-[SemiBold] cursor-pointer"
            >
              + Add subject
            </button>
          </div>
          <p className="text-[13px] text-[#707070] mb-[12px]">
            These appear in the Subject dropdown on the public contact form.
          </p>
          {formSubjects.map((subject, index) => (
            <div key={`subject-${index}`} className="flex gap-[10px] mb-[10px]">
              <input
                value={subject}
                onChange={(e) =>
                  setFormSubjects((prev) =>
                    prev.map((s, i) => (i === index ? e.target.value : s))
                  )
                }
                className="h-[44px] flex-1 rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none"
              />
              <button
                type="button"
                onClick={() => removeSubject(index)}
                className="text-[12px] text-[#EA3934] font-[SemiBold] px-[8px] cursor-pointer"
              >
                Remove
              </button>
            </div>
          ))}
        </div>

        <div className={sectionClass}>
          <div className="flex items-center justify-between mb-[12px]">
            <h3 className={sectionTitleClass + " mb-0"}>Other Office Locations</h3>
            <button
              type="button"
              onClick={addLocation}
              className="h-[36px] px-[16px] rounded-[8px] border border-[#6A3CA8] text-[#6A3CA8] text-[13px] font-[SemiBold] cursor-pointer"
            >
              + Add location
            </button>
          </div>
          {locations.map((loc, index) => (
            <div key={loc.id} className="border border-[#EAEAEA] rounded-[10px] p-[16px] mb-[12px]">
              <div className="flex items-center justify-between mb-[12px]">
                <p className="text-[14px] font-[Bold] text-[#222]">Location {index + 1}</p>
                <button
                  type="button"
                  onClick={() => removeLocation(loc.id)}
                  className="text-[12px] text-[#EA3934] font-[SemiBold] cursor-pointer"
                >
                  Remove
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                <TextField
                  label="City"
                  value={loc.city}
                  onChange={(v) => updateLocation(loc.id, { city: v })}
                />
                <TextField
                  label="Country"
                  value={loc.country}
                  onChange={(v) => updateLocation(loc.id, { country: v })}
                />
                <TextField
                  label="Location Type"
                  value={loc.locationType}
                  onChange={(v) => updateLocation(loc.id, { locationType: v })}
                  placeholder="Tech hub"
                />
                <TextField
                  label="Phone"
                  value={loc.phone}
                  onChange={(v) => updateLocation(loc.id, { phone: v })}
                />
                <TextField
                  label="Email"
                  value={loc.email}
                  onChange={(v) => updateLocation(loc.id, { email: v })}
                />
                <TextField
                  label="Map URL"
                  value={loc.mapUrl}
                  onChange={(v) => updateLocation(loc.id, { mapUrl: v })}
                />
                <div className="md:col-span-2">
                  <TextAreaField
                    label="Full Address"
                    value={loc.address}
                    onChange={(v) => updateLocation(loc.id, { address: v })}
                  />
                </div>
                <Toggle
                  label="Status"
                  checked={loc.isActive}
                  onChange={(v) => updateLocation(loc.id, { isActive: v })}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="p-[20px] bg-[#fff] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px] mb-[20px]">
          <h3 className={sectionTitleClass}>Form Submissions (Read-only)</h3>
          <p className="text-[13px] text-[#707070] mb-[12px]">
            Submissions from the public contact form appear here automatically.
          </p>
          <div className="overflow-x-auto">
            <div className="min-w-[900px]">
              <div className="grid grid-cols-[1fr_1.2fr_1fr_1fr_1.2fr_1fr] gap-[16px] px-[14px] py-[12px] bg-[#F5F5F5] rounded-t-[10px] border border-[rgba(34,34,34,0.08)]">
                <p className="text-[13px] font-[SemiBold]">Name</p>
                <p className="text-[13px] font-[SemiBold]">Email</p>
                <p className="text-[13px] font-[SemiBold]">Phone</p>
                <p className="text-[13px] font-[SemiBold]">Subject</p>
                <p className="text-[13px] font-[SemiBold]">Comments</p>
                <p className="text-[13px] font-[SemiBold]">Submitted</p>
              </div>
              {submissions.length === 0 ? (
                <div className="px-[14px] py-[16px] border border-t-0 border-[rgba(34,34,34,0.08)] text-[13px] text-[#707070]">
                  No submissions yet.
                </div>
              ) : (
                submissions.map((sub) => (
                  <div
                    key={sub.id}
                    className="grid grid-cols-[1fr_1.2fr_1fr_1fr_1.2fr_1fr] gap-[16px] px-[14px] py-[12px] border border-t-0 border-[rgba(34,34,34,0.08)]"
                  >
                    <p className="text-[13px]">{sub.name}</p>
                    <p className="text-[13px]">{sub.email}</p>
                    <p className="text-[13px]">{sub.phone || "—"}</p>
                    <p className="text-[13px]">{sub.subject || "—"}</p>
                    <p className="text-[13px] truncate" title={sub.comments}>
                      {sub.comments || "—"}
                    </p>
                    <p className="text-[13px]">{formatSubmittedAt(sub.submittedAt)}</p>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <SeoSection
          seo={{
            metaTitle: settings.seo?.metaTitle || "",
            metaDescription: settings.seo?.metaDescription || "",
            metaKeywords: settings.seo?.metaKeywords || "",
          }}
          onChange={(seo) => update("seo", seo)}
        />

        <SaveBar onSave={() => !saving && void handleSave()} />
      </div>
    </div>
  );
}

export default ContactUsSettings;
