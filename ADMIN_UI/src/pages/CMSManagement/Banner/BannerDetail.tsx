import { useEffect, useRef, useState } from "react";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { bannerService } from "../../../services/bannerService";
import { apiClient } from "../../../services/apiClient";
import type { SupportedUrlsResponse } from "../../../types/api";
import {
  BANNER_PLACEMENT_OPTIONS,
  defaultBannerSettings,
} from "../cmsData";
import {
  Dropdown,
  SaveBar,
  TextAreaField,
  TextField,
  Toggle,
  sectionClass,
  sectionTitleClass,
} from "../shared/CmsFormShared";

function BannerDetail() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [searchParams] = useSearchParams();
  const bannerId = searchParams.get("id") || "";
  const initialPlacement = searchParams.get("placement") || "listing-page";

  const fileInputRef = useRef<HTMLInputElement>(null);
  const mobileFileInputRef = useRef<HTMLInputElement>(null);
  const objectUrlRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(Boolean(bannerId));
  const [imgBaseUrl, setImgBaseUrl] = useState("");

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [link, setLink] = useState("");
  const [linkText, setLinkText] = useState(defaultBannerSettings.defaultButtonText);
  const [placement, setPlacement] = useState(initialPlacement);
  const [displayOrder, setDisplayOrder] = useState(1);
  const [isActive, setIsActive] = useState(true);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [image, setImage] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [mobilePreview, setMobilePreview] = useState<string | null>(null);
  const [mobileImageFile, setMobileImageFile] = useState<File | null>(null);

  const resolveImageSrcWithBase = (filename: string, baseUrl = imgBaseUrl) => {
    const raw = (filename || "").trim();
    if (!raw) return "";
    if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:")) return raw;
    const base = baseUrl.replace(/\/+$/, "");
    return base ? `${base}/${encodeURIComponent(raw)}` : raw;
  };

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();

    const load = async () => {
      try {
        const [data, urls] = await Promise.all([
          bannerService.getBanners(
            bannerId ? { bannerId } : { placement: initialPlacement },
            controller.signal
          ),
          apiClient.get<SupportedUrlsResponse>(
            "/master-data?types=supportedurls",
            { auth: true, signal: controller.signal }
          ),
        ]);

        if (!mounted) return;

        const base = (data.mediaBaseUrl?.img || urls.supportedUrls?.bannerUrl?.img || "").trim();
        setImgBaseUrl(base);

        const item = data.banner || data.banners?.[0];
        if (item) {
          setTitle(item.title || "");
          setDescription(item.description || "");
          setLink(item.link || "");
          setLinkText(item.linkText || defaultBannerSettings.defaultButtonText);
          setPlacement(item.placement || initialPlacement);
          setDisplayOrder(item.displayOrder || 1);
          setIsActive(item.isActive !== false);
          setStartDate(item.startDate ? String(item.startDate).slice(0, 10) : "");
          setEndDate(item.endDate ? String(item.endDate).slice(0, 10) : "");
          setImage(item.image || "");
          setPreview(item.image ? resolveImageSrcWithBase(item.image, base) : null);
          setMobilePreview(
            item.mobileImage ? resolveImageSrcWithBase(item.mobileImage, base) : null
          );
        } else {
          setPlacement(initialPlacement);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          push({
            type: "error",
            title: "Failed to load banner",
            description: getApiErrorMessage(error, "Unable to fetch banner."),
          });
        }
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();

    return () => {
      mounted = false;
      controller.abort();
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [bannerId, initialPlacement, push]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url;
    setPreview(url);
    setImageFile(file);
  };

  const handleMobileImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMobilePreview(url);
    setMobileImageFile(file);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      push({
        type: "error",
        title: "Validation",
        description: "Banner title is required.",
      });
      return;
    }

    if (!bannerId && !imageFile && !image) {
      push({
        type: "error",
        title: "Validation",
        description: "Banner image is required.",
      });
      return;
    }

    try {
      await bannerService.saveBanner({
        bannerId: bannerId || undefined,
        title,
        description,
        link,
        linkText,
        placement,
        displayOrder,
        isActive,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        image: imageFile ? undefined : image,
        imageFile,
        mobileImageFile,
      });
      push({ type: "success", title: "Saved", description: "Banner saved." });
      navigate("/banner");
    } catch (error) {
      push({
        type: "error",
        title: "Save failed",
        description: getApiErrorMessage(error, "Unable to save banner."),
      });
    }
  };

  if (loading) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <Header title="Banner" showBack={true} onBackClick={() => navigate("/banner")} />
        <Loader />
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <Header title="Banner" showBack={true} onBackClick={() => navigate("/banner")} />

      <div className="mt-[20px]">
        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Banner Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
            <TextField label="Title" value={title} onChange={setTitle} required />
            <Dropdown
              label="Page Placement"
              value={placement}
              onChange={setPlacement}
              options={BANNER_PLACEMENT_OPTIONS}
            />
            <TextField label="Button Text" value={linkText} onChange={setLinkText} />
            <TextField label="Button Link (URL)" value={link} onChange={setLink} />
            <TextField
              label="Display Order"
              value={String(displayOrder)}
              onChange={(v) => setDisplayOrder(Number(v) || 0)}
              type="number"
            />
            <Toggle label="Active" checked={isActive} onChange={setIsActive} />
            <TextField
              label="Start Date"
              value={startDate}
              onChange={setStartDate}
              type="date"
            />
            <TextField label="End Date" value={endDate} onChange={setEndDate} type="date" />
            <div className="md:col-span-2">
              <TextAreaField
                label="Description (optional)"
                value={description}
                onChange={setDescription}
              />
            </div>
          </div>
        </div>

        <div className={sectionClass}>
          <h3 className={sectionTitleClass}>Banner Images</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
            <div>
              <p className="text-[13px] font-[Medium] text-[#222] mb-[10px]">Desktop Image *</p>
              <div className="flex items-center gap-[16px] flex-wrap">
                {preview && (
                  <img
                    src={preview}
                    alt="Banner preview"
                    className="w-[160px] h-[90px] rounded-[8px] object-cover border border-[#EAEAEA]"
                  />
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-[42px] px-[18px] rounded-[10px] bg-[#222] text-[#fff] text-[14px] font-[Medium] cursor-pointer"
                >
                  Upload Desktop Image
                </button>
              </div>
            </div>
            <div>
              <p className="text-[13px] font-[Medium] text-[#222] mb-[10px]">Mobile Image (optional)</p>
              <div className="flex items-center gap-[16px] flex-wrap">
                {mobilePreview && (
                  <img
                    src={mobilePreview}
                    alt="Mobile banner preview"
                    className="w-[120px] h-[90px] rounded-[8px] object-cover border border-[#EAEAEA]"
                  />
                )}
                <input
                  ref={mobileFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleMobileImageChange}
                />
                <button
                  type="button"
                  onClick={() => mobileFileInputRef.current?.click()}
                  className="h-[42px] px-[18px] rounded-[10px] bg-[#222] text-[#fff] text-[14px] font-[Medium] cursor-pointer"
                >
                  Upload Mobile Image
                </button>
              </div>
            </div>
          </div>
        </div>

        <SaveBar onSave={handleSave} />
      </div>
    </div>
  );
}

export default BannerDetail;
