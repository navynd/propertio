import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import PropertiesEditCommon from "./PropertiesEditCommon";
import "quill/dist/quill.snow.css";

type PropertyFromState = {
    id?: number;
    title?: string;
    location?: string;
};

const MOCK_DESCRIPTION_HTML = `<p>WilliaSed at elit feugiat, dapibus enim mattis, m turner. Vestibulum sit amet arcu dignissim, euismod enim non, porta magna.</p><p><strong>Etiam neque tellus, fermentum a nisl et mattis</strong></p><ul><li>Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem.</li><li>Maecenas nec odio et ante tincidunt tempus.</li><li>Donec vitae sapien ut libero venenatis faucibus.</li></ul>`;

const PropertiesEdit = () => {
    const navigate = useNavigate();
    const [title, setTitle] = useState("");
    const [address, setAddress] = useState("");

    const quillRef = useRef<HTMLDivElement | null>(null);
    const [quill, setQuill] = useState<any>(null);

    const descriptionHtmlRef = useRef("");
    const seededRef = useRef(false);

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
                            ["bold", "italic", "underline", "strike"],
                            [{ list: "ordered" }, { list: "bullet" }],
                            [{ indent: "-1" }, { indent: "+1" }],
                            ["link"],
                        ],
                        history: {
                            delay: 1000,
                            maxStack: 100,
                            userOnly: true,
                        },
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
        const onTextChange = () => {
            descriptionHtmlRef.current = quill.root.innerHTML;
        };
        quill.on("text-change", onTextChange);
        return () => {
            quill.off("text-change", onTextChange);
        };
    }, [quill]);

    useEffect(() => {
        if (!quill || seededRef.current) return;
        seededRef.current = true;
        const html = MOCK_DESCRIPTION_HTML;
        quill.clipboard.dangerouslyPasteHTML(0, html, "silent");
        descriptionHtmlRef.current = quill.root.innerHTML;
    }, [quill]);



    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <div className="rounded-[15px] bg-white md:p-[30px] p-[16px]">
                <h2 className="text-[20px] font-[Bold] text-[#222] mb-[24px]">Fill up the details</h2>

                <div className="flex flex-col gap-[24px]">
                    <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            Property Title <span className="text-[#D4A373]">*</span>
                        </label>
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Enter property title"
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] text-[13px] font-[Regular] text-[#222] placeholder:text-[#A0A0A0] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                            Property Address <span className="text-[#D4A373]">*</span>
                        </label>
                        <input
                            type="text"
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            placeholder="Enter street, area, city"
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] text-[13px] font-[Regular] text-[#222] placeholder:text-[#A0A0A0] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[8px]">
                            Property Description <span className="text-[#D4A373]">*</span>
                        </label>

                        <div className="rounded-[12px] border border-[rgba(34,34,34,0.10)] overflow-hidden bg-white min-h-[320px] flex flex-col">
                            <style>
                                {`
                                    .properties-edit-quill-root {
                                        display: flex;
                                        flex-direction: column;
                                        flex: 1;
                                        min-height: 280px;
                                    }
                                    .properties-edit-quill-root .ql-toolbar.ql-snow {
                                        order: 2;
                                        border: none;
                                        border-top: 1px solid rgba(34,34,34,0.10);
                                        padding: 10px 12px;
                                        display: flex;
                                        flex-wrap: wrap;
                                        justify-content: flex-end;
                                        gap: 4px;
                                        background: #F5F5F5;
                                    }
                                    .properties-edit-quill-root .ql-container.ql-snow {
                                        order: 1;
                                        flex: 1;
                                        display: flex;
                                        flex-direction: column;
                                        border: none;
                                        font-size: 14px;
                                        min-height: 220px;
                                    }
                                    .properties-edit-quill-root .ql-editor {
                                        flex: 1;
                                        min-height: 220px;
                                        max-height: 360px;
                                        overflow-y: auto;
                                        line-height: 1.6;
                                        padding: 14px 16px;
                                    }
                                    .properties-edit-quill-root .ql-editor.ql-blank::before {
                                        color: #94A3B8;
                                        font-style: normal;
                                    }
                                    .properties-edit-quill-root .ql-editor img {
                                        max-width: 100%;
                                        height: auto;
                                    }
                                `}
                            </style>
                            <div ref={quillRef} className="properties-edit-quill-root" />
                        </div>
                    </div>
                </div>
            </div>

            <PropertiesEditCommon />
            <div className="rounded-[15px] bg-white md:p-[30px] p-[16px]">
                {/*Textarea for additional notes*/}
                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                        360 video tour
                    </label>
                    <textarea
                        rows={4}
                        placeholder="Enter 360 video tour"
                        className="h-[180px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] py-[10px] text-[13px] font-[Regular] text-[#222] placeholder:text-[#A0A0A0] focus:outline-none"
                    />
                </div>
            </div>

            <div className="flex justify-end gap-[16px] mt-[15px]">
                <button className="text-[14px] font-[Bold] text-[#222] border border-[#222] px-[20px] h-[44px] rounded-[10px]">Discard</button>
                <button className="text-[14px] font-[Bold] text-[#FFF] px-[20px] h-[44px] rounded-[10px] bg-[#D4A373]">Save Changes</button>
            </div>
        </div>
    );
};

export default PropertiesEdit;
