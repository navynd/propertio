import { useCallback, useEffect, useState } from "react";
import { EditIcon, SearchIcon, TrashIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import Pagenation from "../../../components/Pagenation/Pagenation";
import { useNavigate } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { bannerService } from "../../../services/bannerService";
import type { BannerRecord, BannerSettings } from "../../../types/api";
import {
  BANNER_PLACEMENT_OPTIONS,
  defaultBannerSettings,
} from "../cmsData";
import {
  Dropdown,
  SaveBar,
  TextField,
  sectionClass,
  sectionTitleClass,
} from "../shared/CmsFormShared";

const ADMIN_LIST_LIMIT = 5;

function BannerManagement() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settings, setSettings] = useState<BannerSettings>(defaultBannerSettings);
  const [banners, setBanners] = useState<BannerRecord[]>([]);
  const [placement, setPlacement] = useState("listing-page");
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

  const placementLabel =
    BANNER_PLACEMENT_OPTIONS.find((p) => p.value === placement)?.label || placement;

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await bannerService.getBanners({
        page: currentPage,
        limit: ADMIN_LIST_LIMIT,
        search: search || undefined,
        placement,
      });
      setSettings({ ...defaultBannerSettings, ...data.settings });
      setBanners(data.banners || []);
      setTotalPages(data.pagination?.pages || 1);
      setImgBaseUrl((data.mediaBaseUrl?.img || "").trim());
    } catch (error) {
      push({
        type: "error",
        title: "Failed to load banners",
        description: getApiErrorMessage(error, "Unable to fetch banner CMS data."),
      });
    } finally {
      setLoading(false);
    }
  }, [currentPage, search, placement, push]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    setCurrentPage(1);
  }, [placement]);

  const handleSearch = () => {
    setCurrentPage(1);
    setSearch(searchInput.trim());
  };

  const handleSaveSettings = async () => {
    try {
      await bannerService.saveSettings(settings, {
        page: currentPage,
        limit: ADMIN_LIST_LIMIT,
        search: search || undefined,
        placement,
      });
      push({ type: "success", title: "Saved", description: "Banner carousel settings saved." });
      await fetchData();
    } catch (error) {
      push({
        type: "error",
        title: "Save failed",
        description: getApiErrorMessage(error, "Unable to save banner settings."),
      });
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!window.confirm("Delete this banner?")) return;
    setDeletingId(bannerId);
    try {
      await bannerService.deleteBanner(bannerId, {
        page: currentPage,
        limit: ADMIN_LIST_LIMIT,
        search: search || undefined,
        placement,
      });
      push({ type: "success", title: "Deleted", description: "Banner removed." });
      await fetchData();
    } catch (error) {
      push({
        type: "error",
        title: "Delete failed",
        description: getApiErrorMessage(error, "Unable to delete banner."),
      });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && !banners.length) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <Header title="Banner Management" showBack={false} onBackClick={() => {}} />
        <Loader />
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <Header title="Banner Management" showBack={false} onBackClick={() => {}} />

      <div className="mt-[20px]">
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Carousel Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
            <TextField
              label="Default Button Text"
              value={settings.defaultButtonText || ""}
              onChange={(v) => setSettings((p) => ({ ...p, defaultButtonText: v }))}
            />
            <TextField
              label="Auto Slide Interval (ms)"
              value={String(settings.autoSlideInterval ?? 5000)}
              onChange={(v) =>
                setSettings((p) => ({ ...p, autoSlideInterval: Number(v) || 5000 }))
              }
              type="number"
            />
          </div>
        </div>

        <div className="p-[20px] bg-[#fff] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">
          <div className="flex items-center justify-between mb-[20px] gap-[10px] flex-wrap">
            <Dropdown
              label="Page Placement"
              value={placement}
              onChange={setPlacement}
              options={BANNER_PLACEMENT_OPTIONS}
            />
            <p className="text-[12px] font-[Regular] text-[#707070]">
              Managing banners for: <span className="font-[Medium] text-[#222]">{placementLabel}</span>
            </p>
          </div>

          <div className="flex items-center justify-between mb-[30px] gap-[10px] flex-wrap">
            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[15px] px-[14px] h-[40px] w-full md:w-[280px]">
              <SearchIcon className="text-[#707070] shrink-0" />
              <input
                type="search"
                placeholder="Search by title or description"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => navigate(`/bannerdetail?placement=${placement}`)}
              className="h-[40px] px-[18px] rounded-[10px] bg-[#6A3CA8] text-[#fff] text-[13px] font-[Bold] cursor-pointer"
            >
              + Add Banner
            </button>
          </div>

          <div className="overflow-x-auto w-full scrollbar-hide mb-[30px]">
            <div className="min-w-[900px]">
              <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                <div className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.8fr] gap-[16px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Title</p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Button</p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Link</p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                  <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                </div>
                {banners.map((row) => (
                  <div
                    key={row.id}
                    className="grid grid-cols-[1.2fr_1fr_1fr_0.7fr_0.8fr] gap-[16px] items-center px-[14px] py-[14px] border-b border-[rgba(34,34,34,0.06)]"
                  >
                    <div className="flex items-center gap-[10px]">
                      <img
                        src={resolveImageSrc(row.image) || "/placeholder.png"}
                        alt={row.title}
                        className="w-[48px] h-[32px] rounded-[6px] object-cover bg-[#F5F5F5]"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                      <p className="text-[13px] font-[Medium] text-[#222]">{row.title}</p>
                    </div>
                    <p className="text-[13px] font-[Regular] text-[#707070]">{row.linkText || "—"}</p>
                    <p className="text-[13px] font-[Regular] text-[#707070] truncate">{row.link || "—"}</p>
                    <span
                      className={`text-[12px] font-[Medium] px-[10px] py-[4px] rounded-full w-fit ${
                        row.isActive ? "bg-[#E8F5EE] text-[#05A666]" : "bg-[#F5F5F5] text-[#707070]"
                      }`}
                    >
                      {row.isActive ? "Active" : "Inactive"}
                    </span>
                    <div className="flex items-center gap-[10px]">
                      <button
                        type="button"
                        onClick={() => navigate(`/bannerdetail?id=${row.id}&placement=${placement}`)}
                        className="cursor-pointer"
                      >
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
                {!banners.length && (
                  <p className="text-center text-[#707070] text-[13px] py-[24px]">
                    No banners for this placement yet.
                  </p>
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

export default BannerManagement;
