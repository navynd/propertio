import { useEffect, useMemo, useState } from "react";
import { SearchIcon, DownArrowIcon, TrashIcon, EyeDarkIcon } from "../../../../components/CustomFile/icons";
import home1img from "../../../../assets/img/home1.png";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import { useNavigate, useSearchParams } from "react-router-dom";
import Loader from "../../../../components/Loader/loader";
import { agentService, type AgentAllocatedProjectListItem, type AgentSortByProjectMasterItem } from "../../../../services/agentService";
import { toast } from "../../../../services/toast";

const ALLOCATED_PROJECT_SEARCH_DEBOUNCE_MS = 400;

type Row = {
    id: string;
    projectName: string;
    location: string;
    image: string;
    projectStatus: string;
    announcedDate: string;
    progressStatus: string;
    expectedCompletionDate: string;
};

const formatDate = (value?: string | null) => {
    if (!value) return "--/--";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "--/--";
    return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const toUiStatus = (status?: string) => {
    if (status === "ready") return "New";
    if (status === "off-plan") return "Off-plan";
    return status || "-";
};

const formatText = (value?: string | null) => {
    if (!value) return "--/--";
    return value
        .split("-")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
};

function statusChipClass(status: string) {
    if (status === "New") return "bg-[rgba(0,166,99,0.10)] text-[#00A663]";
    return "bg-[rgba(234,57,52,0.10)] text-[#EA3934]";
}

const toImageUrl = (image?: string, baseUrl?: string) => {
    if (!image) return home1img;
    if (image.startsWith("http://") || image.startsWith("https://")) return image;
    if (!baseUrl) return image;
    return `${baseUrl.replace(/\/?$/, "/")}${image}`;
};

const mapProject = (project: AgentAllocatedProjectListItem, baseUrl?: string): Row => {
    const city = project.location?.city?.trim();
    const zone = project.location?.zone?.trim();
    return {
        id: String(project.projectId || ""),
        projectName: project.projectName || "-",
        location: [city, zone].filter(Boolean).join(", ") || "-",
        image: toImageUrl(project.image?.url, baseUrl),
        projectStatus: toUiStatus(project.projectStatus),
        announcedDate: formatDate(project.announcedDate),
        progressStatus: formatText(project.progressStatus),
        expectedCompletionDate: formatDate(project.expectedCompletionDate),
    };
};

const AllocatedProject = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const [subTab, setSubTab] = useState<"All" | "New" | "Off-plan">("All");
    const [searchInput, setSearchInput] = useState(
        () => searchParams.get("search")?.trim() ?? "",
    );
    const [debouncedSearch, setDebouncedSearch] = useState(
        () => searchParams.get("search")?.trim() ?? "",
    );
    const [sortBy, setSortBy] = useState("featured");
    const [sortOptions, setSortOptions] = useState<AgentSortByProjectMasterItem[]>([
        { name: "Featured", value: "featured" },
        { name: "Newest", value: "newest" },
        { name: "Oldest", value: "oldest" },
    ]);
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [rows, setRows] = useState<Row[]>([]);
    const [tabCounts, setTabCounts] = useState({ all: 0, new: 0, offPlan: 0 });
    const [totalItems, setTotalItems] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [projectImageBaseUrl, setProjectImageBaseUrl] = useState("");
    const itemsPerPage = 10;

    const selectedSortName = useMemo(
        () => sortOptions.find((opt) => opt.value === sortBy)?.name || "Featured",
        [sortBy, sortOptions]
    );

    const emptyTableMessage = useMemo(() => {
        if (debouncedSearch.trim()) return "No matching projects found.";
        if (subTab === "New") return "No new projects found.";
        if (subTab === "Off-plan") return "No off-plan projects found.";
        return "No data found.";
    }, [debouncedSearch, subTab]);

    useEffect(() => {
        void (async () => {
            try {
                const [sortRes, supportedRes] = await Promise.all([
                    agentService.getSortByProjectMasterData(),
                    agentService.getSupportedUrlsMasterData(),
                ]);
                const sortList = sortRes.sortByProject || sortRes.sortbyproject || [];
                if (sortList.length) setSortOptions(sortList);
                const anySupported = supportedRes as unknown as {
                    supportedUrls?: { projectUrl?: { img?: string } };
                    supportedurls?: { projectUrl?: { img?: string } };
                    projectUrl?: { img?: string };
                };
                const baseUrl =
                    anySupported?.supportedUrls?.projectUrl?.img ||
                    anySupported?.supportedurls?.projectUrl?.img ||
                    anySupported?.projectUrl?.img ||
                    "";
                setProjectImageBaseUrl(baseUrl);
            } catch {
                // keep defaults when master-data fetch fails
            }
        })();
    }, []);

    useEffect(() => {
        const urlSearch = searchParams.get("search")?.trim() ?? "";
        setSearchInput((current) => (current === urlSearch ? current : urlSearch));
    }, [searchParams]);

    useEffect(() => {
        const id = window.setTimeout(() => setDebouncedSearch(searchInput), ALLOCATED_PROJECT_SEARCH_DEBOUNCE_MS);
        return () => window.clearTimeout(id);
    }, [searchInput]);

    useEffect(() => {
        setCurrentPage(1);
    }, [subTab, debouncedSearch, sortBy]);

    useEffect(() => {
        const fetchProjects = async () => {
            setIsLoading(true);
            try {
                const subTabValue = subTab === "All" ? "all" : subTab === "New" ? "new" : "off-plan";
                const response = await agentService.getAllocatedProjects({
                    subTab: subTabValue,
                    search: debouncedSearch,
                    sortBy,
                    page: currentPage,
                    limit: itemsPerPage,
                });
                setRows((response.projects || []).map((item) => mapProject(item, projectImageBaseUrl)));
                setTabCounts(response.tabs || { all: 0, new: 0, offPlan: 0 });
                setTotalItems(response.pagination?.totalProjects || 0);
            } catch (error: unknown) {
                const message = (error as { message?: string })?.message || "Failed to fetch projects.";
                toast.error("Fetch failed", message);
            } finally {
                setIsLoading(false);
            }
        };
        void fetchProjects();
    }, [currentPage, itemsPerPage, projectImageBaseUrl, debouncedSearch, sortBy, subTab]);

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col gap-[18px]">
                {/* Search + sort */}
                <div className="flex flex-wrap items-center justify-between gap-[12px]">
                    <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] w-full sm:w-[315px]">
                        <SearchIcon className="text-[#707070] shrink-0" />
                        <input
                            type="search"
                            placeholder="Search here"
                            value={searchInput}
                            onChange={(e) => {
                                const value = e.target.value;
                                setSearchInput(value);
                                const next = new URLSearchParams(searchParams);
                                const trimmed = value.trim();
                                if (trimmed) next.set("search", trimmed);
                                else next.delete("search");
                                setSearchParams(next, { replace: true });
                            }}
                            className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                        />
                    </div>

                    <div className="flex items-center gap-[10px]">
                        <span className="text-[12px] text-[#707070] font-[Regular]">Sort by:</span>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsSortOpen((o) => !o)}
                                className="cursor-pointer inline-flex items-center gap-[8px] h-[33px] px-[12px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white text-[12px] font-[SemiBold] text-[#222]"
                            >
                                {selectedSortName} <DownArrowIcon width={10} height={6} />
                            </button>
                            {isSortOpen && (
                                <div className="absolute right-0 top-[38px] z-30 w-[160px] bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px] max-h-[200px] overflow-y-auto scrollbar-hide">
                                    {sortOptions.map((opt) => (
                                        <button
                                            key={opt.value}
                                            type="button"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                setSortBy(opt.value);
                                                setIsSortOpen(false);
                                            }}
                                            className="w-full px-[12px] py-[9px] text-left text-[12px] font-[Medium] hover:bg-[#F5F5F5] text-[#222]"
                                        >
                                            {opt.name}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Secondary tabs */}
                <div className="border-b border-[rgba(34,34,34,0.10)] -mx-[20px] px-[20px] md:-mx-[30px] md:px-[30px] overflow-x-auto overflow-y-hidden scrollbar-hide">
                    <div className="flex min-w-full w-max flex-nowrap gap-[28px]">
                        {(["All", "New", "Off-plan"] as const).map((t) => {
                            const active = subTab === t;
                            return (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setSubTab(t)}
                                    className={`relative shrink-0 cursor-pointer whitespace-nowrap p-[20px_30px] text-[13px] transition-colors ${active ? "text-[#0832AE] font-[SemiBold]" : "text-[#222] font-[Regular]"}`}
                                >
                                    {t}
                                    {/* <span className="ml-[6px] text-[13px] font-[Regular] text-[#707070]">
                                        (
                                        {t === "All"
                                            ? tabCounts.all
                                            : t === "New"
                                                ? tabCounts.new
                                                : tabCounts.offPlan}
                                        )
                                    </span> */}
                                    {active && <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full bg-[#0832AE]" />}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto w-full scrollbar-hide">
                    <div className="min-w-[1350px]">
                        <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                            <div className="grid grid-cols-[2.3fr_1.3fr_1.3fr_1.5fr_1.8fr_0.9fr] gap-[20px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Project Details</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Project status</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Announced date</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Progress status</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Expected Completion date</p>
                                <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                            </div>

                            <div>
                                {!isLoading && rows.length === 0 ? (
                                    <div className="flex min-h-[220px] w-full items-center justify-center px-[14px] py-[32px]">
                                        <p className="text-[14px] font-[Medium] text-[#707070] text-center">
                                            {emptyTableMessage}
                                        </p>
                                    </div>
                                ) : (
                                rows.map((row, idx) => (
                                    <div
                                        key={row.id}
                                        className={`grid grid-cols-[2.3fr_1.3fr_1.3fr_1.5fr_1.8fr_0.9fr] gap-[20px] items-center px-[14px] py-[12px] ${idx !== rows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                                    >
                                        <div className="flex items-center gap-[10px] min-w-0">
                                            <div className="h-[54px] w-[54px] shrink-0 overflow-hidden rounded-[10px] bg-[#F5F5F5]">
                                                <img src={row.image} alt="" className="h-full w-full object-cover" />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[12px] font-[Bold] text-[#222] leading-[1.2] truncate mb-[4px]">{row.projectName}</p>
                                                <p className="text-[12px] font-[Regular] text-[#707070] leading-[1.2] truncate">{row.location}</p>
                                            </div>
                                        </div>

                                        <span className={`inline-flex items-center justify-center h-[22px] px-[10px] rounded-full text-[12px] font-[SemiBold] w-fit ${statusChipClass(row.projectStatus)}`}>
                                            {row.projectStatus}
                                        </span>

                                        <p className="text-[12px] font-[Regular] text-[#222]">{row.announcedDate}</p>

                                        <span className="inline-flex items-center justify-center h-[26px] px-[10px] rounded-[6px] border border-[rgba(34,34,34,0.10)] text-[12px] font-[Medium] text-[#222] bg-white w-fit">
                                            {row.progressStatus}
                                        </span>

                                        <p className="text-[12px] font-[Regular] text-[#222]">{row.expectedCompletionDate}</p>

                                        <div className="flex items-center justify-start gap-[10px]">
                                            <button
                                                onClick={() =>
                                                    navigate(`/agent/allocated/project-details`, { state: { projectId: row.id } })
                                                }
                                                type="button"
                                                className="cursor-pointer p-[6px] "
                                                aria-label="View"
                                            >
                                                <EyeDarkIcon width={20} height={20} />
                                            </button>
                                            <button type="button" className="cursor-pointer p-[6px] " aria-label="Delete">
                                                <TrashIcon width={20} height={20} />
                                            </button>
                                        </div>
                                    </div>
                                ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pagenation */}
                <Pagenation
                    currentPage={currentPage}
                    totalItems={totalItems}
                    itemsPerPage={itemsPerPage}
                    onPageChange={setCurrentPage}
                />
            </div>
            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
        </div>
    );
};

export default AllocatedProject; 
