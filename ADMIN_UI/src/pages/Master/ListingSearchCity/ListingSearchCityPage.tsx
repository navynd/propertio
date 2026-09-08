import { useCallback, useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";
import { DownArrowIcon, EditIcon, PlusUserIcon, SearchIcon, TrashIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Pagenation from "../../../components/Pagenation/Pagenation";
import Loader from "../../../components/Loader/loader";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import type { ListingSearchCitiesListPagination } from "../../../types/api";
import type { ListingSearchCityPayload } from "../../../services/listingSearchLocationsService";
import ListingSearchCityModal, {
  type ListingSearchCityFormPayload,
} from "./ListingSearchCityModal";
import { formatJobTitleDate } from "../Jobtitle/jobTitleData";

const tableGrid =
  "grid-cols-[minmax(120px,1.2fr)_0.9fr_0.55fr_0.85fr_0.7fr]";
const ITEMS_PER_PAGE = 5;
const SEARCH_DEBOUNCE_MS = 400;
const linkedFilterOptions = ["all", "linked"] as const;
type LinkedFilter = (typeof linkedFilterOptions)[number];

type LocationRow = {
  _id: string;
  cityKey: string;
  displayName: string;
  propertyCount?: number;
  projectCount?: number;
  updatedAt?: string;
};

type LocationListCounts = {
  totalLocations: number;
  withPropertyListings?: number;
  withProjectListings?: number;
};

type ListResult = {
  rows: LocationRow[];
  pagination?: ListingSearchCitiesListPagination;
  counts?: LocationListCounts;
};

export type ListingSearchCityPageConfig = {
  kind: "property" | "project";
  headerTitle: string;
  addButtonLabel: string;
  modalTitleAdd: string;
  modalTitleEdit: string;
  emptyMessage: string;
  linkedFilterHelp: string;
  countColumnLabel: string;
  fetchList: (params: {
    page: number;
    limit: number;
    search?: string;
    linkedOnly?: boolean;
  }) => Promise<ListResult>;
  create: (payload: ListingSearchCityPayload) => Promise<void>;
  update: (id: string, payload: Pick<ListingSearchCityPayload, "displayName">) => Promise<void>;
  remove: (id: string) => Promise<void>;
};

function getListingCount(row: LocationRow, kind: "property" | "project") {
  return kind === "property" ? (row.propertyCount ?? 0) : (row.projectCount ?? 0);
}

function StatCards({
  counts,
  kind,
}: {
  counts?: LocationListCounts;
  kind: "property" | "project";
}) {
  const linked =
    kind === "property"
      ? (counts?.withPropertyListings ?? 0)
      : (counts?.withProjectListings ?? 0);

  const stats = [
    { label: "Total cities", value: counts?.totalLocations ?? 0, accent: "#222" },
    {
      label: kind === "property" ? "With property listings" : "With project listings",
      value: linked,
      accent: "#6A3CA8",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[14px] mb-[24px]">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-[12px] border border-[rgba(34,34,34,0.08)] bg-white p-[16px] flex flex-col gap-[6px]"
        >
          <p className="text-[12px] font-[Medium] text-[#707070]">{s.label}</p>
          <p className="text-[28px] font-[Bold] leading-none" style={{ color: s.accent }}>
            {s.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export default function ListingSearchCityPage({ config }: { config: ListingSearchCityPageConfig }) {
  const { kind } = config;
  const { push } = useToast();
  const [rows, setRows] = useState<LocationRow[]>([]);
  const [listCounts, setListCounts] = useState<LocationListCounts>();
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [linkedFilter, setLinkedFilter] = useState<LinkedFilter>("all");
  const [isLinkedOpen, setIsLinkedOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<LocationRow | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const linkedRef = useRef<HTMLDivElement>(null);

  const linkedLabel = linkedFilter === "all" ? "All cities" : "Linked only";

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
      setCurrentPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (linkedRef.current?.contains(e.target as Node)) return;
      setIsLinkedOpen(false);
    };
    document.addEventListener("mousedown", onMouseDown);
    return () => document.removeEventListener("mousedown", onMouseDown);
  }, []);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    try {
      const data = await config.fetchList({
        page: currentPage,
        limit: ITEMS_PER_PAGE,
        search: debouncedSearch || undefined,
        linkedOnly: linkedFilter === "linked" ? true : undefined,
      });
      setRows(data.rows);
      setTotalPages(Math.max(1, data.pagination?.totalPages ?? 1));
      setTotalItems(data.pagination?.totalLocations ?? 0);
      setListCounts(data.counts);
    } catch (error) {
      push({
        type: "error",
        title: `Failed to load ${config.headerTitle.toLowerCase()}`,
        description: getApiErrorMessage(error, "Unable to fetch locations."),
      });
      setRows([]);
      setTotalPages(1);
      setTotalItems(0);
      setListCounts(undefined);
    } finally {
      setLoading(false);
    }
  }, [currentPage, debouncedSearch, linkedFilter, push, config]);

  useEffect(() => {
    void fetchRows();
  }, [fetchRows, refreshKey]);

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
  };

  const handleSave = async (payload: ListingSearchCityFormPayload, editingId?: string) => {
    try {
      if (editingId) {
        await config.update(editingId, { displayName: payload.displayName });
        push({
          type: "success",
          title: "Location updated",
          description: "Display name saved successfully.",
        });
      } else {
        await config.create({
          displayName: payload.displayName,
          cityKey: payload.cityKey,
        });
        push({
          type: "success",
          title: "Location created",
          description: "New search city added successfully.",
        });
      }
      setRefreshKey((k) => k + 1);
    } catch (error) {
      push({
        type: "error",
        title: editingId ? "Update failed" : "Create failed",
        description: getApiErrorMessage(error, "Could not save location."),
      });
    }
  };

  const handleDelete = async (record: LocationRow) => {
    const count = getListingCount(record, kind);
    if (count > 0) {
      push({
        type: "error",
        title: "Cannot delete",
        description:
          kind === "property"
            ? "This city still has linked property listings. Counts clear automatically when listings are removed or change city."
            : "This city still has linked project listings. Counts clear automatically when listings are removed or change city.",
      });
      return;
    }

    const result = await Swal.fire({
      title: "Delete location?",
      text: `Remove "${record.displayName}"? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#EA3934",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      await config.remove(record._id);
      push({
        type: "success",
        title: "Location deleted",
        description: `${record.displayName} has been removed.`,
      });
      setRefreshKey((k) => k + 1);
    } catch (error) {
      push({
        type: "error",
        title: "Delete failed",
        description: getApiErrorMessage(error, "Could not delete location."),
      });
    }
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <Header title={config.headerTitle} showBack={false} onBackClick={() => {}} />

      <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">
        <StatCards counts={listCounts} kind={kind} />

        <div className="flex flex-wrap items-center justify-between gap-[10px] mb-[24px]">
          <div className="flex flex-wrap items-center gap-[10px] flex-1 min-w-0">
            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[15px] px-[14px] h-[40px] w-full md:w-[280px]">
              <SearchIcon className="text-[#707070] shrink-0" />
              <input
                type="search"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search display name or city key"
                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
              />
            </div>

            <div className="relative shrink-0" ref={linkedRef}>
              <button
                type="button"
                onClick={() => setIsLinkedOpen((o) => !o)}
                className="flex items-center justify-between gap-[8px] border border-[rgba(34,34,34,0.12)] bg-white rounded-[15px] px-[14px] h-[40px] cursor-pointer min-w-[160px]"
                title={config.linkedFilterHelp}
              >
                <span className="text-[#222] text-[13px] font-[Regular] truncate">{linkedLabel}</span>
                <DownArrowIcon
                  width={11}
                  height={7}
                  className={`shrink-0 transition-transform ${isLinkedOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isLinkedOpen && (
                <div className="absolute left-0 top-[48px] z-30 min-w-[180px] rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white py-[6px] shadow-[0_6px_16px_rgba(0,0,0,0.12)]">
                  {linkedFilterOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setLinkedFilter(opt);
                        setCurrentPage(1);
                        setIsLinkedOpen(false);
                      }}
                      className={`w-full px-[14px] py-[9px] text-left text-[13px] font-[Medium] hover:bg-[#F5F5F5] ${linkedFilter === opt ? "text-[#6A3CA8] bg-[#F5F5F5]" : "text-[#222]"}`}
                    >
                      {opt === "all" ? "All cities" : "Linked only"}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* <button
            type="button"
            onClick={() => {
              setEditingRecord(null);
              setIsModalOpen(true);
            }}
            className="h-[40px] px-[18px] rounded-[15px] bg-[#6A3CA8] text-white text-[13px] font-[SemiBold] inline-flex items-center gap-[8px] cursor-pointer shrink-0"
          >
            <PlusUserIcon width={16} height={16} className="text-white" />
            {config.addButtonLabel}
          </button> */}
        </div>

        <div className="overflow-x-auto w-full scrollbar-hide mb-[30px]">
          <div className="min-w-[760px]">
            <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
              <div
                className={`grid ${tableGrid} gap-[12px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]`}
              >
                <p className="text-[14px] font-[SemiBold] text-[#222]">Display name</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">City key</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">{config.countColumnLabel}</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">updatedAt</p>
                <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
              </div>

              <div>
                {loading ? (
                  <div className="px-[14px] py-[30px] flex justify-center">
                    <Loader size={80} />
                  </div>
                ) : rows.length === 0 ? (
                  <p className="px-[14px] py-[24px] text-[13px] text-[#707070] text-center">
                    {config.emptyMessage}
                  </p>
                ) : (
                  rows.map((row, idx) => {
                    const listingCount = getListingCount(row, kind);
                    const canDelete = listingCount === 0;
                    return (
                      <div
                        key={row._id}
                        className={`grid ${tableGrid} gap-[12px] items-center px-[14px] py-[12px] ${idx !== rows.length - 1 ? "border-b border-[rgba(34,34,34,0.08)]" : ""}`}
                      >
                        <p className="text-[12px] font-[SemiBold] text-[#222] truncate">
                          {row.displayName}
                        </p>
                        <p className="text-[12px] font-[Regular] text-[#707070] truncate">
                          {row.cityKey}
                        </p>
                        <p
                          className={`text-[12px] font-[SemiBold] truncate ${listingCount > 0 ? "text-[#6A3CA8]" : "text-[#222]"}`}
                        >
                          {listingCount}
                        </p>
                        <p className="text-[12px] font-[Regular] text-[#222] truncate">
                          {formatJobTitleDate(row.updatedAt)}
                        </p>
                        <div className="flex items-center gap-[10px]">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRecord(row);
                              setIsModalOpen(true);
                            }}
                            className="cursor-pointer p-[6px]"
                            aria-label="Edit"
                          >
                            <EditIcon width={20} height={20} />
                          </button>
                          {/* <button
                            type="button"
                            className={`cursor-pointer p-[6px] ${!canDelete ? "opacity-40" : ""}`}
                            aria-label="Delete"
                            title={
                              canDelete
                                ? "Delete"
                                : `Cannot delete while linked to ${kind} listings`
                            }
                            onClick={() => handleDelete(row)}
                          >
                            <TrashIcon width={20} height={20} />
                          </button> */}
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
          totalPages={totalPages}
          totalItems={totalItems}
          itemsPerPage={ITEMS_PER_PAGE}
          onPageChange={setCurrentPage}
        />
      </div>

      <ListingSearchCityModal
        isOpen={isModalOpen}
        onClose={closeModal}
        editingRecord={editingRecord}
        kind={kind}
        titleAdd={config.modalTitleAdd}
        titleEdit={config.modalTitleEdit}
        onSave={handleSave}
      />
    </div>
  );
}
