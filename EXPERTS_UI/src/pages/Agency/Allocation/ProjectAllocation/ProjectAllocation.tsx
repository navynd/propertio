import { useEffect, useRef, useState } from "react";
import {
  SearchIcon,
  DownArrowIcon,
  TrashIcon,
  EyeDarkIcon,
  TickIcon,
} from "../../../../components/CustomFile/icons";
import AgencyHeader from "../../../../components/Header/AgencyHeader";
import Pagenation from "../../../../components/Pagenation/Pagenation";
import mainbg from "../../../../assets/img/mainbg.png";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  agencyService,
  type SortByProjectMasterItem,
} from "../../../../services/agencyService";
import { API_BASE_URL, getApiErrorMessage } from "../../../../services/apiClient";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";
type ProjectStatus = "New" | "Off-plan";

type Row = {
  id: string;
  projectName: string;
  location: string;
  image: string;
  projectStatus: ProjectStatus;
  announcedDate: string;
  progressStatus: string;
  assignedAgentsCount?: number;
  expectedCompletionDate: string;
};

const MONTH_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

/** e.g. "30 May 2025" (3-letter month), or "--" */
function formatAllocationDate(value: string | null | undefined): string {
  if (value == null || String(value).trim() === "") return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]} ${d.getFullYear()}`;
}

/** Default "Project Announced"; title case each word (hyphens → spaces). */
function formatProgressStatusLabel(value: string | null | undefined): string {
  const s = String(value ?? "")
    .trim()
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const base = s || "Project Announced";
  return base
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

function statusChipClass(status: ProjectStatus) {
  if (status === "New") return "bg-[rgba(0,166,99,0.10)] text-[#00A663]";
  return "bg-[rgba(212, 163, 115,0.10)] text-[#D4A373]";
}

function searchFromSearchParams(params: URLSearchParams): string {
  return params.get("search")?.trim() ?? "";
}

const ProjectAllocation = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<Row[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedSort, setSelectedSort] = useState<string>("featured");
  const [mainTab, setMainTab] = useState<"Unallocated" | "Allocated">(
    "Unallocated",
  );
  const [subTab, setSubTab] = useState<"All" | "New" | "Off-plan">("All");
  const [search, setSearch] = useState(() => searchFromSearchParams(searchParams));
  const [debouncedSearch, setDebouncedSearch] = useState(() =>
    searchFromSearchParams(searchParams),
  );
  const [sortOptions, setSortOptions] = useState<SortByProjectMasterItem[]>([]);
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [projectImageBaseUrl, setProjectImageBaseUrl] = useState<string | null>(
    null,
  );
  const lastDebouncedSearchRef = useRef<string | null>(
    searchFromSearchParams(searchParams) || null,
  );

  useEffect(() => {
    const q = searchFromSearchParams(searchParams);
    setSearch(q);
    setDebouncedSearch(q);
    lastDebouncedSearchRef.current = q || null;
    setCurrentPage(1);
  }, [searchParams]);

  useEffect(() => {
    const loadSortMaster = async () => {
      try {
        const res = await agencyService.getMasterData(["sortbyproject"]);

        const data = res?.sortByProject || [];


        //console.log("RES.DATA:", data);

        setSortOptions(data);

        if (data.length > 0) {
          setSelectedSort(data[0].value);
        }
      } catch (err) {
        console.error("Sort master fetch error:", err);
        toast.error(
          "Could not load sort options",
          getApiErrorMessage(err, "Sort options could not be loaded."),
        );
      }
    };

    loadSortMaster();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      const q = search.trim();
      if (lastDebouncedSearchRef.current === q) return;
      if (lastDebouncedSearchRef.current !== null) {
        setCurrentPage(1);
      }
      lastDebouncedSearchRef.current = q;
      setDebouncedSearch(q);
    }, 350);
    return () => window.clearTimeout(id);
  }, [search]);

  useEffect(() => {
    setCurrentPage(1);
  }, [mainTab, subTab]);

  useEffect(() => {
    setSelectedIds([]);
  }, [debouncedSearch, mainTab, subTab]);

  useEffect(() => {
    fetchProjects();
  }, [mainTab, subTab, selectedSort, currentPage, debouncedSearch]);
  const mapProject = (item: any): Row => ({
    id: item.projectId,
    projectName: item.projectName,
    location: `${item.location?.city || ""}${item.location?.zone ? ", " + item.location.zone : ""}`,
    image: item.image?.url || item.image || "",
    projectStatus: item.projectStatus === "ready" ? "New" : "Off-plan",
    announcedDate: formatAllocationDate(item.announcedDate),
    progressStatus: formatProgressStatusLabel(item.progressStatus),
    expectedCompletionDate: formatAllocationDate(item.expectedCompletionDate),
    assignedAgentsCount: item.assignedAgentsCount,
  });

  const selectedSortLabel =
    sortOptions.find((o) => o.value === selectedSort)?.name || "Featured";
  useEffect(() => {
    let isMounted = true;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallback = `${fallbackOrigin}/uploads/img/project/`;

    agencyService
      .getMasterData(["supportedurls"])
      .then((res) => {
        if (!isMounted) return;

        const projectImg =
          res?.supportedUrls?.projectUrl?.img ||
          fallback;

        setProjectImageBaseUrl(projectImg.replace(/\/?$/, "/"));
      })
      .catch(() => {
        if (!isMounted) return;
        setProjectImageBaseUrl(fallback);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const toProjectImageUrl = (image: string | null) => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;
    const base = (projectImageBaseUrl || fallbackBase).replace(/\/?$/, "/");
    return `${base}${image}`;
  };
  const fetchProjects = async () => {
    try {
      setLoading(true);

      const res = await agencyService.getProjects({
        tab: mainTab.toLowerCase() as "unallocated" | "allocated",
        subTab:
          subTab === "All" ? "all" : subTab === "New" ? "new" : "off-plan",
        sortBy: selectedSort,
        page: currentPage,
        limit: itemsPerPage,
        search: debouncedSearch || undefined,
      });

      const apiData = res;
      const totalPages = apiData.pagination?.totalPages ?? 0;

      setProjects((apiData.projects ?? []).map(mapProject));
      setTotalItems(apiData.pagination?.totalProjects ?? 0);

      if (totalPages > 0 && currentPage > totalPages) {
        setCurrentPage(totalPages);
      }
    } catch (err) {
      console.error(err);
      toast.error(
        "Could not load projects",
        getApiErrorMessage(err, "Failed to load projects. Please try again."),
      );
      setProjects([]);
      setTotalItems(0);
    } finally {
      setLoading(false);
    }
  };
  const paginatedRows = projects;
  const allSelected =
    paginatedRows.length > 0 && selectedIds.length === paginatedRows.length;
  const tableGrid =
    mainTab === "Unallocated"
      ? "grid grid-cols-[44px_1.8fr_1.1fr_1.4fr_1.4fr_1.8fr_1fr] gap-2 items-center px-[14px] py-[12px]"
      : "grid grid-cols-[44px_1.8fr_1.1fr_1.1fr_1.4fr_1.5fr_1fr] gap-2 items-center px-[14px] py-[12px]";

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <AgencyHeader
        title="Project allocation"
        showBack={false}
        onBackClick={() => { }}
      />

      <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0 flex flex-col gap-[18px]">
        {/* Top pills + search + sort/delete */}
        <div className="flex flex-wrap items-center justify-between gap-[12px]">
          <div className="flex flex-wrap items-center gap-[10px]">
            {(["Unallocated", "Allocated"] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setMainTab(t)}
                className={`cursor-pointer rounded-full px-[18px] h-[33px] text-[12px] font-[SemiBold] transition-colors ${mainTab === t ? "bg-[#222] text-white" : "bg-white border border-[#EAEAEA] text-[#222]"}`}
              >
                {t}
              </button>
            ))}

            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-full px-[14px] h-[33px] w-full sm:w-[320px]">
              <SearchIcon className="text-[#707070] shrink-0" />
              <input
                type="search"
                placeholder="Search here"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-[14px] w-full lg:w-auto justify-between lg:justify-end">
            <div className="flex items-center gap-[10px]">
              <span className="text-[12px] text-[#707070] font-[Regular]">
                Sort by:
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsSortOpen((o) => !o)}
                  className="cursor-pointer inline-flex items-center gap-[8px] h-[33px] px-[12px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white text-[12px] font-[SemiBold] text-[#222]"
                >
                  {selectedSortLabel} <DownArrowIcon width={10} height={6} />
                </button>
                {isSortOpen && (
                  <div className="absolute right-0 top-[38px] z-30 w-[160px] bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                    {sortOptions.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setSelectedSort(opt.value);
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

            <button
              type="button"
              disabled={selectedIds.length === 0}
              className={`inline-flex items-center gap-[8px] text-[12px] font-[SemiBold] bg-[#F5F5F5] h-[33px] rounded-full px-[10px] opacity-50 text-[#222] ${selectedIds.length === 0 ? "text-[#BDBDBD] cursor-not-allowed" : "text-[#222] cursor-pointer"}`}
            >
              <TrashIcon fill="#707070" width={16} height={16} /> <span className="text-[#222]">Delete</span>
            </button>
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
                  {active && (
                    <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full bg-[#0832AE]" />
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div
            className="rounded-[10px] border border-[rgba(34,34,34,0.08)] bg-white min-h-[280px] flex items-center justify-center py-12"
            aria-busy="true"
            aria-label="Loading projects"
          >
            <Loader size={80} margin={0} />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto w-full scrollbar-hide">
              <div className="min-w-[1400px]">
                <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                  <div
                    className={`${tableGrid} bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]`}
                  >
                    <div className="flex justify-center">
                      <label
                        className={`relative ${loading || paginatedRows.length === 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      >  <input
                          type="checkbox"
                          className="peer hidden "
                          checked={allSelected}
                          disabled={loading || paginatedRows.length === 0}
                          onChange={(e) =>
                            setSelectedIds(
                              e.target.checked ? paginatedRows.map((r) => r.id) : [],
                            )
                          }
                        />
                        <div className="h-[16px] w-[16px] rounded border border-[rgba(34,34,34,0.20)] flex items-center justify-center peer-checked:bg-[#222] peer-checked:border-[#222]">
                          {allSelected ? <TickIcon width={10} height={10} /> : null}
                        </div>
                      </label>
                    </div>
                    <p className="text-[14px] font-[SemiBold] text-[#222]">
                      Project Details
                    </p>
                    <p className="text-[14px] font-[SemiBold] text-[#222]">
                      Project status
                    </p>
                    <p className="text-[14px] font-[SemiBold] text-[#222]">
                      Announced date
                    </p>
                    <p className="text-[14px] font-[SemiBold] text-[#222]">
                      Progress status
                    </p>
                    <p className="text-[14px] font-[SemiBold] text-[#222]">
                      {mainTab === "Unallocated"
                        ? "Expected Completion date"
                        : "Assigned agents count"}
                    </p>
                    <p className="text-[14px] font-[SemiBold] text-[#222]">
                      Actions
                    </p>
                  </div>

                  <div>
                    {paginatedRows.length === 0 ? (
                      <div className="px-[14px] py-[24px] text-center text-[14px] font-[Medium] text-[#707070]">
                        No projects found.
                      </div>
                    ) : (
                      paginatedRows.map((row, idx) => {
                        const checked = selectedIds.includes(row.id);
                        return (
                          <div
                            key={row.id}
                            className={`${tableGrid} ${idx !== paginatedRows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                          >
                            <div className="flex justify-center">
                              <label
                                className={`relative ${loading || paginatedRows.length === 0 ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    setSelectedIds((prev) =>
                                      e.target.checked
                                        ? [...prev, row.id]
                                        : prev.filter((x) => x !== row.id),
                                    );
                                  }}
                                  disabled={loading || paginatedRows.length === 0}
                                  className="peer hidden "
                                />
                                <div className="h-[16px] w-[16px] rounded border border-[rgba(34,34,34,0.20)] flex items-center justify-center peer-checked:bg-[#222] peer-checked:border-[#222]">
                                  {checked ? <TickIcon width={10} height={10} /> : null}
                                </div>
                              </label>
                            </div>
                            {/* <label className="inline-flex items-center justify-center">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={(e) => {
                                  setSelectedIds((prev) =>
                                    e.target.checked
                                      ? [...prev, row.id]
                                      : prev.filter((x) => x !== row.id),
                                  );
                                }}
                                className="h-[16px] w-[16px] accent-[#0832AE]"
                              />
                            </label> */}

                            <div className="flex items-center gap-[10px] min-w-0">
                              <div className="h-[54px] w-[54px] shrink-0 overflow-hidden rounded-[10px] bg-[#F5F5F5]">
                                <img
                                  src={toProjectImageUrl(row.image)}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              </div>
                              <div className="min-w-0">
                                <p className="text-[12px] font-[Bold] text-[#222] leading-[1.2] truncate mb-[4px]">
                                  {row.projectName}
                                </p>
                                <p className="text-[12px] font-[Regular] text-[#707070] leading-[1.2] truncate">
                                  {row.location}
                                </p>
                              </div>
                            </div>

                            <span
                              className={`inline-flex items-center justify-center h-[22px] px-[10px] rounded-full text-[12px] font-[SemiBold] w-fit ${statusChipClass(row.projectStatus)}`}
                            >
                              {row.projectStatus}
                            </span>

                            <p className="text-[12px] font-[Regular] text-[#222]">
                              {row.announcedDate}
                            </p>

                            <span className="inline-flex items-center justify-center h-[26px] px-[10px] rounded-[6px] border border-[rgba(34,34,34,0.10)] text-[12px] font-[Medium] text-[#222] bg-white w-fit">
                              {row.progressStatus}
                            </span>

                            <p className="text-[12px] font-[Regular] text-[#222]">
                              {mainTab === "Unallocated"
                                ? row.expectedCompletionDate
                                : (row.assignedAgentsCount ?? "--")}
                            </p>

                            <div className="flex items-center justify-start gap-[10px]">
                              <button
                                onClick={() =>
                                  navigate(`/agency/allocation/project-details/${row.id}`)
                                }
                                type="button"
                                className="cursor-pointer p-[6px] rounded-[8px]"
                                aria-label="View"
                              >
                                <EyeDarkIcon width={20} height={20} />
                              </button>
                              <button
                                type="button"
                                className="cursor-pointer p-[6px] rounded-[8px]"
                                aria-label="Delete"
                              >
                                <TrashIcon width={20} height={20} stroke="#222" />
                              </button>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </div>
            </div>

            <Pagenation
              currentPage={currentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
            />
          </>
        )}
      </div>
    </div>
  );
};

export default ProjectAllocation;
