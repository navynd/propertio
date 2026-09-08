import { useCallback, useEffect, useState } from "react";
import { EditIcon, SearchIcon, TrashIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import Pagenation from "../../../components/Pagenation/Pagenation";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { testimonialService } from "../../../services/testimonialService";
import type { TestimonialRecord, TestimonialSectionSettings } from "../../../types/api";
import { defaultTestimonialSettings } from "../cmsData";
import { SaveBar, TextAreaField, TextField, sectionClass, sectionTitleClass } from "../shared/CmsFormShared";
import profileimg from "../../../assets/img/profileless.png";

const ADMIN_LIST_LIMIT = 5;

function TestimonialManagement() {
    const navigate = useNavigate();
    const { push } = useToast();
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [sectionSettings, setSectionSettings] = useState<TestimonialSectionSettings>(defaultTestimonialSettings);
    const [testimonials, setTestimonials] = useState<TestimonialRecord[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [imgBaseUrl, setImgBaseUrl] = useState("");

    const resolveImageSrc = (filename: string) => {
        const raw = (filename || "").trim();
        if (!raw) return "";
        if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:")) return raw;
        const base = imgBaseUrl.replace(/\/+$/, "");
        return base ? `${base}/${encodeURIComponent(raw)}` : raw;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await testimonialService.getTestimonials({
                page: currentPage,
                limit: ADMIN_LIST_LIMIT,
                search: search || undefined,
            });
            setSectionSettings({
                ...defaultTestimonialSettings,
                ...data.settings,
            });
            setTestimonials(data.testimonials || []);
            setTotalPages(data.pagination?.pages || 1);
            setImgBaseUrl((data.mediaBaseUrl?.img || "").trim());
        } catch (error) {
            push({
                type: "error",
                title: "Failed to load testimonials",
                description: getApiErrorMessage(error, "Unable to fetch testimonials CMS data."),
            });
        } finally {
            setLoading(false);
        }
    }, [currentPage, search, push]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSearch = () => {
        setCurrentPage(1);
        setSearch(searchInput.trim());
    };

    const handleSaveSettings = async () => {
        try {
            await testimonialService.saveSettings(sectionSettings, {
                page: currentPage,
                limit: ADMIN_LIST_LIMIT,
                search: search || undefined,
            });
            push({ type: "success", title: "Saved", description: "Testimonial section settings saved." });
            await fetchData();
        } catch (error) {
            push({
                type: "error",
                title: "Save failed",
                description: getApiErrorMessage(error, "Unable to save testimonial settings."),
            });
        }
    };

    const handleDelete = async (testimonialId: string) => {
        if (!window.confirm("Delete this testimonial?")) return;
        setDeletingId(testimonialId);
        try {
            await testimonialService.deleteTestimonial(testimonialId, {
                page: currentPage,
                limit: ADMIN_LIST_LIMIT,
                search: search || undefined,
            });
            push({ type: "success", title: "Deleted", description: "Testimonial removed." });
            await fetchData();
        } catch (error) {
            push({
                type: "error",
                title: "Delete failed",
                description: getApiErrorMessage(error, "Unable to delete testimonial."),
            });
        } finally {
            setDeletingId(null);
        }
    };

    if (loading && !testimonials.length) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
                <Header title="Testimonials" showBack={false} onBackClick={() => {}} />
                <Loader />
            </div>
        );
    }

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Header title="Testimonials" showBack={false} onBackClick={() => {}} />

            <div className="mt-[20px]">
                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Section Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                        <TextField
                            label="Section Title"
                            value={sectionSettings.sectionTitle || ""}
                            onChange={(v) => setSectionSettings((p) => ({ ...p, sectionTitle: v }))}
                            required
                        />
                        <div className="md:col-span-2">
                            <TextAreaField
                                label="Section Subtitle"
                                value={sectionSettings.sectionSubtitle || ""}
                                onChange={(v) => setSectionSettings((p) => ({ ...p, sectionSubtitle: v }))}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-[20px] bg-[#fff] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">
                    <div className="flex items-center justify-between mb-[30px] gap-[10px] flex-wrap">
                        <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[15px] px-[14px] h-[40px] w-full md:w-[280px]">
                            <SearchIcon className="text-[#707070] shrink-0" />
                            <input
                                type="search"
                                placeholder="Search by name, role or quote"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate("/cmstestimonialdetail")}
                            className="h-[40px] px-[18px] rounded-[10px] bg-[#6A3CA8] text-[#fff] text-[13px] font-[Bold] cursor-pointer"
                        >
                            + Add Testimonial
                        </button>
                    </div>

                    <div className="overflow-x-auto w-full scrollbar-hide mb-[30px]">
                        <div className="min-w-[900px]">
                            <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                                <div className="grid grid-cols-[1.2fr_1fr_1.6fr_0.6fr_0.7fr_0.8fr] gap-[16px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Name</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Role</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Quote</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Rating</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                                </div>
                                {testimonials.map((row) => (
                                    <div key={row.id} className="grid grid-cols-[1.2fr_1fr_1.6fr_0.6fr_0.7fr_0.8fr] gap-[16px] items-center px-[14px] py-[14px] border-b border-[rgba(34,34,34,0.06)]">
                                        <div className="flex items-center gap-[10px]">
                                            <img src={resolveImageSrc(row.image) || profileimg} alt={row.name} className="w-[36px] h-[36px] rounded-full object-cover" />
                                            <p className="text-[13px] font-[Medium] text-[#222]">{row.name}</p>
                                        </div>
                                        <p className="text-[13px] font-[Regular] text-[#707070]">{row.title || "—"}</p>
                                        <p className="text-[13px] font-[Regular] text-[#707070] truncate">{row.content}</p>
                                        <p className="text-[13px] font-[Regular] text-[#707070]">{row.rating ?? "—"}</p>
                                        <span className={`text-[12px] font-[Medium] px-[10px] py-[4px] rounded-full w-fit ${row.isActive ? "bg-[#E8F5EE] text-[#05A666]" : "bg-[#F5F5F5] text-[#707070]"}`}>
                                            {row.isActive ? "Active" : "Inactive"}
                                        </span>
                                        <div className="flex items-center gap-[10px]">
                                            <button type="button" onClick={() => navigate(`/cmstestimonialdetail?id=${row.id}`)} className="cursor-pointer">
                                                <EditIcon />
                                            </button>
                                            <button
                                                type="button"
                                                className="cursor-pointer disabled:opacity-50"
                                                disabled={deletingId === row.id}
                                                onClick={() => handleDelete(row.id)}
                                            >
                                                <TrashIcon />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                {!testimonials.length && (
                                    <p className="text-center text-[#707070] text-[13px] py-[24px]">No testimonials found.</p>
                                )}
                            </div>
                        </div>
                    </div>
                    <Pagenation currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>

                <SaveBar onSave={handleSaveSettings} />
            </div>
        </div>
    );
}

export default TestimonialManagement;
