import { useMemo, useState } from "react";
import { EditIcon, PlusIcon, TrashIcon } from "../../../../../components/CustomFile/icons";

const Frq = () => {
    const [showFaq, setShowFaq] = useState(false);

    // ✅ Store all FAQs
    const [faqs, setFaqs] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
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
    const handleSave = () => {
        const validFaqs = faqForms.filter(
            (f) => f.title.trim() && f.answer.trim()
        );

        if (!validFaqs.length) return;

        const formatted = validFaqs.map((f) => ({
            id: Date.now() + Math.random(),
            title: f.title,
            answer: f.answer
        }));

        setFaqs((prev) => [...prev, ...formatted]);

        // reset forms
        setFaqForms([{ id: Date.now(), title: "", answer: "" }]);

        setShowForm(false);
    };

    // ✅ Delete one
    const handleDelete = (id: number) => {
        const confirmDelete = window.confirm("Delete this FAQ?");
        if (!confirmDelete) return;

        setFaqs((prev) => prev.filter((item) => item.id !== id));
    };

    // ✅ Delete all
    const handleDeleteAll = () => {
        setFaqs([]);
    };
    const handleDiscard = () => {
        // hide only form
        setShowForm(false);

        // reset forms
        setFaqForms([{ id: Date.now(), title: "", answer: "" }]);
    };

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

                                            aria-label="Delete FAQ"
                                        >
                                            <EditIcon width={20} height={20} fill="#222222" />
                                        </button>

                                        <button
                                            type="button"
                                            className="cursor-pointer flex items-center justify-center"
                                            onClick={() => handleDelete(faq.id)}
                                            aria-label="Delete FAQ"
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
                                    <div className="text-[#222] text-[15px] font-[Bold] leading-[160%] mb-[12px]">Add faq</div>
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
                                        className="cursor-pointer h-[44px] rounded-[10px] bg-[#D4A373] px-[16px] text-[14px] font-[Bold] text-white"
                                    >
                                        Save the questions
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDiscard}
                                        className="cursor-pointer h-[44px] rounded-[10px] border border-[#222] bg-white px-[16px] text-[14px] font-[SemiBold] text-[#222]"
                                    >
                                        Discard
                                    </button>
                                </div>

                                <button
                                    type="button"
                                    className="cursor-pointer bg-white flex items-center justify-center gap-[6px] text-[12px] font-[SemiBold] text-[#222]"
                                    aria-label="Delete all FAQs"
                                    title="Delete all"
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
                    <button className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-[15px] border border-dashed border-[#0832AE]  bg-white md:p-[30px] p-[20px] h-[33px] w-full text-[12px] font-[SemiBold] text-[#0832AE] shrink-0">
                        <PlusIcon width={16} height={16} fill="#0832AE" />
                        Add Frequently asked questions
                    </button>
                </div>
            )}
        </div>
    );
};

export default Frq;
