import { useEffect, useMemo, useRef, useState } from "react";
import "quill/dist/quill.snow.css";
import { useNavigate, useSearchParams } from "react-router-dom";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { blogsService } from "../../../services/blogsService";
import type { BlogCategoryRecord, BlogSeoFields, BlogTagRecord } from "../../../types/api";
import {
    Dropdown,
    SaveBar,
    SeoSection,
    TextAreaField,
    TextField,
    Toggle,
    sectionClass,
    sectionTitleClass,
} from "../shared/CmsFormShared";

const STATUS_OPTIONS = [
    { value: "published", label: "Published" },
    { value: "draft", label: "Draft" },
];

const emptySeo: BlogSeoFields = {
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
};

const isHtmlContentEmpty = (html: string) => {
    const text = html
        .replace(/<[^>]*>/g, " ")
        .replace(/&nbsp;/gi, " ")
        .replace(/\s+/g, " ")
        .trim();
    return !text;
};

function BlogDetailSettings() {
    const navigate = useNavigate();
    const { push } = useToast();
    const [searchParams] = useSearchParams();
    const postId = searchParams.get("id") || "";

    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<BlogCategoryRecord[]>([]);
    const [tags, setTags] = useState<BlogTagRecord[]>([]);
    const [blogImgBaseUrl, setBlogImgBaseUrl] = useState("");

    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [excerpt, setExcerpt] = useState("");
    const [content, setContent] = useState("");
    const [coverImage, setCoverImage] = useState("");
    const [coverImagePreview, setCoverImagePreview] = useState("");
    const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const objectUrlRef = useRef<string | null>(null);
    const quillRef = useRef<HTMLDivElement | null>(null);
    const quillImageInputRef = useRef<HTMLInputElement | null>(null);
    const [quill, setQuill] = useState<any>(null);
    const hasHydratedContent = useRef(false);

    const [categorySlug, setCategorySlug] = useState("");
    const [subcategorySlug, setSubcategorySlug] = useState("");
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [authorName, setAuthorName] = useState("Admin");
    const [readingTime, setReadingTime] = useState(5);
    const [publishDate, setPublishDate] = useState(new Date().toISOString().slice(0, 10));
    const [displayOrder, setDisplayOrder] = useState(1);
    const [isFeatured, setIsFeatured] = useState(false);
    const [isPublished, setIsPublished] = useState(false);
    const [seo, setSeo] = useState<BlogSeoFields>(emptySeo);

    const subcategoryOptions = useMemo(() => {
        const category = categories.find((item) => item.slug === categorySlug);
        return category?.subcategories || [];
    }, [categories, categorySlug]);

    const resolveImageSrc = (filename: string) => {
        const raw = (filename || "").trim();
        if (!raw) return "";
        if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:")) return raw;
        const base = blogImgBaseUrl.replace(/\/+$/, "");
        return base ? `${base}/${encodeURIComponent(raw)}` : raw;
    };

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();

        Promise.all([
            blogsService.getBlogs({ postId: postId || undefined }, controller.signal),
            blogsService.getSupportedUrls(controller.signal),
        ])
            .then(([data, urls]) => {
                if (!mounted) return;
                setCategories(data.categories || []);
                setTags(data.tags || []);
                setBlogImgBaseUrl((urls.supportedUrls?.blogUrl?.img || "").trim());

                const post = data.post;
                if (post) {
                    setTitle(post.title || "");
                    setSlug(post.slug || "");
                    setExcerpt(post.excerpt || "");
                    setContent(post.content || "");
                    setCoverImage(post.coverImage || "");
                    setCoverImagePreview(resolveImageSrc(post.coverImage || ""));
                    setCategorySlug(post.categorySlug || "");
                    setSubcategorySlug(post.subcategorySlug || "");
                    setSelectedTags(post.tags || []);
                    setAuthorName(post.authorName || "Admin");
                    setReadingTime(post.readingTime || 5);
                    setPublishDate(post.publishDate || new Date().toISOString().slice(0, 10));
                    setDisplayOrder(post.displayOrder || 1);
                    setIsFeatured(Boolean(post.isFeatured));
                    setIsPublished(Boolean(post.isPublished));
                    setSeo(post.seo || emptySeo);
                } else if (data.categories?.[0]) {
                    setCategorySlug(data.categories[0].slug);
                    setSubcategorySlug(data.categories[0].subcategories?.[0]?.slug || "");
                }
            })
            .catch((err) => {
                if (!controller.signal.aborted) {
                    push({
                        type: "error",
                        title: "Failed to load blog post",
                        description: getApiErrorMessage(err, "Failed to load blog post"),
                    });
                }
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
            controller.abort();
        };
    }, [postId, push]);

    useEffect(() => {
        if (!subcategoryOptions.length) {
            setSubcategorySlug("");
            return;
        }
        if (!subcategoryOptions.some((item) => item.slug === subcategorySlug)) {
            setSubcategorySlug(subcategoryOptions[0].slug);
        }
    }, [subcategoryOptions, subcategorySlug]);

    useEffect(() => {
        hasHydratedContent.current = false;
    }, [postId]);

    useEffect(() => {
        let mounted = true;
        let instance: any = null;

        const initQuill = async () => {
            if (!quillRef.current) return;
            try {
                const { default: Quill } = await import("quill");
                if (!mounted || !quillRef.current) return;

                instance = new Quill(quillRef.current, {
                    theme: "snow",
                    modules: {
                        toolbar: [
                            [{ header: [1, 2, 3, false] }],
                            ["bold", "italic", "underline"],
                            [{ list: "ordered" }, { list: "bullet" }],
                            ["link"],
                            ["clean"],
                        ],
                    },
                });
                setQuill(instance);
            } catch {
                setQuill(null);
            }
        };

        if (!loading) {
            void initQuill();
        }

        return () => {
            mounted = false;
            setQuill(null);
            instance = null;
        };
    }, [loading]);

    useEffect(() => {
        if (!quill) return;

        if (!hasHydratedContent.current) {
            quill.clipboard?.dangerouslyPasteHTML?.(content || "");
            hasHydratedContent.current = true;
        }

        const onTextChange = () => {
            setContent(quill.root.innerHTML);
        };
        quill.on("text-change", onTextChange);

        try {
            const toolbar = quill.getModule("toolbar") as { addHandler?: (name: string, cb: () => void) => void };
            toolbar?.addHandler?.("image", () => quillImageInputRef.current?.click());
        } catch {
            // No-op
        }

        return () => {
            quill.off("text-change", onTextChange);
        };
    }, [quill, content]);

    const insertQuillImageFromFile = (file: File) => {
        if (!quill || !file.type.startsWith("image/")) return;
        const reader = new FileReader();
        reader.onload = () => {
            const range = quill.getSelection(true);
            const index = range ? range.index : quill.getLength();
            quill.insertEmbed(index, "image", String(reader.result), "user");
            quill.setSelection(index + 1, 0, "user");
        };
        reader.readAsDataURL(file);
    };

    useEffect(() => {
        const input = quillImageInputRef.current;
        if (!input) return;
        const onFileChange = (event: Event) => {
            const target = event.target as HTMLInputElement;
            const file = target.files?.[0];
            if (file) insertQuillImageFromFile(file);
            target.value = "";
        };
        input.addEventListener("change", onFileChange);
        return () => input.removeEventListener("change", onFileChange);
    }, [quill]);

    const handleSave = async () => {
        if (!title.trim() || isHtmlContentEmpty(content)) {
            push({
                type: "error",
                title: "Title and content are required",
                description: "Please fill in the title and content before saving.",
            });
            return;
        }

        try {
            await blogsService.savePost({
                postId: postId || undefined,
                title: title.trim(),
                slug: slug.trim() || title.trim().toLowerCase().replace(/\s+/g, "-"),
                excerpt,
                content,
                categorySlug,
                subcategorySlug,
                tags: selectedTags,
                authorName,
                readingTime,
                publishDate,
                displayOrder,
                isFeatured,
                isPublished,
                coverImage: coverImageFile ? undefined : coverImage,
                coverImageFile,
                seo,
            });
            push({
                type: "success",
                title: "Blog post saved",
                description: "Your blog post was saved successfully.",
            });
            navigate("/cmsblogs");
        } catch (err) {
            push({
                type: "error",
                title: "Failed to save blog post",
                description: getApiErrorMessage(err, "Failed to save blog post"),
            });
        }
    };

    if (loading) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
                <Header title="Blog Detail" showBack={true} onBackClick={() => navigate("/cmsblogs")} />
                <Loader />
            </div>
        );
    }

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Header title="Blog Detail" showBack={true} onBackClick={() => navigate("/cmsblogs")} />

            <div className="mt-[20px]">
                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Primary Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                        <TextField label="Title" value={title} onChange={setTitle} required />
                        <TextField label="Slug" value={slug} onChange={setSlug} required />
                        <div className="md:col-span-2">
                            <TextAreaField label="Excerpt" value={excerpt} onChange={setExcerpt} rows={3} />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                Article Content <span className="text-[#EA3934]">*</span>
                            </label>
                            <div className="edittoolbar relative min-h-[320px] border border-[rgba(34,34,34,0.10)] rounded-[12px] overflow-hidden bg-white">
                                <style>
                                    {`
                                    .blog-quill .ql-editor {
                                        min-height: 240px;
                                    }
                                    .blog-quill .ql-editor img {
                                        max-width: 100%;
                                        height: auto;
                                    }
                                `}
                                </style>
                                <div ref={quillRef} className="blog-quill h-[280px]" />
                            </div>
                            <input
                                ref={quillImageInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                            />
                        </div>
                    </div>
                </div>

                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Media & Metadata</h3>
                    <div className="border border-[#EAEAEA] rounded-[12px] p-[16px] mb-[16px]">
                        <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[10px]">Cover Image Upload</label>
                        <div className="flex items-center gap-[12px] flex-wrap">
                            <div className="w-[120px] h-[80px] rounded-[8px] border border-[#EAEAEA] bg-[#F5F5F5] overflow-hidden flex items-center justify-center">
                                {coverImagePreview ? (
                                    <img src={coverImagePreview} alt="Cover preview" className="w-full h-full object-cover" />
                                ) : (
                                    <p className="text-[11px] text-[#707070] px-[8px] text-center">No image</p>
                                )}
                            </div>
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    if (objectUrlRef.current?.startsWith("blob:")) {
                                        URL.revokeObjectURL(objectUrlRef.current);
                                    }
                                    const objectUrl = URL.createObjectURL(file);
                                    objectUrlRef.current = objectUrl;
                                    setCoverImagePreview(objectUrl);
                                    setCoverImageFile(file);
                                    e.currentTarget.value = "";
                                }}
                            />
                            <button
                                type="button"
                                onClick={() => fileInputRef.current?.click()}
                                className="h-[38px] px-[14px] rounded-[8px] bg-[#222] text-[#fff] text-[13px] font-[Medium] cursor-pointer"
                            >
                                Upload Image
                            </button>
                            {coverImagePreview && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (objectUrlRef.current?.startsWith("blob:")) {
                                            URL.revokeObjectURL(objectUrlRef.current);
                                        }
                                        objectUrlRef.current = null;
                                        setCoverImagePreview("");
                                        setCoverImage("");
                                        setCoverImageFile(null);
                                    }}
                                    className="h-[38px] px-[14px] rounded-[8px] border border-[#EAEAEA] text-[#EA3934] text-[13px] font-[Medium] cursor-pointer"
                                >
                                    Remove
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                        <TextField label="Cover Image URL / Filename" value={coverImage} onChange={setCoverImage} placeholder="filename.webp" />
                        <Dropdown
                            label="Category"
                            value={categorySlug}
                            options={categories.map((category) => ({
                                value: category.slug,
                                label: category.name,
                            }))}
                            onChange={setCategorySlug}
                        />
                        <Dropdown
                            label="Subcategory"
                            value={subcategorySlug}
                            options={subcategoryOptions.map((item) => ({
                                value: item.slug,
                                label: item.name,
                            }))}
                            onChange={setSubcategorySlug}
                        />
                        <TextField label="Author Name" value={authorName} onChange={setAuthorName} />
                        <TextField label="Estimated Read Time (minutes)" value={String(readingTime)} onChange={(v) => setReadingTime(Number(v) || 5)} type="number" />
                        <TextField label="Publish Date" value={publishDate} onChange={setPublishDate} type="date" />
                        <TextField label="Display Order" value={String(displayOrder)} onChange={(v) => setDisplayOrder(Number(v) || 1)} type="number" />
                        <div>
                            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Status</label>
                            <Dropdown
                                label=""
                                value={isPublished ? "published" : "draft"}
                                options={STATUS_OPTIONS}
                                onChange={(v) => setIsPublished(v === "published")}
                            />
                        </div>
                        <Toggle label="Featured Article" checked={isFeatured} onChange={setIsFeatured} />
                    </div>
                </div>

                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Tags</h3>
                    <div className="flex flex-wrap gap-[8px]">
                        {tags.map((tag) => {
                            const active = selectedTags.includes(tag.name);
                            return (
                                <button
                                    key={tag.slug}
                                    type="button"
                                    onClick={() =>
                                        setSelectedTags((prev) =>
                                            active ? prev.filter((name) => name !== tag.name) : [...prev, tag.name]
                                        )
                                    }
                                    className={`px-[12px] py-[8px] rounded-[20px] text-[12px] font-[Medium] cursor-pointer border ${
                                        active ? "bg-[#6A3CA8] text-white border-[#6A3CA8]" : "bg-white text-[#222] border-[#EAEAEA]"
                                    }`}
                                >
                                    {tag.name}
                                </button>
                            );
                        })}
                    </div>
                    <p className="text-[12px] text-[#707070] mt-[8px]">
                        Selected: {selectedTags.join(", ") || "None"}
                    </p>
                </div>

                <SeoSection seo={seo} onChange={setSeo} />
                <SaveBar onSave={handleSave} />
            </div>
        </div>
    );
}

export default BlogDetailSettings;
