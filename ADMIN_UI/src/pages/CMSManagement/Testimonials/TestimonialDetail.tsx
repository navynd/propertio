import { useEffect, useRef, useState } from "react";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { testimonialService } from "../../../services/testimonialService";
import { apiClient } from "../../../services/apiClient";
import type { SupportedUrlsResponse } from "../../../types/api";
import profileimg from "../../../assets/img/profileless.png";
import { SaveBar, TextAreaField, TextField, Toggle, sectionClass, sectionTitleClass } from "../shared/CmsFormShared";

function TestimonialDetail() {
    const navigate = useNavigate();
    const { push } = useToast();
    const [searchParams] = useSearchParams();
    const testimonialId = searchParams.get("id") || "";

    const fileInputRef = useRef<HTMLInputElement>(null);
    const objectUrlRef = useRef<string | null>(null);

    const [loading, setLoading] = useState(Boolean(testimonialId));
    const [imgBaseUrl, setImgBaseUrl] = useState("");

    const [name, setName] = useState("");
    const [title, setTitle] = useState("Customer");
    const [content, setContent] = useState("");
    const [rating, setRating] = useState("");
    const [displayOrder, setDisplayOrder] = useState(1);
    const [isActive, setIsActive] = useState(true);
    const [image, setImage] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);

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
                    testimonialService.getTestimonials(
                        testimonialId ? { testimonialId } : {},
                        controller.signal
                    ),
                    apiClient.get<SupportedUrlsResponse>(
                        "/master-data?types=supportedurls",
                        { auth: true, signal: controller.signal }
                    ),
                ]);

                if (!mounted) return;

                const base =
                    (data.mediaBaseUrl?.img || urls.supportedUrls?.testimonialUrl?.img || "").trim();
                setImgBaseUrl(base);

                const item = data.testimonial || data.testimonials?.[0];
                if (item) {
                    setName(item.name || "");
                    setTitle(item.title || "Customer");
                    setContent(item.content || "");
                    setRating(item.rating != null ? String(item.rating) : "");
                    setDisplayOrder(item.displayOrder || 1);
                    setIsActive(item.isActive !== false);
                    setImage(item.image || "");
                    const imagePreview = item.image
                        ? resolveImageSrcWithBase(item.image, base)
                        : null;
                    setPreview(imagePreview || null);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    push({
                        type: "error",
                        title: "Failed to load testimonial",
                        description: getApiErrorMessage(error, "Unable to fetch testimonial."),
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
    }, [testimonialId, push]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
        }
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setPreview(url);
        setImageFile(file);
    };

    const handleSave = async () => {
        if (!name.trim() || !content.trim()) {
            push({
                type: "error",
                title: "Validation",
                description: "Customer name and quote are required.",
            });
            return;
        }

        const parsedRating = rating.trim() ? Number(rating) : null;

        try {
            await testimonialService.saveTestimonial({
                testimonialId: testimonialId || undefined,
                name,
                title,
                content,
                rating: parsedRating,
                displayOrder,
                isActive,
                image: imageFile ? undefined : image,
                imageFile,
            });
            push({ type: "success", title: "Saved", description: "Testimonial saved." });
            navigate("/cmstestimonials");
        } catch (error) {
            push({
                type: "error",
                title: "Save failed",
                description: getApiErrorMessage(error, "Unable to save testimonial."),
            });
        }
    };

    if (loading) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
                <Header title="Testimonial" showBack={true} onBackClick={() => navigate("/cmstestimonials")} />
                <Loader />
            </div>
        );
    }

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Header title="Testimonial" showBack={true} onBackClick={() => navigate("/cmstestimonials")} />

            <div className="mt-[20px]">
                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Customer Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                        <TextField label="Customer Name" value={name} onChange={setName} required />
                        <TextField label="Role / Designation" value={title} onChange={setTitle} />
                        <TextField
                            label="Star Rating (1–5)"
                            value={rating}
                            onChange={setRating}
                            type="number"
                        />
                        <TextField
                            label="Display Order"
                            value={String(displayOrder)}
                            onChange={(v) => setDisplayOrder(Number(v) || 0)}
                            type="number"
                        />
                        <Toggle label="Active on Home" checked={isActive} onChange={setIsActive} />
                        <div className="md:col-span-2">
                            <TextAreaField
                                label="Testimonial Quote"
                                value={content}
                                onChange={setContent}
                                required
                            />
                        </div>
                    </div>
                </div>

                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Profile Photo</h3>
                    <div className="flex items-center gap-[16px] flex-wrap">
                        <img src={preview || profileimg} alt="Profile" className="w-[80px] h-[80px] rounded-full object-cover border border-[#EAEAEA]" />
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="h-[42px] px-[18px] rounded-[10px] bg-[#222] text-[#fff] text-[14px] font-[Medium] cursor-pointer">
                            Upload Photo
                        </button>
                    </div>
                </div>

                <SaveBar onSave={handleSave} />
            </div>
        </div>
    );
}

export default TestimonialDetail;
