import { useState, useRef, useEffect, useMemo } from "react";
import mainbg from "../../../assets/img/mainbg.png";
import {
    DownArrowIcon,
    SearchIcon,
    TrashIcon,
    PlusIcon,
    EyeDarkIcon,
    MultiUserIcon,
    EditIcon,
    LocationIcon,
} from "../../../components/CustomFile/icons";
import DeveloperHeader from "../../../components/Header/DeveloperHeader";
import { useLocation, useNavigate } from "react-router-dom";
import Pagenation from "../../../components/Pagenation/Pagenation";
import { developerService } from "../../../services/developerService";
import type {
    DeveloperProjectListItem,
    SortByProjectMasterItem,
    SupportedUrlsMasterData,
} from "../../../services/developerService";
import { toast } from "../../../services/toast";
import { API_BASE_URL, getApiErrorMessage } from "../../../services/apiClient";
import Loader from "../../../components/Loader/loader";
import { DeveloperTableEmptyState } from "../../../components/DeveloperTableEmptyState";
import Drafts from "./Drafts/Drafts";
import UnPublished from "./UnPublished/UnPublished";
import ActiveProject from "./ActiveProject/ActiveProject";
import SoldOut from "./SoldOut/SoldOut";

type ProjectFilter = "Unpublished" | "Drafts" | "Active projects" | "Soldout";
const filterTabs: ProjectFilter[] = ["Unpublished", "Drafts", "Active projects", "Soldout"];

const DEFAULT_SORT_OPTION: SortByProjectMasterItem = {
    name: "Featured",
    value: "featured",
};

const toApiSortValue = (masterSortValue: string) => {
    const normalized = masterSortValue?.toLowerCase();
    if (!normalized) return "featured";
    if (normalized === "featured" || normalized === "newest") return normalized;
    if (normalized === "price-low" || normalized === "price_asc") return "price_asc";
    if (normalized === "price-high" || normalized === "price_desc") return "price_desc";
    return "newest";
};

const toPublishStatus = (tab: ProjectFilter) => {
    if (tab === "Unpublished") return "unpublished";
    if (tab === "Drafts") return "draft";
    if (tab === "Active projects") return "published";
    return "soldout";
};

const toProjectTypeFilter = (subTab: ProjectTab): "ready" | "off-plan" | undefined => {
    if (subTab === "New") return "ready";
    if (subTab === "Off-plan") return "off-plan";
    return undefined;
};

