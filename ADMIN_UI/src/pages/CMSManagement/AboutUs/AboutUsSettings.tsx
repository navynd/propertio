import { useCallback, useEffect, useState } from "react";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useToast } from "../../../context/ToastContext";
import { aboutService } from "../../../services/aboutService";
import { getApiErrorMessage } from "../../../services/apiClient";
import type { AboutPageSettings, AboutTimelineEntry } from "../../../types/api";
import { defaultAboutUsSettings } from "../cmsData";
import {
    SaveBar,
    SeoSection,
    TextAreaField,
    TextField,
    sectionClass,
    sectionTitleClass,
} from "../shared/CmsFormShared";

const emptySeo = defaultAboutUsSettings.seo;

const TIMELINE_MONTHS = [
    "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
    "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

const timelineToInputDate = (entry: Pick<AboutTimelineEntry, "month" | "day" | "year">) => {
    const monthIndex = TIMELINE_MONTHS.indexOf(String(entry.month || "").trim().toUpperCase());
    const day = parseInt(String(entry.day || "").trim(), 10);
    const year = parseInt(String(entry.year || "").trim(), 10);
    if (monthIndex < 0 || !day || !year) return "";
    const month = String(monthIndex + 1).padStart(2, "0");
    const dayPart = String(day).padStart(2, "0");
    return `${year}-${month}-${dayPart}`;
};

const inputDateToTimeline = (dateValue: string): Pick<AboutTimelineEntry, "month" | "day" | "year"> => {
    if (!dateValue) return { month: "", day: "", year: "" };
    const [year, month, day] = dateValue.split("-");
    const monthIndex = parseInt(month, 10) - 1;
    if (monthIndex < 0 || monthIndex > 11 || !day || !year) {
        return { month: "", day: "", year: "" };
    }
    return {
        month: TIMELINE_MONTHS[monthIndex],
        day: String(parseInt(day, 10)),
        year,
    };
};

function AboutUsSettings() {
    const { push } = useToast();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [settings, setSettings] = useState<AboutPageSettings>(defaultAboutUsSettings);
    const [timeline, setTimeline] = useState<AboutTimelineEntry[]>([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await aboutService.getAbout();
            setSettings({
                ...defaultAboutUsSettings,
                ...data.settings,
                heroGalleryImages:
                    data.settings?.heroGalleryImages?.length === 3
                        ? data.settings.heroGalleryImages
                        : defaultAboutUsSettings.heroGalleryImages,
                seo: { ...emptySeo, ...data.settings?.seo },
            });
            setTimeline(data.timeline ?? []);
        } catch (error) {
            push({
                type: "error",
                title: "Failed to load About Us",
                description: getApiErrorMessage(error, "Unable to fetch about page data."),
            });
        } finally {
            setLoading(false);
        }
    }, [push]);

    useEffect(() => {
        void fetchData();
    }, [fetchData]);

    const update = <K extends keyof AboutPageSettings>(key: K, value: AboutPageSettings[K]) => {
        setSettings((prev) => ({ ...prev, [key]: value }));
    };

    const updateGalleryImage = (index: number, value: string) => {
        setSettings((prev) => {
            const images = [...(prev.heroGalleryImages || ["", "", ""])];
            images[index] = value;
            return { ...prev, heroGalleryImages: images };
        });
    };

    const updateTimelineEntry = (id: string, patch: Partial<AboutTimelineEntry>) => {
        setTimeline((prev) => prev.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)));
    };

    const updateTimelineDate = (id: string, dateValue: string) => {
        updateTimelineEntry(id, inputDateToTimeline(dateValue));
    };

    const addTimelineEntry = () => {
        const nextOrder = timeline.length ? Math.max(...timeline.map((e) => e.displayOrder)) + 1 : 1;
        setTimeline((prev) => [
            ...prev,
            {
                id: `new-${Date.now()}`,
                month: "",
                day: "",
                year: "",
                title: "",
                description: "",
                displayOrder: nextOrder,
            },
        ]);
    };

    const removeTimelineEntry = (id: string) => {
        setTimeline((prev) => prev.filter((entry) => entry.id !== id));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = await aboutService.saveAbout({ settings, timeline });
            setSettings({
                ...defaultAboutUsSettings,
                ...data.settings,
                seo: { ...emptySeo, ...data.settings?.seo },
            });
            setTimeline(data.timeline ?? []);
            push({
                type: "success",
                title: "About page saved",
                description: "About Us content updated successfully.",
            });
        } catch (error) {
            push({
                type: "error",
                title: "Save failed",
                description: getApiErrorMessage(error, "Could not save about page."),
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
            <Header title="About Us" showBack={false} onBackClick={() => {}} />

            <div className="mt-[20px]">
                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Hero Section</h3>
                    <div className="grid grid-cols-1 gap-[16px]">
                        <TextField
                            label="Eyebrow Label"
                            value={settings.heroEyebrow || ""}
                            onChange={(v) => update("heroEyebrow", v)}
                            placeholder="ABOUT US"
                        />
                        <TextField
                            label="Main Headline"
                            value={settings.heroHeadline || ""}
                            onChange={(v) => update("heroHeadline", v)}
                            required
                        />
                        <TextAreaField
                            label="Sub-headline"
                            value={settings.heroSubheadline || ""}
                            onChange={(v) => update("heroSubheadline", v)}
                            rows={2}
                        />
                        <TextField
                            label="Hero Background Image URL"
                            value={settings.heroBannerImage || ""}
                            onChange={(v) => update("heroBannerImage", v)}
                            placeholder="https://..."
                        />
                        <TextField
                            label="Scrolling Banner Text"
                            value={settings.bannerText || ""}
                            onChange={(v) => update("bannerText", v)}
                            placeholder="Unlock your potential"
                        />
                        {(settings.heroGalleryImages || ["", "", ""]).map((image, index) => (
                            <TextField
                                key={`gallery-${index}`}
                                label={`Hero Gallery Image ${index + 1} URL`}
                                value={image}
                                onChange={(v) => updateGalleryImage(index, v)}
                                placeholder="https://..."
                            />
                        ))}
                    </div>
                </div>

                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Business Services Section</h3>
                    <div className="grid grid-cols-1 gap-[16px]">
                        <TextField
                            label="Section Title"
                            value={settings.businessSectionTitle || ""}
                            onChange={(v) => update("businessSectionTitle", v)}
                        />
                        <TextAreaField
                            label="Paragraph 1"
                            value={settings.businessParagraph1 || ""}
                            onChange={(v) => update("businessParagraph1", v)}
                        />
                        <TextAreaField
                            label="Paragraph 2"
                            value={settings.businessParagraph2 || ""}
                            onChange={(v) => update("businessParagraph2", v)}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                            <TextField
                                label="Primary CTA Label"
                                value={settings.businessCtaPrimaryLabel || ""}
                                onChange={(v) => update("businessCtaPrimaryLabel", v)}
                            />
                            <TextField
                                label="Primary CTA URL"
                                value={settings.businessCtaPrimaryUrl || ""}
                                onChange={(v) => update("businessCtaPrimaryUrl", v)}
                            />
                            <TextField
                                label="Secondary CTA Label"
                                value={settings.businessCtaSecondaryLabel || ""}
                                onChange={(v) => update("businessCtaSecondaryLabel", v)}
                            />
                            <TextField
                                label="Secondary CTA URL"
                                value={settings.businessCtaSecondaryUrl || ""}
                                onChange={(v) => update("businessCtaSecondaryUrl", v)}
                            />
                        </div>
                    </div>
                </div>

                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Statistics Section</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-[16px]">
                        <TextField
                            label="Stat 1 Value"
                            value={settings.stat1Value || ""}
                            onChange={(v) => update("stat1Value", v)}
                            placeholder="100%"
                        />
                        <TextAreaField
                            label="Stat 1 Description"
                            value={settings.stat1Description || ""}
                            onChange={(v) => update("stat1Description", v)}
                            rows={2}
                        />
                        <TextField
                            label="Stat 2 Value"
                            value={settings.stat2Value || ""}
                            onChange={(v) => update("stat2Value", v)}
                            placeholder="90%"
                        />
                        <TextAreaField
                            label="Stat 2 Description"
                            value={settings.stat2Description || ""}
                            onChange={(v) => update("stat2Description", v)}
                            rows={2}
                        />
                        <TextField
                            label="Stat 3 Value"
                            value={settings.stat3Value || ""}
                            onChange={(v) => update("stat3Value", v)}
                            placeholder="10k+"
                        />
                        <TextAreaField
                            label="Stat 3 Description"
                            value={settings.stat3Description || ""}
                            onChange={(v) => update("stat3Description", v)}
                            rows={2}
                        />
                    </div>
                </div>

                <div className={sectionClass}>
                    <div className="flex items-center justify-between mb-[20px]">
                        <h3 className={sectionTitleClass + " mb-0"}>Our Success Timeline</h3>
                        <button
                            type="button"
                            onClick={addTimelineEntry}
                            className="h-[36px] px-[16px] rounded-[8px] border border-[#6A3CA8] text-[#6A3CA8] text-[13px] font-[SemiBold] cursor-pointer"
                        >
                            + Add entry
                        </button>
                    </div>
                    <TextField
                        label="Section Title"
                        value={settings.successSectionTitle || ""}
                        onChange={(v) => update("successSectionTitle", v)}
                    />
                    {timeline.map((entry, index) => (
                        <div
                            key={entry.id}
                            className="border border-[#EAEAEA] rounded-[10px] p-[16px] mb-[12px] mt-[16px]"
                        >
                            <div className="flex items-center justify-between mb-[12px]">
                                <p className="text-[14px] font-[Bold] text-[#222]">Entry {index + 1}</p>
                                <button
                                    type="button"
                                    onClick={() => removeTimelineEntry(entry.id)}
                                    className="text-[12px] text-[#EA3934] font-[SemiBold] cursor-pointer"
                                >
                                    Remove
                                </button>
                            </div>
                            <div className="grid grid-cols-1 gap-[12px]">
                                <TextField
                                    label="Date"
                                    type="date"
                                    value={timelineToInputDate(entry)}
                                    onChange={(v) => updateTimelineDate(entry.id, v)}
                                />
                                <div>
                                    <TextField
                                        label="Title"
                                        value={entry.title}
                                        onChange={(v) => updateTimelineEntry(entry.id, { title: v })}
                                    />
                                </div>
                                <div>
                                    <TextAreaField
                                        label="Description"
                                        value={entry.description}
                                        onChange={(v) => updateTimelineEntry(entry.id, { description: v })}
                                    />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Call to Action Section</h3>
                    <div className="grid grid-cols-1 gap-[16px]">
                        <TextField
                            label="Background Image URL"
                            value={settings.ctaBackgroundImage || ""}
                            onChange={(v) => update("ctaBackgroundImage", v)}
                            placeholder="https://..."
                        />
                        <TextField
                            label="Headline"
                            value={settings.ctaHeadline || ""}
                            onChange={(v) => update("ctaHeadline", v)}
                        />
                        <TextAreaField
                            label="Sub-headline"
                            value={settings.ctaSubheadline || ""}
                            onChange={(v) => update("ctaSubheadline", v)}
                            rows={2}
                        />
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                            <TextField
                                label="Button Label"
                                value={settings.ctaButtonLabel || ""}
                                onChange={(v) => update("ctaButtonLabel", v)}
                            />
                            <TextField
                                label="Button URL"
                                value={settings.ctaButtonUrl || ""}
                                onChange={(v) => update("ctaButtonUrl", v)}
                            />
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

export default AboutUsSettings;
