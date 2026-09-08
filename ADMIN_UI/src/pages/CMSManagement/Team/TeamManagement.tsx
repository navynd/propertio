import { useCallback, useEffect, useState } from "react";
import { EditIcon, SearchIcon, TrashIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import Pagenation from "../../../components/Pagenation/Pagenation";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { teamService } from "../../../services/teamService";
import type { TeamMemberRecord, TeamPageSettings } from "../../../types/api";
import { defaultTeamPageSettings } from "../cmsData";
import { SaveBar, SeoSection, TextAreaField, TextField, sectionClass, sectionTitleClass } from "../shared/CmsFormShared";
import profileimg from "../../../assets/img/profileless.png";

const ADMIN_LIST_LIMIT = 5;
const emptySeo = defaultTeamPageSettings.seo;

function TeamManagement() {
    const navigate = useNavigate();
    const { push } = useToast();
    const [loading, setLoading] = useState(true);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [pageSettings, setPageSettings] = useState<TeamPageSettings>(defaultTeamPageSettings);
    const [members, setMembers] = useState<TeamMemberRecord[]>([]);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [search, setSearch] = useState("");
    const [searchInput, setSearchInput] = useState("");
    const [teamImgBaseUrl, setTeamImgBaseUrl] = useState("");

    const resolveImageSrc = (filename: string) => {
        const raw = (filename || "").trim();
        if (!raw) return "";
        if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:")) return raw;
        const base = teamImgBaseUrl.replace(/\/+$/, "");
        return base ? `${base}/${encodeURIComponent(raw)}` : raw;
    };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await teamService.getTeam({
                page: currentPage,
                limit: ADMIN_LIST_LIMIT,
                search: search || undefined,
            });
            setPageSettings({
                ...defaultTeamPageSettings,
                ...data.settings,
                seo: { ...emptySeo, ...data.settings?.seo },
            });
            setMembers(data.members || []);
            setTotalPages(data.pagination?.pages || 1);
            setTeamImgBaseUrl((data.mediaBaseUrl?.img || "").trim());
        } catch (error) {
            push({
                type: "error",
                title: "Failed to load team page",
                description: getApiErrorMessage(error, "Unable to fetch team CMS data."),
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
            await teamService.saveSettings(pageSettings, {
                page: currentPage,
                limit: ADMIN_LIST_LIMIT,
                search: search || undefined,
            });
            push({ type: "success", title: "Saved", description: "Team page settings saved." });
            await fetchData();
        } catch (error) {
            push({
                type: "error",
                title: "Save failed",
                description: getApiErrorMessage(error, "Unable to save team page settings."),
            });
        }
    };

    const handleDelete = async (memberId: string) => {
        if (!window.confirm("Delete this team member?")) return;
        setDeletingId(memberId);
        try {
            await teamService.deleteMember(memberId, {
                page: currentPage,
                limit: ADMIN_LIST_LIMIT,
                search: search || undefined,
            });
            push({ type: "success", title: "Deleted", description: "Team member removed." });
            await fetchData();
        } catch (error) {
            push({
                type: "error",
                title: "Delete failed",
                description: getApiErrorMessage(error, "Unable to delete team member."),
            });
        } finally {
            setDeletingId(null);
        }
    };

    if (loading && !members.length) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
                <Header title="Our Team" showBack={false} onBackClick={() => {}} />
                <Loader />
            </div>
        );
    }

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Header title="Our Team" showBack={false} onBackClick={() => {}} />

            <div className="mt-[20px]">
                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Page Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                        <TextField label="Page Title" value={pageSettings.pageTitle || ""} onChange={(v) => setPageSettings((p) => ({ ...p, pageTitle: v }))} required />
                        <TextField label="Items Per Page" value={String(pageSettings.itemsPerPage ?? 24)} onChange={(v) => setPageSettings((p) => ({ ...p, itemsPerPage: Number(v) || 24 }))} type="number" />
                        <div className="md:col-span-2">
                            <TextAreaField label="Page Subtitle" value={pageSettings.pageSubtitle || ""} onChange={(v) => setPageSettings((p) => ({ ...p, pageSubtitle: v }))} />
                        </div>
                    </div>
                    <SeoSection seo={pageSettings.seo || emptySeo} onChange={(seo) => setPageSettings((p) => ({ ...p, seo }))} />
                </div>

                <div className="p-[20px] bg-[#fff] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">
                    <div className="flex items-center justify-between mb-[30px] gap-[10px] flex-wrap">
                        <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[15px] px-[14px] h-[40px] w-full md:w-[280px]">
                            <SearchIcon className="text-[#707070] shrink-0" />
                            <input
                                type="search"
                                placeholder="Search by name, role, email or phone"
                                value={searchInput}
                                onChange={(e) => setSearchInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate("/cmsteamdetail")}
                            className="h-[40px] px-[18px] rounded-[10px] bg-[#6A3CA8] text-[#fff] text-[13px] font-[Bold] cursor-pointer"
                        >
                            + Add Team Member
                        </button>
                    </div>

                    <div className="overflow-x-auto w-full scrollbar-hide mb-[30px]">
                        <div className="min-w-[900px]">
                            <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                                <div className="grid grid-cols-[1.4fr_1.2fr_1.2fr_1fr_0.7fr_0.8fr] gap-[16px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Name</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Job Title</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Email</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Phone</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                                    <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                                </div>
                                {members.map((row) => (
                                    <div key={row.id} className="grid grid-cols-[1.4fr_1.2fr_1.2fr_1fr_0.7fr_0.8fr] gap-[16px] items-center px-[14px] py-[14px] border-b border-[rgba(34,34,34,0.06)]">
                                        <div className="flex items-center gap-[10px]">
                                            <img src={resolveImageSrc(row.profileImage) || profileimg} alt={row.fullName} className="w-[36px] h-[36px] rounded-full object-cover" />
                                            <p className="text-[13px] font-[Medium] text-[#222]">{row.fullName}</p>
                                        </div>
                                        <p className="text-[13px] font-[Regular] text-[#707070]">{row.jobTitle}</p>
                                        <p className="text-[13px] font-[Regular] text-[#707070] truncate">{row.email || "—"}</p>
                                        <p className="text-[13px] font-[Regular] text-[#707070]">{row.phone || "—"}</p>
                                        <span className={`text-[12px] font-[Medium] px-[10px] py-[4px] rounded-full w-fit ${row.isActive ? "bg-[#E8F5EE] text-[#05A666]" : "bg-[#F5F5F5] text-[#707070]"}`}>
                                            {row.isActive ? "Active" : "Inactive"}
                                        </span>
                                        <div className="flex items-center gap-[10px]">
                                            <button type="button" onClick={() => navigate(`/cmsteamdetail?id=${row.id}`)} className="cursor-pointer">
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
                                {!members.length && (
                                    <p className="text-center text-[#707070] text-[13px] py-[24px]">No team members found.</p>
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

export default TeamManagement;
