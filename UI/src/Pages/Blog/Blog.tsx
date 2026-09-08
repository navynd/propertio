import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "../../assets/styles/Blog/Blog.scss";
import { BreadcrumbsComponentFirstLevel } from "../../Components/parts/component";
import { DownArrowIconBlack, SearchIcon } from "../../Components/parts/icon";
import blog1 from "../../assets/img/blog1.jpg";
import avatar from "../../assets/img/header_person.png";
import PFContainer from "../../Components/container/PFContainer";
import PFPagination from "../../Components/pagination/PFPagination";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  getBlogImageBaseUrl,
  listBlogs,
  resolveBlogImage,
  type BlogCard,
  type BlogCategory,
  type BlogPageSettings,
} from "../../services/blogService";

const FALLBACK_IMAGE = blog1;
const FALLBACK_AVATAR = avatar;

const DEFAULT_SETTINGS: BlogPageSettings = {
  pageTitle: "Browse our blogs",
  pageSubtitle: "We provide tips and resources from industries and market standards",
  featuredSectionTitle: "Top stories",
  itemsPerPage: 9,
  showSearch: true,
  showCategoryFilters: true,
  enableComments: true,
};

const sortOptions = [
  { label: "Newest", value: "newest" as const },
  { label: "Oldest", value: "oldest" as const },
  { label: "Popular", value: "popular" as const },
];

