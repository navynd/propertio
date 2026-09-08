import { useNavigate, } from "react-router-dom";
import DeveloperHeader from "../../../../components/Header/DeveloperHeader";
import { DownArrowIcon, TrashIcon, ChangeIcon } from "../../../../components/CustomFile/icons";
import { useEffect, useRef, useState } from "react";
import floorPlanImg from "../../../../assets/img/pen.jpg";
const UnitEdit = () => {
    const navigate = useNavigate();
    const floorPlanFileRef = useRef<HTMLInputElement>(null);
    const floorPlanBlobRef = useRef<string | null>(null);
    const [floorPlanSrc, setFloorPlanSrc] = useState<string | null>(floorPlanImg);

    useEffect(() => {
        return () => {
            if (floorPlanBlobRef.current) {
                URL.revokeObjectURL(floorPlanBlobRef.current);
                floorPlanBlobRef.current = null;
            }
        };
    }, []);

    const handleFloorPlanFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file?.type.startsWith("image/")) return;
        if (floorPlanBlobRef.current) {
            URL.revokeObjectURL(floorPlanBlobRef.current);
            floorPlanBlobRef.current = null;
        }
        const url = URL.createObjectURL(file);
        floorPlanBlobRef.current = url;
        setFloorPlanSrc(url);
    };

    const handleFloorPlanRemove = () => {
        if (floorPlanBlobRef.current) {
            URL.revokeObjectURL(floorPlanBlobRef.current);
            floorPlanBlobRef.current = null;
        }
        setFloorPlanSrc(null);
    };
    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <div>
                <DeveloperHeader
                    title="Edit Project"
                    showBack={true}
                    onBackClick={() => navigate(-1)}
                />
            </div>

            <div className="rounded-[15px] bg-white md:p-[30px] p-[16px]">
                <h3 className="text-[20px] font-[Bold] text-[#222] mb-[30px]">Unit details</h3>
                <div className="flex items-start justify-between gap-3 mb-[15px]">
                    <h3 className="text-[14px] font-[SemiBold] text-[#0832AE]">Property Type #1*</h3>
                    <button type="button" className="cursor-pointer flex items-center justify-center bg-white">
                        <TrashIcon width={20} height={20} fill="#D4A373" />
                    </button>
                </div>
                <div className="flex flex-col md:p-[20px] p-[15px] bg-[#F5F5F5] rounded-[15px]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px]">
                        <div>
                            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                                Building/Tower Name <span className="text-[12px] text-[#707070] font-[Regular]">(Optional)</span>
                            </label>
                            <input type="text" defaultValue="Tower A" className="h-[44px] w-full bg-[#FFF] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none" />
                        </div>
                        <div>
                            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Property type</label>
                            <button type="button" className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-[#FFF] px-[12px] text-[13px] text-[#222] flex items-center justify-between">
                                Apartment
                                <DownArrowIcon width={10} height={7} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-[30px]">
                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Area of the property <span className="text-[#D4A373]">*</span></label>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
                            <div className="relative">
                                <input type="text" defaultValue="147" className="h-[44px] w-full bg-[#FFF] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[56px] text-[13px] text-[#222] focus:outline-none" />
                                <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070] font-[SemiBold]">Sq.m</span>
                            </div>
                            <div className="relative">
                                <input type="text" defaultValue="147" className="h-[44px] w-full bg-[#FFF] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[56px] text-[13px] text-[#222] focus:outline-none" />
                                <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070] font-[SemiBold]">Sq.ft</span>
                            </div>
                        </div>
                    </div>

                    <div className="mt-[30px] border-t border-[rgba(34,34,34,0.10)] pt-[30px]">
                        <p className="text-[14px] font-[SemiBold] text-[#222] mb-[15px]">Layout types</p>
                        <div className="rounded-[12px] bg-[#FFF] md:p-[20px] p-[15px]">
                            <div className="flex items-center justify-between mb-[30px]">
                                <p className="text-[13px] font-[SemiBold] text-[#222]">Layout type #1</p>
                                <button type="button" className="cursor-pointer flex items-center justify-center bg-white">
                                    <TrashIcon width={20} height={20} fill="#D4A373" />
                                </button>
                            </div>

                            {/* layout name and size */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] md:mb-[30px] mb-[15px]">
                                <div>
                                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Layout name <span className="text-[#D4A373]">*</span></label>
                                    <input type="text" defaultValue="TYPE A -1BHK" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Size (sq.ft.) <span className="text-[#D4A373]">*</span></label>
                                    <div className="grid grid-cols-2 gap-[10px]">
                                        <div className="relative">
                                            <input type="text" defaultValue="147" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[56px] text-[13px] text-[#222] focus:outline-none" />
                                            <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070] font-[SemiBold]">Sq.m</span>
                                        </div>
                                        <div className="relative">
                                            <input type="text" defaultValue="147" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[56px] text-[13px] text-[#222] focus:outline-none" />
                                            <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070] font-[SemiBold]">Sq.ft</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            {/* number of bedrooms and maid bedroom is available */}
                            <div className="md:mb-[30px] mb-[15px]">
                                <div>
                                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Number of bedrooms <span className="text-[#D4A373]">*</span></label>
                                    <input type="text" defaultValue="2" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none" />
                                </div>
                                <label className="inline-flex items-center gap-[8px] mt-[10px] cursor-pointer">
                                    <input type="checkbox" className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)]" />
                                    <span className="text-[12px] text-[#707070] font-[Regular]">Maid bedroom is available</span>
                                </label>
                            </div>

                            {/* number of bathrooms and number of units */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] md:mb-[30px] mb-[15px]">
                                <div>
                                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Number of bathrooms <span className="text-[#D4A373]">*</span></label>
                                    <input type="text" defaultValue="1" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none" />
                                </div>
                                <div>
                                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Number of units <span className="text-[#D4A373]">*</span></label>
                                    <input type="text" defaultValue="20" className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none" />
                                </div>
                            </div>

                            {/* layout price */}
                            <div className="md:mb-[30px] mb-[15px]">
                                <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Layout price <span className="text-[#D4A373]">*</span></label>
                                <div className="relative">
                                    <input type="text" defaultValue="2800000" className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[48px] text-[13px] text-[#222] font-[Regular] focus:outline-none" />
                                    <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070] font-[SemiBold]">AED</span>
                                </div>
                            </div>
                            {/*upload floor plan images*/}
                            <section className="rounded-[15px] bg-white min-w-0">
                                <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Upload floor plan images <span className="text-[#D4A373]">*</span></label>
                                <input
                                    ref={floorPlanFileRef}
                                    type="file"
                                    accept="image/*"
                                    className="sr-only"
                                    aria-hidden
                                    tabIndex={-1}
                                    onChange={handleFloorPlanFileChange}
                                />
                                <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-10 xl:gap-14">
                                    <div className="flex-1 min-w-0 lg:basis-[58%] lg:max-w-[62%]">
                                        <div className="rounded-[12px] overflow-hidden bg-[#F0F0F0] aspect-[4/3] max-h-[320px] sm:max-h-[380px] flex items-center justify-center">
                                            {floorPlanSrc ? (
                                                <img src={floorPlanSrc} alt="Floor plan" className="h-full w-full object-cover min-h-[200px]" />
                                            ) : (
                                                <img src={floorPlanImg} alt="Floor plan" className="h-full w-full object-cover min-h-[200px]" />
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-6 sm:gap-8 shrink-0 lg:py-2">
                                        <button
                                            type="button"
                                            onClick={() => floorPlanFileRef.current?.click()}
                                            className="cursor-pointer inline-flex items-center gap-2.5 text-left text-[13px] sm:text-[14px] font-[SemiBold] text-[#222] transition-opacity"
                                        >
                                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(34,34,34,0.12)] bg-white shrink-0">
                                                <ChangeIcon width={15} height={15} />
                                            </span>
                                            Change
                                        </button>
                                        <button
                                            type="button"
                                            onClick={handleFloorPlanRemove}
                                            className="cursor-pointer inline-flex items-center gap-2.5 text-left text-[13px] sm:text-[14px] font-[SemiBold] text-[#222]  transition-opacity"
                                        >
                                            <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-[rgba(34,34,34,0.12)] bg-white shrink-0">
                                                <TrashIcon width={18} height={18} />
                                            </span>
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            </section>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-end gap-[10px] mt-[30px]">
                <button className="cursor-pointer h-[44px] rounded-[10px] px-[20px] border border-[#222]  text-[#222] text-[14px] font-[Bold] inline-flex items-center gap-[5px]">Discard</button>
                <button className="cursor-pointer h-[44px] rounded-[10px] px-[20px] bg-[#D4A373] text-[#FFF] text-[14px] font-[Bold] inline-flex items-center gap-[5px]">Save changes</button>
            </div>
        </div>
    );
};

export default UnitEdit;
