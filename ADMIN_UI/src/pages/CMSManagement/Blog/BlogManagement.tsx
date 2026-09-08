import { useCallback, useEffect, useMemo, useState } from "react";
import { EditIcon, SearchIcon, TrashIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Pagenation from "../../../components/Pagenation/Pagenation";
import Loader from "../../../components/Loader/loader";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { blogsService } from "../../../services/blogsService";
import type { BlogPageSettings, BlogPostRecord } from "../../../types/api";
import { defaultBlogPageSettings } from "../cmsData";
import {
    SaveBar,
    SeoSection,
    TextAreaField,
    TextField,
    Toggle,
    sectionClass,
    sectionTitleClass,
} from "../shared/CmsFormShared";

function BlogManagement() {
    const navigate = useNavigate();
    const { push } = useToast();
    const [settings, setSettings] = useState<BlogPageSettings>(defaultBlogPageSettings);
    const [categories, setCategories] = useState<{ name: string; slug: string }[]>([]);
    const [posts, setPosts] = useState<BlogPostRecord[]>([]);
    const [search, setSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);

    const itemsPerPage = 5;

    const fetchBlogs = useCallback(async () => {
        setLoading(true);
        try {
            const data = await blogsService.getBlogs({
                page: currentPage,
                limit: itemsPerPage,
                search: search.trim() || undefined,
            });
            setSettings(data.settings || defaultBlogPageSettings);
            setCategories((data.categories || []).map((c) => ({ name: c.name, slug: c.slug })));
            setPosts(data.posts || []);
            setTotalPages(data.pagination?.pages || 1);
        } catch (err) {
            push({
                type: "error",
                title: "Failed to load blogs",
                description: getApiErrorMessage(err, "Failed to load blogs"),
            });
            setPosts([]);
        } finally {
            setLoading(false);
        }
    }, [currentPage, push, search]);

    useEffect(() => {
        fetchBlogs();
    }, [fetchBlogs]);

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    const categoryNameBySlug = useMemo(() => {
        const map = new Map(categories.map((c) => [c.slug, c.name]));
        return (slug?: string) => map.get(slug || "") || slug || "—";
    }, [categories]);

    const handleSaveSettings = async () => {
        try {
            const data = await blogsService.saveSettings(settings);
            setSettings(data.settings);
            push({
                type: "success",
                title: "Blog settings saved",
                description: "Your blog overview settings were updated.",
            });
        } catch (err) {
            push({
                type: "error",
                title: "Failed to save blog settings",
                description: getApiErrorMessage(err, "Failed to save blog settings"),
            });
        }
    };

    const handleDeletePost = async (post: BlogPostRecord) => {
        const result = await Swal.fire({
            title: "Delete blog post?",
            text: `Delete "${post.title}"? This cannot be undone.`,
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#EA3934",
            confirmButtonText: "Delete",
        });
        if (!result.isConfirmed) return;

        try {
            await blogsService.deletePost(post.id);
            push({
                type: "success",
                title: "Blog post deleted",
                description: "The blog post was removed successfully.",
            });
            await fetchBlogs();
        } catch (err) {
            push({
                type: "error",
                title: "Failed to delete blog post",
                description: getApiErrorMessage(err, "Failed to delete blog post"),
            });
        }
    };

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Header title="Blog Management" showBack={false} onBackClick={() => { }} />

            <div className="mt-[20px]">
                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Blog Overview Page Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                        <TextField label="Page Title" value={settings.pageTitle} onChange={(v) => setSettings((p) => ({ ...p, pageTitle: v }))} />
                        <TextAreaField label="Page Subtitle" value={settings.pageSubtitle} onChange={(v) => setSettings((p) => ({ ...p, pageSubtitle: v }))} rows={2} />
                        <TextField label="Featured Section Title" value={settings.featuredSectionTitle} onChange={(v) => setSettings((p) => ({ ...p, featuredSectionTitle: v }))} />
                        <TextField label="Featured Section Subtitle" value={settings.featuredSectionSubtitle} onChange={(v) => setSettings((p) => ({ ...p, featuredSectionSubtitle: v }))} />
                        <TextField label="Items Per Page" value={String(settings.itemsPerPage)} onChange={(v) => setSettings((p) => ({ ...p, itemsPerPage: Number(v) || 9 }))} type="number" />
                        <Toggle label="Show Search Bar" checked={settings.showSearch} onChange={(v) => setSettings((p) => ({ ...p, showSearch: v }))} />
                        <Toggle label="Show Category Filters" checked={settings.showCategoryFilters} onChange={(v) => setSettings((p) => ({ ...p, showCategoryFilters: v }))} />
                        <Toggle label="Show Recent Posts Sidebar" checked={settings.showRecentPostsSidebar} onChange={(v) => setSettings((p) => ({ ...p, showRecentPostsSidebar: v }))} />
                        <Toggle label="Enable Comments" checked={settings.enableComments} onChange={(v) => setSettings((p) => ({ ...p, enableComments: v }))} />
                    </div>
                </div>

                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Taxonomy</h3>
                    <p className="text-[13px] text-[#707070] mb-[8px]">
                        Categories: {categories.map((c) => c.name).join(", ") || "—"}
                    </p>
                </div>

                <div className="p-[20px] bg-[#fff] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px] mb-[20px]">
                    <div className="flex items-center justify-between mb-[30px] gap-[10px] flex-wrap">
                        <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[15px] px-[14px] h-[40px] w-full md:w-[280px]">
                            <SearchIcon className="text-[#707070] shrink-0" />
                            <input
                                type="search"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Search blog title"
                                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                            />
                        </div>
                        <button
                            type="button"
                            onClick={() => navigate("/cmsblogdetail")}
                            className="h-[40px] px-[18px] rounded-[10px] bg-[#6A3CA8] text-[#fff] text-[13px] font-[Bold] cursor-pointer"
                        >
                            + Add Blog Post
                        </button>
                    </div>

                    {loading ? (
                        <Loader />
                    ) : (
                        <>
                            <div className="overflow-x-auto w-full scrollbar-hide mb-[30px]">
                                <div className="min-w-[850px]">
                                    <div className="rounded-[10px] border border-[rgba(34,34,34,0.08)] overflow-hidden bg-white">
                                        <div className="grid grid-cols-[1.8fr_1fr_1fr_0.8fr_0.8fr] gap-[16px] items-center px-[14px] py-[12px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.08)]">
                                            <p className="text-[14px] font-[SemiBold] text-[#222]">Title</p>
                                            <p className="text-[14px] font-[SemiBold] text-[#222]">Category</p>
                                            <p className="text-[14px] font-[SemiBold] text-[#222]">Publish Date</p>
                                            <p className="text-[14px] font-[SemiBold] text-[#222]">Status</p>
                                            <p className="text-[14px] font-[SemiBold] text-[#222]">Actions</p>
                                        </div>
                                        {posts.length === 0 ? (
                                            <div className="px-[14px] py-[24px] text-[13px] text-[#707070]">No blog posts found.</div>
                                        ) : (
                                            posts.map((post) => (
                                                <div key={post.id} className="grid grid-cols-[1.8fr_1fr_1fr_0.8fr_0.8fr] gap-[16px] items-center px-[14px] py-[14px] border-b border-[rgba(34,34,34,0.06)]">
                                                    <p className="text-[13px] font-[Medium] text-[#222]">{post.title}</p>
                                                    <p className="text-[13px] text-[#707070]">{categoryNameBySlug(post.categorySlug)}</p>
                                                    <p className="text-[13px] text-[#707070]">{post.publishDate || "—"}</p>
                                                    <span className={`text-[12px] font-[Medium] px-[10px] py-[4px] rounded-full w-fit ${post.isPublished ? "bg-[#E8F5EE] text-[#05A666]" : "bg-[#FFF2F2] text-[#EA3934]"}`}>
                                                        {post.isPublished ? "Published" : "Draft"}
                                                    </span>
                                                    <div className="flex items-center gap-[10px]">
                                                        <button type="button" onClick={() => navigate(`/cmsblogdetail?id=${post.id}`)} className="cursor-pointer">
                                                            <EditIcon />
                                                        </button>
                                                        <button type="button" onClick={() => handleDeletePost(post)} className="cursor-pointer">
                                                            <TrashIcon />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </div>
                            </div>

                            <Pagenation
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        </>
                    )}
                </div>

                <SeoSection seo={settings.seo} onChange={(seo) => setSettings((p) => ({ ...p, seo }))} />
                <SaveBar onSave={handleSaveSettings} />
            </div>
        </div>
    );
}

export default BlogManagement;