const Blog: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sortDropdownRef = useRef<HTMLDivElement>(null);

  const [settings, setSettings] = useState<BlogPageSettings>(DEFAULT_SETTINGS);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [featured, setFeatured] = useState<BlogCard | null>(null);
  const [topStories, setTopStories] = useState<BlogCard[]>([]);
  const [posts, setPosts] = useState<BlogCard[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [imgBaseUrl, setImgBaseUrl] = useState("");

  const initialSearch = searchParams.get("search")?.trim() || "";
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [appliedSearch, setAppliedSearch] = useState(initialSearch);
  const [activeCategorySlug, setActiveCategorySlug] = useState("");
  const [activeSubcategorySlug, setActiveSubcategorySlug] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [sortValue, setSortValue] = useState(sortOptions[0].value);
  const [sortOpen, setSortOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const selectedCategory = useMemo(
    () => categories.find((item) => item.slug === activeCategorySlug) ?? categories[0],
    [activeCategorySlug, categories]
  );

  const subcategories = selectedCategory?.subcategories ?? [];

  useEffect(() => {
    getBlogImageBaseUrl().then(setImgBaseUrl);
  }, []);

  useEffect(() => {
    if (!categories.length) return;
    if (!activeCategorySlug || !categories.some((c) => c.slug === activeCategorySlug)) {
      setActiveCategorySlug(categories[0].slug);
    }
  }, [activeCategorySlug, categories]);

  useEffect(() => {
    if (!subcategories.length) return;
    if (
      !activeSubcategorySlug ||
      !subcategories.some((s) => s.slug === activeSubcategorySlug)
    ) {
      setActiveSubcategorySlug(subcategories[0].slug);
    }
  }, [activeSubcategorySlug, subcategories]);

  const fetchBlogs = useCallback(async () => {
    setLoading(true);
    try {
      const data = await listBlogs({
        category: activeCategorySlug || undefined,
        subcategory: activeSubcategorySlug || undefined,
        search: appliedSearch.trim() || undefined,
        sortBy: sortValue,
        page: currentPage,
        limit: DEFAULT_SETTINGS.itemsPerPage,
      });
      setSettings(data.settings || DEFAULT_SETTINGS);
      const nextCategories = data.categories || [];
      setCategories(nextCategories);
      if (!activeCategorySlug && nextCategories[0]?.slug) {
        setActiveCategorySlug(nextCategories[0].slug);
      }
      setFeatured(data.featured);
      setTopStories(data.topStories || []);
      setPosts(data.posts || []);
      setTotalPages(data.pagination?.pages || 1);
    } catch {
      setPosts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [activeCategorySlug, activeSubcategorySlug, appliedSearch, currentPage, sortValue]);

  useEffect(() => {
    fetchBlogs();
  }, [fetchBlogs]);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeCategorySlug, activeSubcategorySlug, sortValue, appliedSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        sortDropdownRef.current &&
        !sortDropdownRef.current.contains(event.target as Node)
      ) {
        setSortOpen(false);
      }
    };
    if (sortOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [sortOpen]);

  const sortLabel =
    sortOptions.find((item) => item.value === sortValue)?.label ?? sortOptions[0].label;

  const openPost = (slug: string) => navigate(`/blog/${slug}`);

  const handleSearch = () => setAppliedSearch(searchQuery.trim());

  const renderCardImage = (card: BlogCard) =>
    resolveBlogImage(card.image, imgBaseUrl, FALLBACK_IMAGE);

  const renderAvatar = (card: BlogCard) =>
    resolveBlogImage(card.authorAvatar, imgBaseUrl, FALLBACK_AVATAR);

  return (
    <>
      <div className="pf-blog">
        <PFContainer>
          <div className="pf-blog__breadcrumb">
            <BreadcrumbsComponentFirstLevel
              breadcrumbTitle="Home"
              breadcrumbSubTitle1="Blog"
              breadcrumbLinkTitleTo="/"
            />
          </div>
        </PFContainer>
        <header className="pf-blog__header">
          <h1 className="pf-blog__title">{settings.pageTitle}</h1>
          <p className="pf-blog__subtitle">{settings.pageSubtitle}</p>
        </header>

        {settings.showSearch !== false && (
          <div className="pf-blog__search-wrap">
            <div className="pf-blog__search-bar">
              <SearchIcon className="pf-blog__search-icon" />
              <input
                type="text"
                className="pf-blog__search-input"
                placeholder="Looking for something specific"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <button type="button" className="pf-blog__search-btn" onClick={handleSearch}>
                Search now
              </button>
            </div>
          </div>
        )}

        <PFContainer
          component="section"
          className="pf-blog__top-stories"
          aria-labelledby="pf-blog-top-stories-heading"
        >
          <h2 id="pf-blog-top-stories-heading" className="pf-blog__top-stories-title">
            {settings.featuredSectionTitle || "Top stories"}
          </h2>
          <div className="pf-blog__top-stories-grid">
            <article className="pf-blog__featured">
              {featured ? (
                <button
                  type="button"
                  className="pf-blog__featured-media"
                  onClick={() => openPost(featured.slug)}
                  style={{ border: "none", padding: 0, cursor: "pointer", width: "100%", textAlign: "left" }}
                >
                  <img
                    src={renderCardImage(featured)}
                    alt={featured.title}
                    className="pf-blog__featured-img"
                  />
                  <div className="pf-blog__featured-overlay" />
                  <div className="pf-blog__featured-inner">
                    <div className="pf-blog__featured-content">
                      <div className="pf-blog__featured-header">
                        <h3 className="pf-blog__featured-headline">{featured.title}</h3>
                        <span className="pf-blog__featured-link" aria-hidden>
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                            <path
                              d="M7 17L17 7M17 7H9M17 7V15"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      </div>
                      <p className="pf-blog__featured-excerpt">{featured.excerpt}</p>
                      <div className="pf-blog__featured-footer">
                        <div className="pf-blog__featured-meta">
                          <img
                            className="pf-blog__featured-avatar"
                            src={renderAvatar(featured)}
                            alt={featured.authorName}
                          />
                          <span className="pf-blog__featured-author">{featured.authorName}</span>
                          <span className="pf-blog__featured-meta-sep" />
                          <span className="pf-blog__featured-date-wrap">
                            <time dateTime={featured.publishedAt}>{featured.publishedDate}</time>
                          </span>
                        </div>
                        <span className="pf-blog__featured-tag">{featured.tag}</span>
                      </div>
                    </div>
                  </div>
                </button>
              ) : (
                <div className="pf-blog__featured-media">
                  <img src={FALLBACK_IMAGE} alt="" className="pf-blog__featured-img" />
                </div>
              )}
            </article>

            <ul className="pf-blog__side-list">
              {topStories.map((item) => (
                <li key={item.id} className="pf-blog__side-item">
                  <button
                    type="button"
                    className="pf-blog__side-btn"
                    onClick={() => openPost(item.slug)}
                  >
                    <span className="pf-blog__side-thumb">
                      <img src={renderCardImage(item)} alt="" />
                    </span>
                    <span className="pf-blog__side-text">{item.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </PFContainer>

        {settings.showCategoryFilters !== false && categories.length > 0 && (
          <PFContainer component="section" className="pf-blog__categories" aria-label="Blog categories">
            <div className="pf-blog__category-tabs">
              {categories.map((category) => (
                <button
                  key={category.slug}
                  type="button"
                  className={`pf-blog__category-tab ${activeCategorySlug === category.slug ? "is-active" : ""}`}
                  onClick={() => setActiveCategorySlug(category.slug)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </PFContainer>
        )}
      </div>

      <div>
        <PFContainer component="section" className="pf-blog__guide">
          <div className="pf-blog__guide-top">
            <div className="pf-blog__guide-types" role="tablist" aria-label="Guide types">
              {subcategories.map((type) => (
                <button
                  key={type.slug}
                  type="button"
                  role="tab"
                  aria-selected={activeSubcategorySlug === type.slug}
                  className={`pf-blog__guide-pill ${activeSubcategorySlug === type.slug ? "is-active" : ""}`}
                  onClick={() => setActiveSubcategorySlug(type.slug)}
                >
                  {type.name}
                </button>
              ))}
            </div>

            <div className="pf-blog__sort">
              <span className="pf-blog__sort-label">Sort Transactions by:</span>
              <div ref={sortDropdownRef} className="pf-blog__custom-select" style={{ position: "relative" }}>
                <button
                  type="button"
                  className="pf-blog__select-btn"
                  onClick={() => setSortOpen((prev) => !prev)}
                >
                  <span className="pf-blog__select-name">{sortLabel}</span>
                  <DownArrowIconBlack width={13} height={13} />
                </button>
                {sortOpen && (
                  <div className="pf-blog__dropdown">
                    {sortOptions.map((item) => (
                      <button
                        key={item.value}
                        type="button"
                        className={`pf-blog__dropdown-item ${sortValue === item.value ? "active" : ""}`}
                        onClick={() => {
                          setSortValue(item.value);
                          setSortOpen(false);
                        }}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pf-blog__guide-grid">
            {loading && <div className="pf-blog__guide-empty">Loading articles...</div>}
            {!loading &&
              posts.map((card) => (
                <article
                  key={card.id}
                  className="pf-blog__guide-card"
                  onClick={() => openPost(card.slug)}
                  onKeyDown={(e) => e.key === "Enter" && openPost(card.slug)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="pf-blog__guide-image-wrap">
                    <span className="pf-blog__guide-badge">{card.tag}</span>
                    <img
                      src={renderCardImage(card)}
                      alt={card.title}
                      className="pf-blog__guide-image"
                    />
                  </div>
                  <div className="pf-blog__guide-body">
                    <h3 className="pf-blog__guide-title">{card.title}</h3>
                    <p className="pf-blog__guide-text">{card.text}</p>
                    <div className="pf-blog__guide-meta">
                      <img
                        src={renderAvatar(card)}
                        alt={card.authorName}
                        className="pf-blog__guide-avatar"
                      />
                      <span>{card.authorName}</span>
                      <span className="pf-blog__guide-dot">•</span>
                      <time dateTime={card.publishedAt}>{card.publishedDate}</time>
                    </div>
                  </div>
                </article>
              ))}
            {!loading && posts.length === 0 && (
              <div className="pf-blog__guide-empty">No articles available in this section yet.</div>
            )}
          </div>

          {totalPages > 1 && (
            <div className="pf-blog__pagination">
              <PFPagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
              />
            </div>
          )}
        </PFContainer>
      </div>
    </>
  );
};

export default Blog;
