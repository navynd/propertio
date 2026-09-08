import { useEffect, useRef, useState } from "react";
import { EditIcon, PlusIcon, TrashIcon } from "../../../../components/CustomFile/icons";
import { developerService } from "../../../../services/developerService";
import { toast } from "../../../../services/toast";

type FAQItem = { question?: string; answer?: string; _id?: string };
type FrqProps = {
    initialFaqs?: FAQItem[];
    projectId?: string;
    onPendingDeleteIdsChange?: (ids: string[]) => void;
};

type FAQViewItem = {
    id: string;
    title: string;
    answer: string;
};

const normalizeFaqs = (items: FAQItem[]) =>
    items.map((f, idx) => ({
        id: String(f._id || `temp-${idx + 1}`),
        title: f.question || "",
        answer: f.answer || "",
    }));

const faqListSignature = (items: FAQItem[]) =>
    JSON.stringify(
        items.map((f) => [String(f._id ?? ""), f.question ?? "", f.answer ?? ""])
    );

const Frq = ({ initialFaqs, projectId, onPendingDeleteIdsChange }: FrqProps) => {
    const [showFaq, setShowFaq] = useState((initialFaqs || []).length > 0);

    // ✅ Store all FAQs
    const [faqs, setFaqs] = useState<FAQViewItem[]>(normalizeFaqs(initialFaqs || []));
    const [showForm, setShowForm] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editingFaqId, setEditingFaqId] = useState<string | null>(null);
    const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);
    const initialFaqsSigRef = useRef<string | null>(null);
    const onPendingDeleteIdsChangeRef = useRef(onPendingDeleteIdsChange);
    onPendingDeleteIdsChangeRef.current = onPendingDeleteIdsChange;
    // ✅ Form state
    const [title, setTitle] = useState("");
    const [answer, setAnswer] = useState("");
    const [faqForms, setFaqForms] = useState([
        { id: Date.now(), title: "", answer: "" }
    ]);
    const handleChange = (id: number, field: string, value: string) => {
        setFaqForms((prev) =>
            prev.map((item) =>
                item.id === id ? { ...item, [field]: value } : item
            )
        );
    };
    const handleAddForm = () => {
        setFaqForms((prev) => [
            ...prev,
            { id: Date.now(), title: "", answer: "" }
        ]);
    };
    // ✅ Add FAQ
    const handleSave = async () => {
        if (!projectId) {
            toast.error("Save failed", "Project ID is missing.");
            return;
        }
        const validFaqs = faqForms.filter(
            (f) => f.title.trim() && f.answer.trim()
        );

        if (!validFaqs.length) return;
        setIsSaving(true);
        try {
            if (editingFaqId) {
                const first = validFaqs[0];
                const updated = await developerService.updateProjectFaq(projectId, editingFaqId, {
                    question: first.title.trim(),
                    answer: first.answer.trim(),
                });
                setFaqs((prev) =>
                    prev.map((faq) =>
                        faq.id === editingFaqId
                            ? {
                                id: updated._id || editingFaqId,
                                title: updated.question || first.title.trim(),
                                answer: updated.answer || first.answer.trim(),
                            }
                            : faq
                    )
                );
                toast.success("Updated", "FAQ updated successfully.");
            } else {
                const created = await Promise.all(
                    validFaqs.map((item, index) =>
                        developerService.addProjectFaq(projectId, {
                            question: item.title.trim(),
                            answer: item.answer.trim(),
                            order: faqs.length + index,
                        })
                    )
                );
                const formatted = created.map((f, idx) => ({
                    id: String(f._id || `created-${Date.now()}-${idx}`),
                    title: f.question || validFaqs[idx].title.trim(),
                    answer: f.answer || validFaqs[idx].answer.trim(),
                }));
                setFaqs((prev) => [...prev, ...formatted]);
                setShowFaq(true);
                toast.success("Added", "FAQ added successfully.");
            }

            setFaqForms([{ id: Date.now(), title: "", answer: "" }]);
            setEditingFaqId(null);
            setShowForm(false);
        } catch (error: unknown) {
            toast.error(
                "Save failed",
                (error as { message?: string })?.message || "Failed to save FAQ."
            );
        } finally {
            setIsSaving(false);
        }
    };

    // ✅ Delete one
    const handleDelete = (id: string) => {
        setFaqs((prev) => prev.filter((item) => item.id !== id));
        if (!id.startsWith("temp-")) {
            setPendingDeleteIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
        }
    };

    // ✅ Delete all
    const handleDeleteAll = () => {
        if (!faqs.length) return;
        const ids = faqs.map((faq) => faq.id).filter((id) => !id.startsWith("temp-"));
        setPendingDeleteIds((prev) => Array.from(new Set([...prev, ...ids])));
        setFaqs([]);
        setShowFaq(false);
    };
    const handleDiscard = () => {
        // hide only form
        setShowForm(false);
        setEditingFaqId(null);

        // reset forms
        setFaqForms([{ id: Date.now(), title: "", answer: "" }]);
    };
    useEffect(() => {
        const items = initialFaqs || [];
        const nextSig = faqListSignature(items);
        if (initialFaqsSigRef.current === nextSig) return;
        initialFaqsSigRef.current = nextSig;
        const mapped = normalizeFaqs(items);
        setFaqs(mapped);
        setShowFaq(mapped.length > 0);
        setPendingDeleteIds([]);
    }, [initialFaqs]);
    useEffect(() => {
        onPendingDeleteIdsChangeRef.current?.(pendingDeleteIds);
    }, [pendingDeleteIds]);

    return (
        <div className="rounded-[15px] bg-white md:p-[22px] p-[20px] min-w-0 flex flex-col gap-[20px]">
            {/* Header */}
            {faqs.length > 0 && (
                <div className="flex items-center justify-between gap-4">
                    <h2 className="text-[#222] text-[20px] font-[Bold] leading-[140%]">
                        Frequently asked questions
                    </h2>
                </div>
            )}

            {showFaq && (
                <div className="flex flex-col gap-[20px]">
                    {/* Existing FAQs */}
                    <div className="flex flex-col gap-[12px]">
                        {faqs.map((faq) => (
                            <div key={faq.id} className="rounded-[15px] bg-[#FFF] border border-[rgba(34,34,34,0.10)]">
                                <div className="flex items-center justify-between gap-[10px] md:p-[20px] p-[16px] bg-[#F5F5F5] border-b border-[rgba(34,34,34,0.10)] rounded-t-[15px]">
                                    <p className="text-[#222] font-[Bold] text-[15px] leading-[160%]">

                                        {faq.title}
                                    </p>
                                    <div className="flex items-center gap-[15px]">
                                        <button
                                            type="button"
                                            className="cursor-pointer flex items-center justify-center"
                                            onClick={() => {
                                                setEditingFaqId(faq.id);
                                                setFaqForms([{ id: Date.now(), title: faq.title, answer: faq.answer }]);
                                                setShowFaq(true);
                                                setShowForm(true);
                                            }}
                                            aria-label="Edit FAQ"
                                            disabled={isSaving}
                                        >
                                            <EditIcon width={20} height={20} fill="#222222" />
                                        </button>

                                        <button
                                            type="button"
                                            className="cursor-pointer flex items-center justify-center"
                                            onClick={() => handleDelete(faq.id)}
                                            aria-label="Delete FAQ"
                                            disabled={isSaving}
                                        >
                                            <TrashIcon width={20} height={20} fill="#222222" />
                                        </button>
                                    </div>
                                </div>
                                <div className="md:p-[20px] p-[16px]">
                                    <p className="text-[#707070] font-[Regular] text-[11px] md:text-[12px] leading-[160%]">
                                        {faq.answer}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                    {showForm && (
                        <>
                            {/* Add FAQ form */}
                            {faqForms.map((form) => (
                                <div key={form.id} className="rounded-[15px] border border-[rgba(34,34,34,0.06)] bg-[#F5F5F5] p-[20px]">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="text-[#222] text-[15px] font-[Bold] leading-[160%] mb-[12px]">Add faq</div>
                                        <button
                                            type="button"
                                            className="cursor-pointer flex items-center justify-center"
                                            onClick={() => handleDelete(String(form.id))}
                                            aria-label="Delete FAQ"
                                            disabled={isSaving}
                                        >
                                            <TrashIcon width={20} height={20} fill="#222222" />
                                        </button>
                                    </div>

                                    <div className="flex flex-col gap-[14px] ">
                                        <div className="flex flex-col gap-[8px]">
                                            <label className="text-[#222] text-[14px] font-[SemiBold]">Faq title</label>
                                            <input
                                                type="text"
                                                value={form.title}
                                                onChange={(e) =>
                                                    handleChange(form.id, "title", e.target.value)
                                                }
                                                placeholder="Enter faq title"
                                                className="bg-[#FFF] w-full h-[40px] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] text-[13px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-[8px]">
                                            <label className="text-[#222] text-[14px] font-[SemiBold]">Faq answer</label>
                                            <textarea
                                                value={form.answer}
                                                onChange={(e) =>
                                                    handleChange(form.id, "answer", e.target.value)
                                                }
                                                placeholder="Describe answer"
                                                rows={4}
                                                className="bg-[#FFF] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] py-[10px] text-[13px] font-[Regular] text-[#222] placeholder:text-[#707070] focus:outline-none resize-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {/* Add question */}
                            <div className="mt-[14px]">
                                <button
                                    type="button"
                                    onClick={handleAddForm}
                                    className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-[5px] bg-[#rgba(8,50,174,0.10)] border border-[#rgba(8,50,174,0.30)] bg-white px-[14px] h-[21px] text-[12px] font-[SemiBold] text-[#0832AE]">
                                    <PlusIcon width={16} height={16} fill="#0832AE" />
                                    Add new question
                                </button>
                            </div>
                            {/* Footer actions */}
                            <div className="flex items-center justify-between gap-4 pt-[6px]">
                                <div className="flex items-center gap-[10px]">
                                    <button
                                        type="button"
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="cursor-pointer h-[44px] rounded-[10px] bg-[#D4A373] px-[16px] text-[14px] font-[Bold] text-white"
                                    >
                                        {isSaving ? "Saving..." : "Save the questions"}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDiscard}
                                        disabled={isSaving}
                                        className="cursor-pointer h-[44px] rounded-[10px] border border-[#222] bg-white px-[16px] text-[14px] font-[SemiBold] text-[#222]"
                                    >
                                        Discard
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    onClick={handleDeleteAll}
                                    className="cursor-pointer bg-white flex items-center justify-center gap-[6px] text-[12px] font-[SemiBold] text-[#222]"
                                    aria-label="Delete all FAQs"
                                    title="Delete all"
                                    disabled={isSaving}
                                >
                                    <TrashIcon width={20} height={20} fill="#222" />
                                    Delete all
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}
            {!showForm && (
                <div onClick={() => { setShowFaq(true); setShowForm(true); }} className="rounded-[15px] bg-white min-w-0 flex justify-between flex-wrap gap-[20px]">
                    <button className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-[15px] border border-dashed border-[rgba(34,34,34,0.30)]  bg-white md:p-[30px] p-[20px] h-[33px] w-full text-[12px] font-[SemiBold] text-[#0832AE] shrink-0">
                        <PlusIcon width={16} height={16} fill="#0832AE" />
                        Add Frequently asked questions
                    </button>
                </div>
            )}
        </div>
    );
};

export default Frq;
