import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import profileimg from "../../../assets/img/profileless.png";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage, isAbortError } from "../../../services/apiClient";
import { amenitiesService } from "../../../services/amenitiesService";

const formatAmenityDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

const inputClass =
  "h-[44px] w-full rounded-[10px] border border-[#EAEAEA] px-[14px] text-[13px] focus:outline-none";
const textareaClass =
  "w-full rounded-[10px] border border-[#EAEAEA] px-[14px] py-[12px] text-[13px] resize-none focus:outline-none";
const labelClass = "block text-[14px] font-[SemiBold] text-[#222] mb-[8px]";
const sectionClass = "bg-white rounded-[12px] p-[20px] border border-[#EAEAEA]";
const sectionTitleClass = "text-[18px] font-[Bold] text-[#222] mb-[20px]";

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="flex items-center justify-between border border-[#EAEAEA] rounded-[10px] px-[14px] h-[44px]">
        <span className="text-[13px] font-[Medium] text-[#222]">{label}</span>
        <button
          type="button"
          onClick={() => onChange(!checked)}
          className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${checked ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"}`}
        >
          <span
            className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${checked ? "left-[22px]" : "left-[2px]"}`}
          />
        </button>
      </div>
    </div>
  );
}

function MediaUploadBlock({
  title,
  description,
  previewSrc,
  onUpload,
  onDelete,
}: {
  title: string;
  description: string;
  previewSrc: string | null;
  onUpload: (file: File) => void;
  onDelete: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="border border-[#EAEAEA] rounded-[12px] p-[20px]">
      <div className="flex items-center justify-between flex-wrap gap-[20px]">
        <div className="flex items-center gap-[16px]">
          <div className="w-[72px] h-[72px] rounded-[12px] overflow-hidden border border-[#EAEAEA] shrink-0 bg-[#F5F5F5] flex items-center justify-center">
            <img
              src={previewSrc || profileimg}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <h4 className="text-[16px] font-[Bold] text-[#222]">{title}</h4>
            <p className="text-[13px] font-[Regular] text-[#707070] mt-[4px]">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-[12px] flex-wrap">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) onUpload(file);
              e.currentTarget.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-[42px] px-[18px] rounded-[10px] bg-[#222] text-[#fff] text-[14px] font-[Medium] cursor-pointer"
          >
            Upload
          </button>
          {previewSrc && (
            <button
              type="button"
              onClick={onDelete}
              className="h-[42px] px-[18px] rounded-[10px] border border-[#EAEAEA] text-[#EA3934] text-[14px] font-[Medium] cursor-pointer"
            >
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function AmenitiesDetail() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const amenityId = searchParams.get("id")?.trim() || "";
  const isEdit = Boolean(amenityId);
  const { push } = useToast();

  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [usageCount, setUsageCount] = useState(0);
  const [createdAt, setCreatedAt] = useState<string | undefined>();
  const [updatedAt, setUpdatedAt] = useState<string | undefined>();

  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [removeImage, setRemoveImage] = useState(false);
  const imageBlobRef = useRef<string | null>(null);

  const revokeBlob = (url: string | null) => {
    if (url?.startsWith("blob:")) URL.revokeObjectURL(url);
  };

  useEffect(() => {
    return () => {
      revokeBlob(imageBlobRef.current);
    };
  }, []);

  useEffect(() => {
    if (!isEdit || !amenityId) return;

    let mounted = true;
    const controller = new AbortController();
    setLoading(true);

    amenitiesService
      .getAmenityById(amenityId, controller.signal)
      .then((data) => {
        if (!mounted) return;
        const amenity = data?.amenity;
        if (!amenity) {
          throw new Error("Amenity not found in response");
        }
        setName(amenity.name || "");
        setCategory(amenity.category || "");
        setDescription(amenity.description || "");
        setIsActive(amenity.isActive !== false);
        setUsageCount(amenity.usageCount ?? 0);
        setCreatedAt(amenity.createdAt);
        setUpdatedAt(amenity.updatedAt);
        setImagePreview(amenity.imageUrl ?? null);
        setImageFile(null);
        setRemoveImage(false);
      })
      .catch((error) => {
        if (!mounted || isAbortError(error)) return;
        push({
          type: "error",
          title: "Failed to load amenity",
          description: getApiErrorMessage(error, "Unable to fetch amenity details."),
        });
        navigate("/amenities");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
      controller.abort();
    };
  }, [amenityId, isEdit, navigate, push]);

  const handleImageUpload = (file: File) => {
    revokeBlob(imageBlobRef.current);
    const url = URL.createObjectURL(file);
    imageBlobRef.current = url;
    setImagePreview(url);
    setImageFile(file);
    setRemoveImage(false);
  };

  const handleDeleteImage = () => {
    revokeBlob(imageBlobRef.current);
    imageBlobRef.current = null;
    setImagePreview(null);
    setImageFile(null);
    setRemoveImage(true);
  };

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      push({
        type: "error",
        title: "Validation",
        description: "Name is required.",
      });
      return;
    }
    if (!category) {
      push({
        type: "error",
        title: "Validation",
        description: "Category is required.",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: trimmedName,
        category,
        description,
        isActive,
        imageFile,
        removeImage: isEdit ? removeImage : undefined,
      };

      if (isEdit) {
        await amenitiesService.updateAmenity(amenityId, payload);
        push({
          type: "success",
          title: "Amenity updated",
          description: "Changes saved successfully.",
        });
      } else {
        await amenitiesService.createAmenity(payload);
        push({
          type: "success",
          title: "Amenity created",
          description: "New amenity added successfully.",
        });
      }
      navigate("/amenities");
    } catch (error) {
      push({
        type: "error",
        title: isEdit ? "Update failed" : "Create failed",
        description: getApiErrorMessage(error, "Could not save amenity."),
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
        <Header
          title={isEdit ? "Edit Amenity" : "Add Amenity"}
          showBack
          onBackClick={() => navigate("/amenities")}
        />
        <div className="flex justify-center py-[60px]">
          <Loader size={80} />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <Header
        title={isEdit ? "Edit Amenity" : "Add Amenity"}
        showBack
        onBackClick={() => navigate("/amenities")}
      />

      <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">
        <div className="space-y-[25px]">
          <div className={sectionClass}>
            <h3 className={sectionTitleClass}>Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
              <div>
                <label className={labelClass}>
                  Name <span className="text-[#EA3934]">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter amenity name"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. basic, safety, outdoor"
                  className={inputClass}
                />
              </div>
              <Toggle label="Active" checked={isActive} onChange={setIsActive} />
              <div className="md:col-span-2">
                <label className={labelClass}>Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value.slice(0, 500))}
                  placeholder="Enter description (max 500 characters)"
                  className={`${textareaClass} h-[120px]`}
                />
                <p className="text-[12px] text-[#707070] mt-[6px] text-right">
                  {description.length}/500
                </p>
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <h3 className={sectionTitleClass}>Image</h3>
            <MediaUploadBlock
              title="Amenity image"
              description="Upload an image for this amenity (optional)"
              previewSrc={imagePreview}
              onUpload={handleImageUpload}
              onDelete={handleDeleteImage}
            />
          </div>

          {isEdit && (
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Usage Statistics</h3>
              <div className="max-w-[240px]">
                <label className={labelClass}>Usage Count</label>
                <input
                  type="number"
                  readOnly
                  value={usageCount}
                  className={`${inputClass} bg-[#F9F9F9] cursor-not-allowed`}
                />
              </div>
            </div>
          )}

          {isEdit && (
            <div className={sectionClass}>
              <h3 className={sectionTitleClass}>Timestamps</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
                <div>
                  <label className={labelClass}>Created At</label>
                  <input
                    type="text"
                    readOnly
                    value={formatAmenityDate(createdAt)}
                    className={`${inputClass} bg-[#F9F9F9] cursor-not-allowed`}
                  />
                </div>
                <div>
                  <label className={labelClass}>Updated At</label>
                  <input
                    type="text"
                    readOnly
                    value={formatAmenityDate(updatedAt)}
                    className={`${inputClass} bg-[#F9F9F9] cursor-not-allowed`}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-[12px] mt-[28px] pt-[20px] border-t border-[#EAEAEA]">
          <button
            type="button"
            onClick={() => navigate("/amenities")}
            disabled={saving}
            className="h-[44px] px-[24px] rounded-[10px] border border-[#EAEAEA] text-[14px] font-[Medium] text-[#222] cursor-pointer disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSave()}
            disabled={saving}
            className="h-[44px] px-[24px] rounded-[10px] bg-[#6A3CA8] text-white text-[14px] font-[SemiBold] cursor-pointer disabled:opacity-60 min-w-[120px]"
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Amenity"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AmenitiesDetail;
