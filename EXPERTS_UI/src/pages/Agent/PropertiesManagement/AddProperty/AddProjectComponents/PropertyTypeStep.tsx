import { useEffect, useMemo, useRef, useState } from "react";
import { DownArrowIcon } from "../../../../../components/CustomFile/icons";
import {
    agentService,
    type AgentListingTypeMasterItem,
    type AgentPropertyTypeMasterItem,
} from "../../../../../services/agentService";
import { toast } from "../../../../../services/toast";

export type PropertyTypeStepProps = {
    listingTypeId: string;
    propertyTypeId: string;
    onListingTypeChange: (id: string) => void;
    onPropertyTypeChange: (id: string) => void;
    onListingTransactionChange?: (transaction: string) => void;
};

const sortByDisplayOrder = <T extends { displayOrder?: number; name?: string }>(rows: T[]) =>
    [...rows].sort((a, b) => {
        const ao = Number(a.displayOrder ?? 9999);
        const bo = Number(b.displayOrder ?? 9999);
        if (ao !== bo) return ao - bo;
        return String(a.name ?? "").localeCompare(String(b.name ?? ""));
    });

const PropertyTypeStep = ({
    listingTypeId,
    propertyTypeId,
    onListingTypeChange,
    onPropertyTypeChange,
    onListingTransactionChange,
}: PropertyTypeStepProps) => {
    const [isListingTypeDropdownOpen, setIsListingTypeDropdownOpen] = useState(false);
    const [isPropertyTypeDropdownOpen, setIsPropertyTypeDropdownOpen] = useState(false);
    const [listingTypeOptions, setListingTypeOptions] = useState<AgentListingTypeMasterItem[]>([]);
    const [propertyTypeOptions, setPropertyTypeOptions] = useState<AgentPropertyTypeMasterItem[]>([]);
    const [loading, setLoading] = useState(true);
    const listingTypeDropdownRef = useRef<HTMLDivElement>(null);
    const propertyTypeDropdownRef = useRef<HTMLDivElement>(null);

    const selectedListingType = useMemo(
        () => listingTypeOptions.find((row) => String(row._id) === listingTypeId)?.name ?? "Select",
        [listingTypeOptions, listingTypeId]
    );

    const selectedPropertyType = useMemo(
        () => propertyTypeOptions.find((row) => String(row._id) === propertyTypeId)?.name ?? "Select",
        [propertyTypeOptions, propertyTypeId]
    );

    useEffect(() => {
        let mounted = true;
        setLoading(true);
        Promise.all([agentService.getListingTypesMasterData(), agentService.getPropertyTypesMasterData()])
            .then(([listingRes, propertyRes]) => {
                if (!mounted) return;
                const listingRows = sortByDisplayOrder(
                    (listingRes?.listingTypes ?? listingRes?.listingtypes ?? []).filter(
                        (row) =>
                            row?.isActive !== false &&
                            row?._id &&
                            String(row?.slug ?? "").toLowerCase() !== "new-projects"
                    )
                );
                const propertyRows = sortByDisplayOrder(
                    (propertyRes?.propertyTypes ?? propertyRes?.propertytypes ?? []).filter(
                        (row) => row?.isActive !== false && row?._id
                    )
                );
                setListingTypeOptions(listingRows);
                setPropertyTypeOptions(propertyRows);
            })
            .catch((err: unknown) => {
                const message =
                    (err as { message?: string })?.message || "Could not load listing or property types.";
                toast.error("Master data failed", message);
            })
            .finally(() => {
                if (mounted) setLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!onListingTransactionChange) return;
        const selected = listingTypeOptions.find((row) => String(row._id) === listingTypeId);
        onListingTransactionChange(String(selected?.transaction ?? "").trim().toLowerCase());
    }, [listingTypeId, listingTypeOptions, onListingTransactionChange]);

    return (
        <div className="rounded-[15px] bg-white md:p-[30px] p-[16px]">
            <h3 className="text-[20px] font-[Bold] text-[#222] mb-[30px]">Property type</h3>
            {/* listing type */}
            <div className="flex flex-col gap-[8px] shrink-0">
                <label className="text-[14px] font-[SemiBold] text-[#222] block ">
                    Listing type <span className="text-[#D4A373]">*</span>
                </label>
                <div className="relative" ref={listingTypeDropdownRef}>
                    <button
                        type="button"
                        onClick={() => {
                            if (loading) return;
                            setIsListingTypeDropdownOpen(!isListingTypeDropdownOpen);
                            setIsPropertyTypeDropdownOpen(false);
                        }}
                        className="flex items-center justify-between gap-[8px] border border-[rgba(34,34,34,0.10)] bg-white rounded-[10px] px-[14px] h-[44px] cursor-pointer w-full"
                    >
                        <span className="text-[#222] text-[12px] font-[SemiBold]">{selectedListingType}</span>
                        <DownArrowIcon width={11} height={7} className={`transition-transform duration-200 ${isListingTypeDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isListingTypeDropdownOpen && (
                        <div className="absolute right-0 top-[47px] w-full min-w-[150px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-20 flex flex-col max-h-[130px] overflow-y-auto">
                            {listingTypeOptions.map((option) => (
                                <button
                                    key={option._id}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onListingTypeChange(String(option._id));
                                        onListingTransactionChange?.(
                                            String(option.transaction ?? "").trim().toLowerCase()
                                        );
                                        setIsListingTypeDropdownOpen(false);
                                    }}
                                    className={`px-[16px] py-[10px] text-left text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] transition-colors ${listingTypeId === String(option._id) ? "text-[#3182CE] bg-[#F5F5F5]" : "text-[#222]"
                                        }`}
                                >
                                    {option.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* property type */}
            <div className="flex flex-col gap-[8px] shrink-0 mt-[20px]">
                <label className="text-[14px] font-[SemiBold] text-[#222] block ">
                    property type <span className="text-[#D4A373]">*</span>
                </label>
                <div className="relative" ref={propertyTypeDropdownRef}>
                    <button
                        type="button"
                        onClick={() => {
                            if (loading) return;
                            setIsPropertyTypeDropdownOpen(!isPropertyTypeDropdownOpen);
                            setIsListingTypeDropdownOpen(false);
                        }}
                        className="flex items-center justify-between gap-[8px] border border-[rgba(34,34,34,0.10)] bg-white rounded-[10px] px-[14px] h-[44px] cursor-pointer w-full"
                    >
                        <span className="text-[#222] text-[12px] font-[SemiBold]">{selectedPropertyType}</span>
                        <DownArrowIcon width={11} height={7} className={`transition-transform duration-200 ${isPropertyTypeDropdownOpen ? "rotate-180" : ""}`} />
                    </button>
                    {isPropertyTypeDropdownOpen && (
                        <div className="absolute right-0 top-[47px] w-full min-w-[150px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] py-[8px] z-20 flex flex-col max-h-[130px] overflow-y-auto">
                            {propertyTypeOptions.map((option) => (
                                <button
                                    key={option._id}
                                    type="button"
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        onPropertyTypeChange(String(option._id));
                                        setIsPropertyTypeDropdownOpen(false);
                                    }}
                                    className={`px-[16px] py-[10px] text-left text-[13px] font-[Medium] cursor-pointer hover:bg-[#F5F5F5] transition-colors ${propertyTypeId === String(option._id) ? "text-[#3182CE] bg-[#F5F5F5]" : "text-[#222]"
                                        }`}
                                >
                                    {option.name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default PropertyTypeStep;   
