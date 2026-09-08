import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { sitemapService } from "../../../services/sitemapService";
import type { SitemapDocumentRecord } from "../../../types/api";
import { TextField } from "../shared/CmsFormShared";

type SitemapCategorySectionProps = {
  countryCode: string;
  documents: SitemapDocumentRecord[];
  onSaved: () => void;
};

const newCategoryDraft = (countryCode: string): SitemapDocumentRecord => ({
  categoryName: "",
  countryCode,
  content: "",
  isActive: true,
  displayOrder: 0,
});

export function SitemapCategorySection({
  countryCode,
  documents,
  onSaved,
}: SitemapCategorySectionProps) {
  const { push } = useToast();
  const [activeDocId, setActiveDocId] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [content, setContent] = useState("");
  const [isNewCategory, setIsNewCategory] = useState(false);
  const quillRef = useRef<HTMLDivElement | null>(null);
  const [quill, setQuill] = useState<any>(null);
  const hasHydratedContent = useRef(false);

  const visibleDocuments = useMemo(
    () =>
      documents
        .filter(
          (doc) => (doc.countryCode || "AE").toUpperCase() === countryCode.toUpperCase()
        )
        .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)),
    [documents, countryCode]
  );

  const activeDoc = useMemo(() => {
    if (isNewCategory) return null;
    return visibleDocuments.find((doc) => doc.id === activeDocId) ?? visibleDocuments[0] ?? null;
  }, [visibleDocuments, activeDocId, isNewCategory]);

  useEffect(() => {
    setIsNewCategory(false);
    const first = visibleDocuments[0];
    setActiveDocId((prev) => {
      if (prev && visibleDocuments.some((doc) => doc.id === prev)) return prev;
      return first?.id || "";
    });
  }, [countryCode, visibleDocuments]);

  useEffect(() => {
    if (isNewCategory) {
      setCategoryName("");
      setContent("");
      hasHydratedContent.current = false;
      return;
    }
    if (!activeDoc) {
      setCategoryName("");
      setContent("");
      return;
    }
    setCategoryName(activeDoc.categoryName || "");
    setContent(activeDoc.content || "");
    hasHydratedContent.current = false;
  }, [activeDoc?.id, isNewCategory]);

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

    void initQuill();

    return () => {
      mounted = false;
      setQuill(null);
      instance = null;
    };
  }, []);

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

    return () => {
      quill.off("text-change", onTextChange);
    };
  }, [quill, activeDoc?.id, isNewCategory, content]);

  const handleSaveCategory = async () => {
    const name = categoryName.trim();
    if (!name) {
      push({
        type: "error",
        title: "Category required",
        description: "Enter a category name before saving.",
      });
      return;
    }

    try {
      const payload: SitemapDocumentRecord = {
        ...(isNewCategory ? newCategoryDraft(countryCode) : activeDoc!),
        categoryName: name,
        countryCode,
        content,
      };

      await sitemapService.saveDocument(payload);
      push({
        type: "success",
        title: "Category saved",
        description: `"${name}" saved for ${countryCode}.`,
      });
      setIsNewCategory(false);
      onSaved();
    } catch (error) {
      push({
        type: "error",
        title: "Save failed",
        description: getApiErrorMessage(error, "Could not save category."),
      });
    }
  };

  const handleDeleteCategory = async () => {
    if (!activeDoc?.id || isNewCategory) return;

    const result = await Swal.fire({
      title: "Delete category?",
      text: `Remove "${activeDoc.categoryName}"? This cannot be undone.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Delete",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#EA3934",
      reverseButtons: true,
    });
    if (!result.isConfirmed) return;

    try {
      await sitemapService.deleteDocument(activeDoc.id);
      push({
        type: "success",
        title: "Category deleted",
        description: `"${activeDoc.categoryName}" removed.`,
      });
      setActiveDocId("");
      onSaved();
    } catch (error) {
      push({
        type: "error",
        title: "Delete failed",
        description: getApiErrorMessage(error, "Could not delete category."),
      });
    }
  };

  const handleAddCategory = () => {
    setIsNewCategory(true);
    setActiveDocId("");
    if (quill) {
      quill.clipboard?.dangerouslyPasteHTML?.("");
    }
  };

  const showEditor = isNewCategory || activeDoc || visibleDocuments.length === 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-[8px] mb-[20px]">
        {visibleDocuments.length > 0 && (
          <div className="border-b border-[rgba(34,34,34,0.10)] overflow-x-auto scrollbar-hide">
            <div className="flex min-w-full w-max flex-nowrap gap-[28px]">
              {visibleDocuments.map((doc) => {
                const active = !isNewCategory && activeDoc?.id === doc.id;
                return (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => {
                      setIsNewCategory(false);
                      setActiveDocId(doc.id || "");
                    }}
                    className={`relative shrink-0 cursor-pointer whitespace-nowrap px-[4px] py-[12px] text-[13px] transition-colors ${
                      active ? "text-[#6A3CA8] font-[SemiBold]" : "text-[#222] font-[Regular]"
                    }`}
                  >
                    {doc.categoryName}
                    {active && (
                      <span className="absolute left-0 right-0 bottom-0 h-[3px] rounded-t-full bg-[#6A3CA8]" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleAddCategory}
          className={`px-[16px] py-[10px] rounded-[10px] text-[13px] font-[Medium] cursor-pointer border ${
            isNewCategory
              ? "bg-[#6A3CA8] text-white border-[#6A3CA8]"
              : "bg-white text-[#6A3CA8] border-[#6A3CA8]"
          }`}
        >
          + Add category
        </button>
      </div>

      {showEditor && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px] mb-[16px]">
            <TextField
              label="Category name"
              value={categoryName}
              onChange={setCategoryName}
              required
              placeholder="e.g. Buy, Rent, Commercial Buy, Apartments for sale"
            />
          </div>

          <p className="text-[14px] font-[Bold] text-[#222] mb-[8px]">Content</p>
          <div className="rounded-[10px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white mb-[16px]">
            <div ref={quillRef} className="min-h-[280px]" />
          </div>

          <div className="flex flex-wrap justify-end items-center gap-[12px] mt-[10px]">
            {!isNewCategory && activeDoc?.id && (
              <button
                type="button"
                onClick={() => void handleDeleteCategory()}
                className="h-[44px] px-[28px] rounded-[10px] text-[14px] font-[Bold] text-[#EA3934] border border-[#EA3934] bg-white cursor-pointer whitespace-nowrap"
              >
                Delete category
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleSaveCategory()}
              className="h-[44px] px-[28px] rounded-[10px] bg-[#6A3CA8] text-[#fff] text-[14px] font-[Bold] cursor-pointer whitespace-nowrap"
            >
              Save Changes
            </button>
          </div>
        </>
      )}
    </>
  );
}
