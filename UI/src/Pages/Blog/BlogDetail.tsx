import React, { useCallback, useEffect, useRef, useState } from "react";
import "../../assets/styles/Blog/BlogDetail.scss";
import "../../assets/styles/propertyDrilldown.scss";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedInIcon,
  LeftArrowIcon,
  RightArrowIcon,
  SearchIcon,
  TwitterIcon,
  DownArrowIcon,
} from "../../Components/parts/icon";
import blog1 from "../../assets/img/blog1.jpg";
import avatar from "../../assets/img/header_person.png";
import like from "../../assets/img/like.svg";
import dislike from "../../assets/img/unlike.svg";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentSecondLevel } from "../../Components/parts/component";
import RecommendedCard, {
  type RecommendedProperty,
} from "../../Components/cards/RecommendedCard";
import { useNavigate, useParams } from "react-router-dom";
import {
  getBlogBySlug,
  getBlogGuestKey,
  getBlogImageBaseUrl,
  mutateBlog,
  resolveBlogImage,
  type BlogCard,
  type BlogComment,
} from "../../services/blogService";

const FALLBACK_IMAGE = blog1;
const FALLBACK_AVATAR = avatar;

const BlogDetail: React.FC = () => {
  const { slug = "" } = useParams<{ slug: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [imgBaseUrl, setImgBaseUrl] = useState("");
  const [postTitle, setPostTitle] = useState("");
  const [postContent, setPostContent] = useState("");
  const [postImage, setPostImage] = useState(FALLBACK_IMAGE);
  const [postTag, setPostTag] = useState("New Article");
  const [authorName, setAuthorName] = useState("");
  const [authorAvatar, setAuthorAvatar] = useState(FALLBACK_AVATAR);
  const [publishedDate, setPublishedDate] = useState("");
  const [commentsCount, setCommentsCount] = useState(0);
  const [allowComments, setAllowComments] = useState(true);
  const [comments, setComments] = useState<BlogComment[]>([]);
  const [recentPosts, setRecentPosts] = useState<BlogCard[]>([]);
  const [relatedProperties, setRelatedProperties] = useState<RecommendedProperty[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [openReplies, setOpenReplies] = useState<Record<string, boolean>>({});
  const [showAllComments, setShowAllComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const propertiesForSaleRef = useRef<HTMLDivElement | null>(null);
  const [canScrollPropertiesLeft, setCanScrollPropertiesLeft] = useState(false);
  const [canScrollPropertiesRight, setCanScrollPropertiesRight] = useState(false);

  const loadDetail = useCallback(async () => {
    if (!slug) return;
    setLoading(true);
    try {
      const data = await getBlogBySlug(slug);
      const post = data.post;
      setPostTitle(post.title);
      setPostContent(post.content || "");
      setPostImage(resolveBlogImage(post.image, imgBaseUrl, FALLBACK_IMAGE));
      setPostTag(post.tag || "New Article");
      setAuthorName(post.authorName || "Admin");
      setAuthorAvatar(resolveBlogImage(post.authorAvatar, imgBaseUrl, FALLBACK_AVATAR));
      setPublishedDate(post.publishedDate);
      setCommentsCount(post.commentsCount || 0);
      setAllowComments(post.allowComments !== false && data.settings.enableComments !== false);
      setComments(data.comments || []);
      setRecentPosts(data.recentPosts || []);
      setRelatedProperties(data.relatedProperties || []);
    } catch {
      setPostTitle("Blog not found");
      setPostContent("");
      setComments([]);
      setRecentPosts([]);
      setRelatedProperties([]);
    } finally {
      setLoading(false);
    }
  }, [imgBaseUrl, slug]);

  useEffect(() => {
    getBlogImageBaseUrl().then(setImgBaseUrl);
  }, []);

  useEffect(() => {
    loadDetail();
  }, [loadDetail]);

  const updatePropertiesScrollState = useCallback(() => {
    const container = propertiesForSaleRef.current;
    if (!container) return;
    const { scrollLeft, scrollWidth, clientWidth } = container;
    const maxScrollLeft = Math.max(scrollWidth - clientWidth, 0);
    setCanScrollPropertiesLeft(scrollLeft > 0);
    setCanScrollPropertiesRight(scrollLeft < maxScrollLeft - 1);
  }, []);

  const scrollPropertiesForSale = (direction: "left" | "right") => {
    const container = propertiesForSaleRef.current;
    if (!container) return;
    container.scrollBy({ left: direction === "left" ? -320 : 320, behavior: "smooth" });
  };

  useEffect(() => {
    updatePropertiesScrollState();
    const container = propertiesForSaleRef.current;
    if (!container) return;
    const handleScroll = () => updatePropertiesScrollState();
    const handleResize = () => updatePropertiesScrollState();
    container.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleResize);
    return () => {
      container.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
    };
  }, [relatedProperties, updatePropertiesScrollState]);

  const toggleReplies = (commentId: string) => {
    setOpenReplies((prev) => ({ ...prev, [commentId]: !prev[commentId] }));
  };

  const handlePostComment = async () => {
    const text = commentText.trim();
    if (!text || !slug || submitting) return;
    setSubmitting(true);
    try {
      await mutateBlog({ action: "comment", slug, text, guestKey: getBlogGuestKey() });
      setCommentText("");
      await loadDetail();
    } finally {
      setSubmitting(false);
    }
  };

  const handlePostReply = async (parentId: string) => {
    const text = replyText.trim();
    if (!text || !slug || submitting) return;
    setSubmitting(true);
    try {
      await mutateBlog({
        action: "reply",
        slug,
        text,
        parentId,
        guestKey: getBlogGuestKey(),
      });
      setReplyText("");
      setReplyingTo(null);
      setOpenReplies((prev) => ({ ...prev, [parentId]: true }));
      await loadDetail();
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (commentId: string, reaction: "like" | "dislike") => {
    if (!slug || submitting) return;
    setSubmitting(true);
    try {
      await mutateBlog({
        action: "react",
        slug,
        commentId,
        reaction,
        guestKey: getBlogGuestKey(),
      });
      await loadDetail();
    } finally {
      setSubmitting(false);
    }
  };

  const visibleComments = showAllComments ? comments : comments.slice(0, 3);

  const renderCardImage = (card: BlogCard) =>
    resolveBlogImage(card.image, imgBaseUrl, FALLBACK_IMAGE);

  if (loading) {
    return (
      <div className="pf-blog-detail">
        <PFContainer>
          <p>Loading...</p>
        </PFContainer>
      </div>
    );
  }

  return (
    <div className="pf-blog-detail">
      <PFContainer>
        <BreadcrumbsComponentSecondLevel
          breadcrumbTitle="Home"
          breadcrumbSubTitle1="Blog"
          breadcrumbSubTitle2={postTitle}
          breadcrumbLinkTitleTo="/"
          breadcrumbLinkSubTitle1To="/blog"
          breadcrumbLinkSubTitle2To={`/blog/${slug}`}
        />

        <div className="pf-blog-detail__layout">
          <article className="pf-blog-detail__content">
            <div>
              <h1 className="pf-blog-detail__title">{postTitle}</h1>
              <div className="pf-blog-detail__meta">
                <img src={authorAvatar} alt={authorName} />
                <span>{authorName}</span>
                <span className="pf-blog-detail__dot">•</span>
                <span>{publishedDate}</span>
                <span className="pf-blog-detail__dot">•</span>
                <span>
                  {commentsCount} comment{commentsCount === 1 ? "" : "s"}
                </span>
              </div>
            </div>

            <div className="pf-blog-detail__hero">
              <img src={postImage} alt={postTitle} />
              <span className="pf-blog-detail__badge">{postTag}</span>
            </div>

            {postContent ? (
              <div
                className="pf-blog-detail__paragraphs pf-blog-detail__html-content"
                dangerouslySetInnerHTML={{ __html: postContent }}
              />
            ) : (
              <div className="pf-blog-detail__paragraphs">
                <p className="pf-blog-detail__paragraph">Content not available.</p>
              </div>
            )}

            {relatedProperties.length > 0 && (
              <section className="pf-blog-detail__properties">
                <div className="pf-blog-detail__properties-header">
                  <h3 className="pf-blog-detail__properties-title">Properties for sale</h3>
                  <div className="pf-blog-detail__properties-arrows">
                    <button
                      type="button"
                      className="pf-blog-detail__properties-arrow"
                      aria-label="Previous property"
                      onClick={() => scrollPropertiesForSale("left")}
                      disabled={!canScrollPropertiesLeft}
                    >
                      <LeftArrowIcon width="20" height="20" fill="#222222" />
                    </button>
                    <button
                      type="button"
                      className="pf-blog-detail__properties-arrow"
                      aria-label="Next property"
                      onClick={() => scrollPropertiesForSale("right")}
                      disabled={!canScrollPropertiesRight}
                    >
                      <RightArrowIcon width="20" height="20" fill="#222222" />
                    </button>
                  </div>
                </div>
                <div className="pf-blog-detail__properties-grid" ref={propertiesForSaleRef}>
                  {relatedProperties.map((item, index) => (
                    <RecommendedCard
                      key={item.id || `${item.title}-${index}`}
                      property={item}
                      onClick={
                        item.id
                          ? () => navigate(`/propertydrilldown/${item.id}`)
                          : undefined
                      }
                    />
                  ))}
                </div>
                <div>
                  <button
                    type="button"
                    className="pf-blog-detail__properties-view-all"
                    onClick={() => navigate("/searchlisting")}
                  >
                    View all properties
                  </button>
                </div>
              </section>
            )}

            {allowComments && (
              <section className="pf-blog-detail__comments">
                <h3 className="pf-blog-detail__comments-title">Comments</h3>

                <div className="pf-blog-detail__comment-box">
                  <textarea
                    placeholder="Write your comments"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <div className="pf-blog-detail__comment-box-footer">
                    <button type="button" className="pf-blog-detail__comment-submit" onClick={handlePostComment} disabled={submitting}>
                      Post comment
                    </button>
                  </div>
                </div>

                <div className="pf-blog-detail__thread">
                  {visibleComments.map((comment) => {
                    const hasReplies = (comment.replies?.length ?? 0) > 0;
                    const isRepliesOpen = !!openReplies[comment.id];

                    return (
                      <article key={comment.id} className="pf-blog-detail__comment">
                        <img src={FALLBACK_AVATAR} alt={comment.author} className="pf-blog-detail__comment-avatar" />
                        <div className="pf-blog-detail__comment-body">
                          <div className="pf-blog-detail__comment-head">
                            <span className="pf-blog-detail__comment-author">{comment.author}</span>
                            <span className="pf-blog-detail__dot">•</span>
                            <span className="pf-blog-detail__comment-date">{comment.date}</span>
                          </div>
                          <p className="pf-blog-detail__comment-text">{comment.text}</p>
                          <div className="pf-blog-detail__comment-actions">
                            <button type="button" onClick={() => setReplyingTo(comment.id)}>
                              Reply
                            </button>
                            <button
                              type="button"
                              className="pf-blog-detail__action-with-icon"
                              onClick={() => handleReaction(comment.id, "like")}
                              disabled={submitting}
                            >
                              <img src={like} alt="" aria-hidden />
                              <span>{comment.likes} Likes</span>
                            </button>
                            <button
                              type="button"
                              className="pf-blog-detail__action-with-icon"
                              onClick={() => handleReaction(comment.id, "dislike")}
                              disabled={submitting}
                            >
                              <img src={dislike} alt="" aria-hidden />
                              <span>{comment.dislikes} Dislikes</span>
                            </button>
                            {hasReplies && (
                              <button
                                type="button"
                                className="pf-blog-detail__view-replies"
                                onClick={() => toggleReplies(comment.id)}
                              >
                                {isRepliesOpen ? "Hide replies" : "View replies"}
                                <span
                                  className={`pf-blog-detail__view-replies-arrow${
                                    isRepliesOpen ? " pf-blog-detail__view-replies-arrow--open" : ""
                                  }`}
                                >
                                  <DownArrowIcon width="12" height="12" fill="#0832AE" />
                                </span>
                              </button>
                            )}
                          </div>

                          {replyingTo === comment.id && (
                            <div className="pf-blog-detail__reply-input">
                              <textarea
                                placeholder="Write a reply"
                                value={replyText}
                                onChange={(e) => setReplyText(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => handlePostReply(comment.id)}
                                disabled={submitting}
                              >
                                Post reply
                              </button>
                            </div>
                          )}

                          {hasReplies && isRepliesOpen && (
                            <div className="pf-blog-detail__reply-wrap">
                              {comment.replies?.map((reply) => (
                                <article key={reply.id} className="pf-blog-detail__reply">
                                  <img src={FALLBACK_AVATAR} alt={reply.author} className="pf-blog-detail__comment-avatar" />
                                  <div className="pf-blog-detail__comment-body">
                                    <div className="pf-blog-detail__comment-head">
                                      <span className="pf-blog-detail__comment-author">{reply.author}</span>
                                      <span className="pf-blog-detail__dot">•</span>
                                      <span className="pf-blog-detail__comment-date">{reply.date}</span>
                                    </div>
                                    <p className="pf-blog-detail__comment-text">{reply.text}</p>
                                    <div className="pf-blog-detail__comment-actions">
                                      <button
                                        type="button"
                                        className="pf-blog-detail__action-with-icon"
                                        onClick={() => handleReaction(reply.id, "like")}
                                        disabled={submitting}
                                      >
                                        <img src={like} alt="" aria-hidden />
                                        <span>{reply.likes} Likes</span>
                                      </button>
                                      <button
                                        type="button"
                                        className="pf-blog-detail__action-with-icon"
                                        onClick={() => handleReaction(reply.id, "dislike")}
                                        disabled={submitting}
                                      >
                                        <img src={dislike} alt="" aria-hidden />
                                        <span>{reply.dislikes} Dislikes</span>
                                      </button>
                                    </div>
                                  </div>
                                </article>
                              ))}
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })}
                </div>

                {comments.length > 3 && (
                  <div className="pf-blog-detail__comments-more">
                    <button type="button" onClick={() => setShowAllComments((prev) => !prev)}>
                      {showAllComments ? "View less" : "View more"}
                    </button>
                    <div className="pf-blog-detail__comments-more-arrow">
                      <RightArrowIcon width="14" height="14" fill="#FFF" />
                    </div>
                  </div>
                )}
              </section>
            )}
          </article>

          <aside className="pf-blog-detail__sidebar">
            <div className="pf-blog-detail__search">
              <SearchIcon className="pf-blog-detail__search-icon" />
              <input
                type="text"
                placeholder="Search for blog"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && searchQuery.trim()) {
                    navigate(`/blog?search=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
              />
            </div>

            <div className="pf-blog-detail__recent">
              <h3>Recent Blogs</h3>
              {recentPosts.map((item) => (
                <button
                  key={item.id}
                  className="pf-blog-detail__recent-item"
                  type="button"
                  onClick={() => navigate(`/blog/${item.slug}`)}
                >
                  <img src={renderCardImage(item)} alt="Recent blog" />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>

            <div className="pf-blog-detail__share">
              <p>Share it on:</p>
              <div className="pf-blog-detail__socials">
                <button type="button" aria-label="Facebook" className="is-facebook">
                  <FacebookIcon width={30} height={30} />
                </button>
                <button type="button" aria-label="Instagram" className="is-instagram">
                  <InstagramIcon width={30} height={30} />
                </button>
                <button type="button" aria-label="X" className="is-twitter">
                  <TwitterIcon width={30} height={30} />
                </button>
                <button type="button" aria-label="LinkedIn" className="is-linkedin">
                  <LinkedInIcon width={30} height={30} />
                </button>
              </div>
            </div>
          </aside>
        </div>
      </PFContainer>
    </div>
  );
};

export default BlogDetail;