const formatDate = (value?: string | null) => {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatPrice = (amount?: number, currency?: string) => {
    if (typeof amount !== "number" || Number.isNaN(amount)) return "-";
    const resolvedCurrency = currency || "AED";
    return `${amount.toLocaleString("en-US")} ${resolvedCurrency}`;
};

const formatProgressStatus = (value?: string | null) => {
    if (!value) return "-";
    return value
        .replace(/[_-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase()
        .replace(/^./, (char) => char.toUpperCase());
};

const getPrimaryImage = (project: DeveloperProjectListItem) => {
    const images = Array.isArray(project.images) ? project.images : [];
    const primary = images.find((img) => img?.isPrimary && img?.url);
    return primary?.url || images[0]?.url || null;
};

const getProjectTypeLabel = (projectType?: string, completionStatus?: string) => {
    const source = (projectType || completionStatus || "").toLowerCase();
    if (source === "ready") return "New";
    if (source === "off-plan") return "Off-plan";
    return "Unknown";
};

const statusPillClass = (tab: ProjectFilter, projectTypeLabel: string) => {
    if (tab === "Soldout") return "bg-rose-500/15 text-rose-400 border border-rose-500/30";
    if (projectTypeLabel === "New") return "bg-[#4ADE80]/15 text-[#4ADE80] border border-[#4ADE80]/30";
    if (projectTypeLabel === "Off-plan") return "bg-[#C9A96E]/15 text-[#C9A96E] border border-[#C9A96E]/30";
    return "bg-[#1F1F1F] text-[#F5F0E8] border border-[#2A2A2A]";
};

const extractProjectImgBase = (data: SupportedUrlsMasterData): string | null => {
    const candidates: Array<Record<string, unknown> | undefined> = [];
    if (data.supportedUrls && typeof data.supportedUrls === "object") {
        candidates.push(data.supportedUrls);
    }
    if (data.supportedurls && typeof data.supportedurls === "object") {
        candidates.push(data.supportedurls);
    }
    if (data.items && !Array.isArray(data.items) && typeof data.items === "object") {
        candidates.push(data.items);
    }
    if (Array.isArray(data.items)) {
        data.items.forEach((item) => {
            if (item && typeof item === "object") candidates.push(item);
        });
    }

    for (const candidate of candidates) {
        const projectUrl = candidate?.projectUrl;
        if (projectUrl && typeof projectUrl === "object") {
            const img = (projectUrl as Record<string, unknown>).img;
            if (typeof img === "string" && img.trim()) return img;
        }
    }

    return null;
};

const resolveTabFromQuery = (tab: string | null): ProjectFilter | null => {
    const normalized = String(tab || "").trim().toLowerCase();
    if (normalized === "drafts" || normalized === "draft") return "Drafts";
    if (normalized === "unpublished") return "Unpublished";
    if (normalized === "active" || normalized === "active-projects") return "Active projects";
    if (normalized === "soldout" || normalized === "sold-out") return "Soldout";
    return null;
};

const filterToTabQuery = (filter: ProjectFilter): string => {
    if (filter === "Unpublished") return "unpublished";
    if (filter === "Drafts") return "drafts";
    if (filter === "Active projects") return "active";
    return "soldout";
};

const resolveSubTabFromQuery = (subTab: string | null): ProjectTab => {
    const normalized = String(subTab ?? "").trim().toLowerCase();
    if (normalized === "new" || normalized === "ready") return "New";
    if (normalized === "off-plan" || normalized === "offplan") return "Off-plan";
    if (normalized === "all") return "All";
    return "All";
};

type ProjectTab = "All" | "New" | "Off-plan";
const subTabs: ProjectTab[] = ["All", "New", "Off-plan"];

const ProjectManagement = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [activeSubTab, setActiveSubTab] = useState<ProjectTab>("All");
    const [activeFilter, setActiveFilter] = useState<ProjectFilter>("Unpublished");
    const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
    const [isSortDropdownOpen, setIsSortDropdownOpen] = useState(false);
    const [selectedSort, setSelectedSort] = useState<SortByProjectMasterItem>(DEFAULT_SORT_OPTION);
    const [sortOptions, setSortOptions] = useState<SortByProjectMasterItem[]>([DEFAULT_SORT_OPTION]);
    const [searchText, setSearchText] = useState("");
    const [debouncedSearchText, setDebouncedSearchText] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [projects, setProjects] = useState<DeveloperProjectListItem[]>([]);
    const [isProjectsLoading, setIsProjectsLoading] = useState(true);
    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 1,
    });
    const [counts, setCounts] = useState({
        draft: 0,
        unpublished: 0,
        published: 0,
        soldout: 0,
    });
    const [projectImageBaseUrl, setProjectImageBaseUrl] = useState<string | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [projectsReloadKey, setProjectsReloadKey] = useState(0);
    const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
    const [isBulkDeleting, setIsBulkDeleting] = useState(false);
    const filterDropdownRef = useRef<HTMLDivElement>(null);
    const sortDropdownRef = useRef<HTMLDivElement>(null);

    const fallbackImageBase = useMemo(() => {
        const origin = API_BASE_URL.replace(/\/api\/?$/, "");
        return `${origin}/uploads/img/project/`;
    }, []);

    useEffect(() => {
        const timer = window.setTimeout(() => {
            setDebouncedSearchText(searchText.trim());
            setCurrentPage(1);
        }, 350);
        return () => window.clearTimeout(timer);
    }, [searchText]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target as Node)) {
                setIsFilterDropdownOpen(false);
            }
            if (sortDropdownRef.current && !sortDropdownRef.current.contains(event.target as Node)) {
                setIsSortDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        if (!params.get("tab")) {
            params.set("tab", "unpublished");
            navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
            return;
        }
        const tabFilter = resolveTabFromQuery(params.get("tab"));
        setActiveFilter(tabFilter ?? "Unpublished");
        const subParam = params.get("subTab") ?? params.get("subtab");
        setActiveSubTab(resolveSubTabFromQuery(subParam));

        if (params.has("search")) {
            setSearchText(params.get("search") ?? "");
        } else {
            setSearchText("");
        }
        setCurrentPage(1);
    }, [location.pathname, location.search, navigate]);

    useEffect(() => {
        developerService
            .getSortByProjectMasterData()
            .then((data) => {
                const incoming = data.sortByProject || data.sortbyproject || [];
                if (incoming.length) {
                    setSortOptions(incoming);
                    const preferred =
                        incoming.find((item) => item.value === "featured") || incoming[0];
                    setSelectedSort(preferred);
                }
            })
            .catch(() => {
                setSortOptions([DEFAULT_SORT_OPTION]);
                setSelectedSort(DEFAULT_SORT_OPTION);
            });
    }, []);

    useEffect(() => {
        let isMounted = true;

        developerService
            .getSupportedUrlsMasterData()
            .then((data) => {
                if (!isMounted) return;
                const resolved = extractProjectImgBase(data);
                setProjectImageBaseUrl((resolved || fallbackImageBase).replace(/\/?$/, "/"));
            })
            .catch(() => {
                if (!isMounted) return;
                setProjectImageBaseUrl(fallbackImageBase);
            });

        return () => {
            isMounted = false;
        };
    }, [fallbackImageBase]);

    useEffect(() => {
        setCurrentPage(1);
        setSelectedIds(new Set());
    }, [activeFilter, activeSubTab]);

    useEffect(() => {
        let isMounted = true;
        setIsProjectsLoading(true);

        developerService
            .getProjects({
                publishStatus: toPublishStatus(activeFilter),
                projectType:
                    activeFilter === "Unpublished" || activeFilter === "Active projects"
                        ? toProjectTypeFilter(activeSubTab)
                        : undefined,
                page: currentPage,
                limit: 5,
                search: debouncedSearchText || undefined,
                sortBy: toApiSortValue(selectedSort.value),
            })
            .then((data) => {
                if (!isMounted) return;
                setProjects(data.projects || []);
                setPagination(
                    data.pagination || {
                        total: 0,
                        page: 1,
                        limit: 5,
                        totalPages: 1,
                    }
                );
                if (data.counts) setCounts(data.counts);
            })
            .catch((error) => {
                if (!isMounted) return;
                setProjects([]);
                toast.error(error?.message || "Failed to load projects");
            })
            .finally(() => {
                if (!isMounted) return;
                setIsProjectsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [activeFilter, activeSubTab, currentPage, debouncedSearchText, selectedSort.value, projectsReloadKey]);

    const toProjectImageUrl = (project: DeveloperProjectListItem) => {
        const image = getPrimaryImage(project);
        if (!image) return mainbg;
        if (image.startsWith("http")) return image;
        const base = (projectImageBaseUrl || fallbackImageBase).replace(/\/?$/, "/");
        return `${base}${image}`;
    };

    const visibleRows = projects;
    const allVisibleSelected =
        visibleRows.length > 0 && visibleRows.every((project) => selectedIds.has(project._id));

    const toggleRow = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    const toggleSelectAllVisible = () => {
        if (allVisibleSelected) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                visibleRows.forEach((project) => next.delete(project._id));
                return next;
            });
        } else {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                visibleRows.forEach((project) => next.add(project._id));
                return next;
            });
        }
    };

    const resolveDetailsRoute = (tab: ProjectFilter, projectId: string) => {
        if (tab === "Unpublished") return `/developer/unpublished-project-details?projectId=${projectId}`;
        if (tab === "Drafts") return "/developer/add-project";
        if (tab === "Active projects") return `/developer/active-project-details?projectId=${projectId}`;
        return `/developer/soldout-project-details?projectId=${projectId}`;
    };

    const tabCount = (tab: ProjectFilter) => {
        if (tab === "Unpublished") return counts.unpublished;
        if (tab === "Drafts") return counts.draft;
        if (tab === "Active projects") return counts.published;
        return counts.soldout;
    };

    const handleFilterChange = (
        nextFilter: ProjectFilter,
        source: "tabs" | "dropdown"
    ) => {
        if (source === "dropdown") {
            setIsFilterDropdownOpen(false);
        }
        const params = new URLSearchParams(location.search);
        params.set("tab", filterToTabQuery(nextFilter));
        params.delete("subTab");
        params.delete("subtab");
        navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    };

    const handleSubTabChange = (nextSub: ProjectTab) => {
        const params = new URLSearchParams(location.search);
        params.set("tab", filterToTabQuery(activeFilter));
        if (nextSub === "All") {
            params.delete("subTab");
            params.delete("subtab");
        } else {
            params.set("subTab", nextSub === "New" ? "new" : "off-plan");
        }
        navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
    };

    const canToolbarBulkDelete = activeFilter === "Unpublished" && selectedIds.size > 0;

    const handleDeleteOne = async (projectId: string, projectName: string) => {
        // if (!window.confirm(`Permanently delete "${projectName || "this project"}"? This cannot be undone.`)) return;
        setDeletingProjectId(projectId);
        try {
            await developerService.deleteProject(projectId);
            toast.success("Project deleted", "The project has been permanently deleted.");
            setSelectedIds((prev) => {
                const next = new Set(prev);
                next.delete(projectId);
                return next;
            });
            setProjectsReloadKey((k) => k + 1);
        } catch (err: unknown) {
            toast.error("Delete failed", getApiErrorMessage(err, "Could not delete project"));
        } finally {
            setDeletingProjectId(null);
        }
    };

    const handleBulkDelete = async () => {
        if (!canToolbarBulkDelete) return;
        const ids = Array.from(selectedIds);
        if (!window.confirm(`Permanently delete ${ids.length} project(s)? This cannot be undone.`)) return;
        setIsBulkDeleting(true);
        let deleted = 0;
        try {
            for (const id of ids) {
                await developerService.deleteProject(id);
                deleted += 1;
            }
            toast.success(deleted === 1 ? "Project deleted" : "Projects deleted");
            setSelectedIds(new Set());
            setProjectsReloadKey((k) => k + 1);
        } catch (err: unknown) {
            toast.error("Delete failed", getApiErrorMessage(err, "Could not delete project"));
            if (deleted > 0) {
                setSelectedIds(new Set());
                setProjectsReloadKey((k) => k + 1);
            }
        } finally {
            setIsBulkDeleting(false);
        }
    };

    return (
        <div className="px-4 pb-8 pt-5 sm:px-6 lg:px-8 max-w-[1600px] mx-auto flex flex-col gap-6">
            {/* Header */}
            <DeveloperHeader
                title="Project Management"
                showBack={false}
                onBackClick={() => { }}
            />

            <div className="rounded-[24px] bg-[#111111] border border-[#2A2A2A] shadow-xl min-w-0 overflow-hidden">
                {/* Toolbar */}
                <div className="p-6 md:p-7 flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between border-b border-[#2A2A2A]">
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Desktop Filter tabs */}
                        <div className="hidden xl:flex items-center gap-1.5 p-1 bg-[#1A1A1A] border border-[#2A2A2A] rounded-full">
                            {filterTabs.map((label) => (
                                <button
                                    key={label}
                                    type="button"
                                    onClick={() => handleFilterChange(label, "tabs")}
                                    className={`shrink-0 rounded-full px-4 h-[32px] text-[12px] font-[SemiBold] transition-all flex items-center justify-center cursor-pointer ${activeFilter === label
                                        ? "bg-[#C9A96E] text-[#0A0A0A] font-[Bold] shadow-md shadow-[#C9A96E]/20"
                                        : "text-[#A89880] hover:text-[#F5F0E8]"
                                        }`}
                                >
                                    {label} ({tabCount(label)})
                                </button>
                            ))}
                        </div>
                        {/* Mobile / tablet filter dropdown */}
                        <div className="relative w-full sm:w-auto xl:hidden" ref={filterDropdownRef}>
                            <button
                                type="button"
                                onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
                                className="w-full sm:w-auto h-[38px] rounded-full border border-[#2A2A2A] bg-[#171717] px-4 text-[12px] font-[SemiBold] text-[#F5F0E8] inline-flex items-center justify-between gap-2 min-w-[160px] cursor-pointer"
                            >
                                <span>{activeFilter} ({tabCount(activeFilter)})</span>
                                <DownArrowIcon width={11} height={7} className={`transition-transform duration-200 ${isFilterDropdownOpen ? "rotate-180" : ""}`} />
                            </button>
                            {isFilterDropdownOpen && (
                                <div className="absolute left-0 top-[44px] z-20 w-full min-w-[180px] bg-[#171717] border border-[#2A2A2A] rounded-[14px] shadow-2xl py-1.5 flex flex-col">
                                    {filterTabs.map((label) => (
                                        <button
                                            key={`filter-${label}`}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleFilterChange(label, "dropdown");
                                            }}
                                            className={`px-4 py-2 text-left text-[12px] font-[Medium] hover:bg-[#2A2A2A] transition-colors ${activeFilter === label ? "text-[#C9A96E] font-[SemiBold] bg-[#1F1F1F]" : "text-[#A89880]"}`}
                                        >
                                            {label} ({tabCount(label)})
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        {/* Search input */}
                        <div className="flex items-center gap-2.5 bg-[#171717] border border-[#2A2A2A] rounded-full px-4 h-[38px] w-full sm:w-[240px] focus-within:border-[#C9A96E]/50 transition-colors">
                            <SearchIcon className="text-[#A89880] shrink-0 w-4 h-4" />
                            <input
                                type="search"
                                placeholder="Search projects..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                className="w-full bg-transparent text-[12px] font-[Medium] text-[#F5F0E8] placeholder:text-[#6B6259] focus:outline-none"
                            />
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2.5">
                        {/* Sort by button */}
                        <div className="flex items-center gap-2 shrink-0">
                            <span className="text-[#A89880] text-[12px] font-[Medium] whitespace-nowrap">Sort:</span>
                            <div className="relative" ref={sortDropdownRef}>
                                <button
                                    type="button"
                                    onClick={() => setIsSortDropdownOpen(!isSortDropdownOpen)}
                                    className="flex items-center justify-between gap-2 border border-[#2A2A2A] bg-[#171717] rounded-full px-3.5 h-[34px] cursor-pointer min-w-[110px] hover:border-[#C9A96E]/40 transition-colors"
                                >
                                    <span className="text-[#F5F0E8] text-[12px] font-[SemiBold]">{selectedSort.name}</span>
                                    <DownArrowIcon className={`w-3 h-3 text-[#A89880] transition-transform duration-200 ${isSortDropdownOpen ? "rotate-180" : ""}`} />
                                </button>
                                {isSortDropdownOpen && (
                                    <div className="absolute right-0 top-[40px] w-full min-w-[140px] bg-[#171717] border border-[#2A2A2A] rounded-[14px] shadow-2xl py-1.5 z-20 flex flex-col max-h-[200px] overflow-y-auto">
                                        {sortOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                type="button"
                                                onMouseDown={(e) => {
                                                    e.preventDefault();
                                                    setSelectedSort(option);
                                                    setIsSortDropdownOpen(false);
                                                }}
                                                className={`px-4 py-2 text-left text-[12px] font-[Medium] cursor-pointer hover:bg-[#2A2A2A] transition-colors ${selectedSort.value === option.value ? "text-[#C9A96E] font-[SemiBold] bg-[#1F1F1F]" : "text-[#A89880]"
                                                    }`}
                                            >
                                                {option.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Delete button (bulk: unpublished list only) */}
                        {canToolbarBulkDelete && (
                            <button
                                type="button"
                                disabled={!canToolbarBulkDelete || isBulkDeleting}
                                onClick={() => void handleBulkDelete()}
                                className="flex items-center gap-1.5 px-3.5 h-[34px] rounded-full text-[12px] font-[SemiBold] text-rose-400 bg-rose-500/10 border border-rose-500/20 hover:bg-rose-500/20 disabled:opacity-50 transition-colors cursor-pointer"
                            >
                                <TrashIcon width={14} height={14} />
                                {isBulkDeleting ? "Deleting…" : "Delete"}
                            </button>
                        )}
                        {/* Add project button */}
                        <button
                            type="button"
                            onClick={() => {
                                navigate("/developer/add-project");
                            }}
                            className="cursor-pointer inline-flex items-center justify-center gap-2 rounded-full bg-[#C9A96E] hover:bg-[#E4C98B] text-[#0A0A0A] px-4 h-[36px] text-[12px] font-[Bold] shrink-0 shadow-md shadow-[#C9A96E]/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <PlusIcon width={14} height={14} className="text-[#0A0A0A]" />
                            <span>Add project</span>
                        </button>
                    </div>
                </div>

                {/* Sub-tabs */}
                {(activeFilter === "Unpublished" || activeFilter === "Active projects") && (
                    <div className="px-6 md:px-7 pt-2">
                        <div className="border-b border-[#2A2A2A] flex gap-6">
                            {subTabs.map((tab) => {
                                const active = activeSubTab === tab;
                                return (
                                    <button
                                        key={tab}
                                        type="button"
                                        onClick={() => handleSubTabChange(tab)}
                                        className={`relative py-3.5 px-2 text-[13px] font-[SemiBold] cursor-pointer transition-colors ${active ? "text-[#C9A96E]" : "text-[#A89880] hover:text-[#F5F0E8]"
                                            }`}
                                    >
                                        {tab}
                                        {active && <span className="absolute left-0 right-0 bottom-0 h-[2.5px] rounded-t-full bg-[#C9A96E]" />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="md:p-[0px_30px] p-[20px]">
                    {activeFilter === "Drafts" ? (
                        <div className="relative">
                            {isProjectsLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0A0A]/70 backdrop-blur-sm rounded-[10px]">
                                    <Loader size={72} margin={0} />
                                </div>
                            )}

                            <div className="flex flex-col gap-[15px]">
                                {!isProjectsLoading && visibleRows.length === 0 && (
                                    <DeveloperTableEmptyState message="No projects found for this filter." />
                                )}

                                {visibleRows.map((project) => (
                                    <div
                                        key={project._id}
                                        className="rounded-[15px] bg-[#171717] border border-[#2A2A2A] md:p-[30px] p-[20px] grid grid-cols-1 md:grid-cols-[auto_auto_auto] gap-[12px] items-center"
                                    >
                                        {(() => {
                                            const totalSteps = project.draftProgress?.totalSteps ?? 6;
                                            const completedSteps = project.draftProgress?.completedSteps ?? 2;
                                            const remainingSteps =
                                                project.draftProgress?.remainingSteps ??
                                                Math.max(0, totalSteps - completedSteps);
                                            const progressPercentage = Math.max(
                                                0,
                                                Math.min(100, project.draftProgress?.progressPercentage ?? 33.33)
                                            );
                                            const progressMessage =
                                                project.draftProgress?.message ||
                                                `Remaining steps to complete : ${remainingSteps}/${totalSteps}`;

                                            return (
                                                <>
                                                    <div>
                                                        <p className="text-[14px] leading-[1.2] text-[#F5F0E8] font-[Bold] mb-[7px]">
                                                            {project.projectName || "-"}
                                                        </p>
                                                        <p className="text-[12px] leading-[1.2] text-[#A89880] font-[Regular]">
                                                            Created on {formatDate(project.createdAt)}
                                                        </p>
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="text-[12px] leading-[1.2] text-[#F5F0E8] font-[Regular] mb-[8px]">
                                                            {progressMessage}
                                                        </p>
                                                        <div className="h-[6px] w-full rounded-full bg-[#2A2A2A] overflow-hidden">
                                                            <div
                                                                className="h-full rounded-full bg-[#C9A96E]"
                                                                style={{ width: `${progressPercentage}%` }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="flex items-center justify-end gap-[8px]">
                                                        <button
                                                            type="button"
                                                            className="p-[6px] rounded-[8px] hover:bg-[#2A2A2A] text-[#A89880] hover:text-[#C9A96E] transition-colors"
                                                            aria-label="Edit draft"
                                                            onClick={() => navigate(`/developer/edit-project?projectId=${project._id}&mode=draft`)}
                                                        >
                                                            <EditIcon width={20} height={20} />
                                                        </button>
                                                        <button
                                                            type="button"
                                                            disabled={deletingProjectId === project._id}
                                                            className="p-[6px] rounded-[8px] hover:bg-rose-500/20 text-[#A89880] hover:text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            aria-label="Delete draft"
                                                            onClick={() =>
                                                                void handleDeleteOne(
                                                                    project._id,
                                                                    project.projectName || "Draft"
                                                                )
                                                            }
                                                        >
                                                            <TrashIcon width={20} height={20} />
                                                        </button>
                                                    </div>
                                                </>
                                            );
                                        })()}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="overflow-x-auto w-full scrollbar-hide relative">
                            {isProjectsLoading && (
                                <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0A0A0A]/70 backdrop-blur-sm rounded-[10px]">
                                    <Loader size={72} margin={0} />
                                </div>
                            )}
                            <div className="min-w-[1270px] rounded-[16px] border border-[#2A2A2A] overflow-hidden bg-[#111111]">
                                <div className="grid grid-cols-[40px_2.3fr_1.3fr_1.3fr_1.3fr_1.3fr_1.3fr] gap-2 items-center px-[14px] py-[12px] bg-[#171717] border-b border-[#2A2A2A]">
                                    <div className="flex justify-center">
                                        <input
                                            type="checkbox"
                                            checked={allVisibleSelected}
                                            onChange={toggleSelectAllVisible}
                                            className="h-[15px] w-[15px] rounded-[5px] border border-[#2A2A2A] accent-[#C9A96E] cursor-pointer"
                                        />
                                    </div>
                                    <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Project Details</p>
                                    <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Project type</p>
                                    <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Created date</p>
                                    <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Available units</p>
                                    <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Price</p>
                                    <p className="text-[13px] font-[Bold] text-[#A89880] uppercase tracking-wider">Actions</p>
                                </div>

                                {!isProjectsLoading && visibleRows.length === 0 && (
                                    <DeveloperTableEmptyState message="No projects found for this filter." />
                                )}

                                {visibleRows.map((project, index) => {
                                    const projectTypeLabel = getProjectTypeLabel(
                                        project.projectType,
                                        project.completionStatus
                                    );
                                    const locationLabel = [project.location?.city, project.location?.zone]
                                        .filter(Boolean)
                                        .join(", ");

                                    return (
                                        <div
                                            key={project._id}
                                            className={`grid grid-cols-[40px_2.3fr_1.3fr_1.3fr_1.3fr_1.3fr_1.3fr] gap-2 items-center px-[14px] py-[12px] hover:bg-[#171717]/60 transition-colors ${index !== visibleRows.length - 1 ? "border-b border-[#2A2A2A]" : ""
                                                }`}
                                        >
                                            <div className="flex justify-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.has(project._id)}
                                                    onChange={() => toggleRow(project._id)}
                                                    className="h-[15px] w-[15px] rounded-[5px] border border-[#2A2A2A] accent-[#C9A96E] cursor-pointer"
                                                />
                                            </div>

                                            <div className="flex items-center gap-[12px] min-w-0">
                                                <div className="w-[56px] h-[56px] rounded-[8px] overflow-hidden shrink-0 border border-[#2A2A2A] bg-[#171717]">
                                                    <img
                                                        src={toProjectImageUrl(project)}
                                                        alt={project.projectName || "Project"}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="text-[13px] font-[Bold] text-[#F5F0E8] leading-[1.3] mb-[4px] truncate">
                                                        {project.projectName || "-"}
                                                    </p>
                                                    <p className="text-[12px] font-[Regular] text-[#A89880] flex items-center gap-[5px] leading-[1.2]">
                                                        <span className="inline-flex shrink-0 text-[#C9A96E]">
                                                            <LocationIcon width={11} height={15} />
                                                        </span>
                                                        <span className="truncate">{locationLabel || "-"}</span>
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="flex">
                                                <span
                                                    className={`inline-flex items-center rounded-[6px] h-[22px] px-2.5 text-[11px] font-[SemiBold] capitalize ${statusPillClass(activeFilter, projectTypeLabel)}`}
                                                >
                                                    {activeFilter === "Soldout" ? "Sold out" : projectTypeLabel}
                                                </span>
                                            </div>

                                            <p className="text-[12px] font-[Regular] text-[#F5F0E8]">
                                                {formatDate(project.createdAt)}
                                            </p>

                                            <p className="text-[12px] font-[Regular] text-[#F5F0E8]">
                                                {typeof project.availableUnits === "number" ? project.availableUnits : "-"}
                                            </p>

                                            <p className="text-[12px] font-[Regular] text-[#F5F0E8] whitespace-nowrap">
                                                {formatPrice(
                                                    project.launchPrice?.startingFrom,
                                                    project.launchPrice?.currency
                                                )}
                                            </p>

                                            <div className="flex items-center gap-[6px]">
                                                <button
                                                    onClick={() => navigate(resolveDetailsRoute(activeFilter, project._id))}
                                                    type="button"
                                                    className="cursor-pointer p-[6px] rounded-[8px] text-[#A89880] hover:text-[#C9A96E] hover:bg-[#171717] transition-colors"
                                                    aria-label="View"
                                                >
                                                    <EyeDarkIcon width={20} height={20} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        navigate(
                                                            `/developer/assign-agencies?projectId=${encodeURIComponent(project._id)}`
                                                        )
                                                    }
                                                    className="cursor-pointer p-[6px] rounded-[8px] text-[#A89880] hover:text-[#C9A96E] hover:bg-[#171717] transition-colors"
                                                    aria-label="Team"
                                                >
                                                    <MultiUserIcon width={20} height={20} />
                                                </button>
                                                <button
                                                    type="button"
                                                    className="cursor-pointer p-[6px] rounded-[8px] text-[#A89880] hover:text-[#C9A96E] hover:bg-[#171717] transition-colors"
                                                    aria-label="Edit"
                                                    onClick={() => navigate(`/developer/edit-project?projectId=${project._id}`)}
                                                >
                                                    <EditIcon width={20} height={20} />
                                                </button>
                                                {activeFilter === "Unpublished" && (
                                                    <button
                                                        type="button"
                                                        disabled={deletingProjectId === project._id}
                                                        className="cursor-pointer p-[6px] rounded-[8px] text-rose-400 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-500/20 transition-colors"
                                                        aria-label="Delete"
                                                        onClick={() =>
                                                            void handleDeleteOne(
                                                                project._id,
                                                                project.projectName || "Project"
                                                            )
                                                        }
                                                    >
                                                        <TrashIcon width={20} height={20} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
                {/* <div className="">
                    {activeFilter === "Drafts" ? (
                        <Drafts />
                    ) : activeFilter === "Unpublished" ? (
                        <UnPublished />
                    ) : activeFilter === "Active projects" ? (
                        <ActiveProject />
                    ) : (
                        <SoldOut />
                    )}
                </div> */}

                <div className="px-[20px] md:px-[30px] pb-[20px] md:pb-[30px]">
                    <Pagenation
                        currentPage={pagination.page || currentPage}
                        totalPages={pagination.totalPages}
                        onPageChange={setCurrentPage}
                    />
                </div>
            </div>
        </div >
    );
};

export default ProjectManagement;
{/**
                                         * Draft progress now comes from GET /developers/projects as `draftProgress`.
                                         * We keep defensive fallbacks so UI still renders if any project lacks this payload.
                                         */}