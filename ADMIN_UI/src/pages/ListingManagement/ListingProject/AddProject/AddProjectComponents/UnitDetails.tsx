import { DownArrowIcon, PlusIcon, TrashIcon, GalleryIcon } from "../../../../../assets/icons";
import { useEffect, useRef, useState } from "react";

export type UnitLayoutForm = {
    id: number;
    isOpen: boolean;
    layoutName: string;
    areaSqm: string;
    areaSqft: string;
    bedrooms: string;
    hasMaidBedroom: boolean;
    bathrooms: string;
    totalUnits: string;
    layoutPrice: string;
    floorPlanImage: File | null;
    /** Present when editing an existing layout (PUT includes layout _id). */
    layoutMongoId?: string;
    /** Existing uploaded floor plan filenames (used when no new file is selected). */
    existingFloorPlanFilenames?: string[];
};

export type UnitPropertyForm = {
    id: number;
    isOpen: boolean;
    towerName: string;
    propertyType: string;
    areaSqm: string;
    areaSqft: string;
    layouts: UnitLayoutForm[];
    /** Present when editing an existing building (PUT includes building _id). */
    buildingMongoId?: string;
};

export type UnitDetailsFormValue = {
    properties: UnitPropertyForm[];
};

export type UnitPropertyTypeOption = {
    id: string;
    name: string;
};

type UnitDetailsProps = {
    value: UnitDetailsFormValue;
    onChange: (value: UnitDetailsFormValue) => void;
    propertyTypeOptions: UnitPropertyTypeOption[];
    /** When set, show preview for existing floor plan filenames (edit project). */
    resolveFloorPlanSrc?: (filename: string) => string | null;
};

const fallbackPropertyTypeOptions: UnitPropertyTypeOption[] = [
    { id: "apartment", name: "Apartment" },
    { id: "villa", name: "Villa" },
    { id: "townhouse", name: "Townhouse" },
    { id: "duplex", name: "Duplex" },
    { id: "penthouse", name: "Penthouse" },
];

const createLayout = (id: number): UnitLayoutForm => ({
    id,
    isOpen: true,
    layoutName: "",
    areaSqm: "",
    areaSqft: "",
    bedrooms: "",
    hasMaidBedroom: false,
    bathrooms: "",
    totalUnits: "",
    layoutPrice: "",
    floorPlanImage: null,
    layoutMongoId: undefined,
    existingFloorPlanFilenames: undefined,
});

const createProperty = (id: number): UnitPropertyForm => ({
    id,
    isOpen: true,
    towerName: "",
    propertyType: "",
    areaSqm: "",
    areaSqft: "",
    layouts: [createLayout(1)],
    buildingMongoId: undefined,
});

const UnitDetails = ({ value, onChange, propertyTypeOptions, resolveFloorPlanSrc }: UnitDetailsProps) => {
    const [openPropertyTypeDropdownId, setOpenPropertyTypeDropdownId] = useState<number | null>(null);
    const [layoutImageByKey, setLayoutImageByKey] = useState<Record<string, string>>({});
    const fileRefByKey = useRef<Record<string, File | null>>({});
    const previewUrlRef = useRef<Record<string, string>>({});
    const hasInitializedDefaultRef = useRef(false);
    const properties = value.properties;
    const resolvedPropertyTypeOptions =
        propertyTypeOptions.length > 0 ? propertyTypeOptions : fallbackPropertyTypeOptions;
    const getLayoutKey = (propertyId: number, layoutId: number) => `${propertyId}-${layoutId}`;

    useEffect(() => {
        const filesByKey: Record<string, File | null> = {};
        properties.forEach((property) => {
            property.layouts.forEach((layout) => {
                filesByKey[getLayoutKey(property.id, layout.id)] = layout.floorPlanImage;
            });
        });

        setLayoutImageByKey((prev) => {
            const next = { ...prev };
            Object.keys(next).forEach((key) => {
                if (!filesByKey[key]) {
                    URL.revokeObjectURL(next[key]);
                    delete next[key];
                }
            });

            Object.entries(filesByKey).forEach(([key, file]) => {
                const previousFile = fileRefByKey.current[key];
                if (file && previousFile !== file) {
                    if (next[key]) URL.revokeObjectURL(next[key]);
                    next[key] = URL.createObjectURL(file);
                }
            });

            return next;
        });

        fileRefByKey.current = filesByKey;
    }, [properties]);

    useEffect(() => {
        previewUrlRef.current = layoutImageByKey;
    }, [layoutImageByKey]);

    useEffect(() => {
        return () => {
            Object.values(previewUrlRef.current).forEach((url) => URL.revokeObjectURL(url));
        };
    }, []);

    const updateProperties = (nextProperties: UnitPropertyForm[]) => {
        onChange({ ...value, properties: nextProperties });
    };

    useEffect(() => {
        if (hasInitializedDefaultRef.current) return;
        hasInitializedDefaultRef.current = true;
        if (properties.length < 1) {
            updateProperties([createProperty(1)]);
        }
    }, [properties.length]);

    const addProperty = () => {
        const nextId = properties.length ? Math.max(...properties.map((property) => property.id)) + 1 : 1;
        updateProperties([
            ...properties,
            createProperty(nextId),
        ]);
    };

    const updateProperty = (propertyId: number, updater: (property: UnitPropertyForm) => UnitPropertyForm) => {
        updateProperties(
            properties.map((property) => (property.id === propertyId ? updater(property) : property))
        );
    };

    const updateLayout = (
        propertyId: number,
        layoutId: number,
        updater: (layout: UnitLayoutForm) => UnitLayoutForm
    ) => {
        updateProperty(propertyId, (property) => ({
            ...property,
            layouts: property.layouts.map((layout) =>
                layout.id === layoutId ? updater(layout) : layout
            ),
        }));
    };

    const toggleProperty = (propertyId: number) => {
        updateProperty(propertyId, (property) => ({ ...property, isOpen: !property.isOpen }));
    };

    const deleteProperty = (propertyId: number) => {
        updateProperties(properties.filter((property) => property.id !== propertyId));
        setOpenPropertyTypeDropdownId((prev) => (prev === propertyId ? null : prev));
    };

    const addLayout = (propertyId: number) => {
        updateProperty(propertyId, (property) => {
            const nextId = property.layouts.length
                ? Math.max(...property.layouts.map((layout) => layout.id)) + 1
                : 1;
            return {
                ...property,
                layouts: [...property.layouts, createLayout(nextId)],
            };
        });
    };

    const toggleLayout = (propertyId: number, layoutId: number) => {
        updateLayout(propertyId, layoutId, (layout) => ({ ...layout, isOpen: !layout.isOpen }));
    };

    const deleteLayout = (propertyId: number, layoutId: number) => {
        updateProperty(propertyId, (property) => ({
            ...property,
            layouts: property.layouts.filter((layout) => layout.id !== layoutId),
        }));
    };

    const handleLayoutImageChange = (propertyId: number, layoutId: number, file?: File) => {
        if (!file || !file.type.startsWith("image/")) return;
        updateLayout(propertyId, layoutId, (layout) => ({
            ...layout,
            floorPlanImage: file,
            existingFloorPlanFilenames: [],
        }));
    };

    return (
        <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[16px]">
            <h3 className="text-[20px] font-[Bold] text-[#222] mb-[30px]">Unit details</h3>

            <div className="flex flex-col gap-[20px]">
                {properties.map((property, index) => (
                    <div
                        key={property.id}
                        className=""
                    >
                        <div onClick={() => toggleProperty(property.id)} className={`flex items-start justify-between gap-[12px] cursor-pointer ${property.isOpen ? "mb-[0px]" : `pb-[20px] ${index !== properties.length - 1 ? "border-b border-[rgba(34,34,34,0.10)]" : ""} `}`}>
                            <p className={`text-[14px] font-[Medium] ${property.isOpen ? "text-[#0832AE]" : "text-[#222]"}`}>
                                Property Type #{property.id} <span className="text-[#EA3934]">*</span>
                            </p>
                            <button
                                type="button"
                                onClick={(event) => {
                                    event.stopPropagation();
                                    deleteProperty(property.id);
                                }}
                                className="bg-white flex items-center justify-center cursor-pointer"
                            >
                                <TrashIcon width={20} height={20} fill="#EA3934" />
                            </button>
                        </div>

                        {/*property type and layout types details*/}
                        {property.isOpen && (
                            <div className="rounded-[15px] bg-[#F5F5F5] md:[20px] p-[15px] mt-[20px]">
                                {/*property type overview*/}
                                <div>
                                    <div className=" grid grid-cols-1 md:grid-cols-2 gap-[10px]">
                                        <div>
                                            <label className="text-[14px] font-[Medium] text-[#222] block mb-[6px]">
                                                Building/Tower Name <span className="text-[#707070] font-[Regular] text-[12px]">(Optional)</span>
                                            </label>
                                            <input
                                                type="text"
                                                placeholder="Enter building/tower name"
                                                value={property.towerName}
                                                onChange={(event) =>
                                                    updateProperty(property.id, (item) => ({
                                                        ...item,
                                                        towerName: event.target.value,
                                                    }))
                                                }
                                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[13px] text-[#222] placeholder:text-[#A0A0A0] focus:outline-none"
                                            />
                                        </div>

                                        <div>
                                            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Property type</label>
                                            <div className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setOpenPropertyTypeDropdownId((prev) =>
                                                            prev === property.id ? null : property.id
                                                        )
                                                    }
                                                    className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[13px] flex items-center justify-between"
                                                >
                                                    <span className={property.propertyType ? "text-[#222]" : "text-[#A0A0A0]"}>
                                                        {resolvedPropertyTypeOptions.find((item) => item.id === property.propertyType)?.name ||
                                                            "Select property type"}
                                                    </span>
                                                    <DownArrowIcon
                                                        width={10}
                                                        height={7}
                                                        className={`transition-transform ${openPropertyTypeDropdownId === property.id ? "rotate-180" : ""
                                                            }`}
                                                    />
                                                </button>
                                                {openPropertyTypeDropdownId === property.id && (
                                                    <div className="absolute left-0 right-0 top-[48px] z-20 rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] py-[6px]">
                                                        {resolvedPropertyTypeOptions.map((option) => (
                                                            <button
                                                                key={option.id}
                                                                type="button"
                                                                onClick={() => {
                                                                    updateProperty(property.id, (item) => ({
                                                                        ...item,
                                                                        propertyType: option.id,
                                                                    }));
                                                                    setOpenPropertyTypeDropdownId(null);
                                                                }}
                                                                className="w-full text-left px-[12px] py-[8px] text-[13px] text-[#222] hover:bg-[#F5F5F5]"
                                                            >
                                                                {option.name}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-[12px]">
                                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                                            Area of the property <span className="text-[#EA3934]">*</span>
                                        </label>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="0,00"
                                                    value={property.areaSqm}
                                                    onChange={(event) =>
                                                        updateProperty(property.id, (item) => ({
                                                            ...item,
                                                            areaSqm: event.target.value,
                                                        }))
                                                    }
                                                    className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[12px] pr-[50px] text-[13px] text-[#222] placeholder:text-[#A0A0A0] focus:outline-none"
                                                />
                                                <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] font-[SemiBold] text-[#707070]">Sq.m</span>
                                            </div>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    placeholder="0,00"
                                                    value={property.areaSqft}
                                                    onChange={(event) =>
                                                        updateProperty(property.id, (item) => ({
                                                            ...item,
                                                            areaSqft: event.target.value,
                                                        }))
                                                    }
                                                    className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[12px] pr-[50px] text-[13px] text-[#222] placeholder:text-[#A0A0A0] focus:outline-none"
                                                />
                                                <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] font-[SemiBold] text-[#707070]">Sq.ft</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-[12px] border-t border-[rgba(34,34,34,0.06)] pt-[12px]">
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-[14px] font-[Bold] text-[#222]">Layout types</p>
                                            {property.layouts.length < 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => addLayout(property.id)}
                                                    className="cursor-pointer h-[21px] rounded-[5px] px-[8px] border border-[rgba(8,50,174,0.30)] bg-[rgba(8,50,174,0.10)] text-[#0832AE] text-[12px] font-[SemiBold] inline-flex items-center gap-[5px]"
                                                >
                                                    <PlusIcon width={12} height={12} fill="#0832AE" />
                                                    Add Layout types
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                {/*layout types overview*/}
                                {property.layouts.map((layout) => {
                                    const layoutKey = getLayoutKey(property.id, layout.id);
                                    const blobPreview = layoutImageByKey[layoutKey];
                                    const remotePreview =
                                        !blobPreview &&
                                            resolveFloorPlanSrc &&
                                            layout.existingFloorPlanFilenames?.[0]
                                            ? resolveFloorPlanSrc(layout.existingFloorPlanFilenames[0])
                                            : null;
                                    const floorPlanPreview = blobPreview || remotePreview;

                                    return (
                                    <div key={layout.id} className="mt-[12px] rounded-[15px] bg-[#FFF] md:p-[20px] p-[15px]">
                                        <div onClick={() => toggleLayout(property.id, layout.id)} className="cursor-pointer flex items-center justify-between">
                                            <p className={`text-[13px] font-[SemiBold] ${layout.isOpen ? "text-[#0832AE]" : "text-[#222]"}`}>  Layout type #{layout.id}</p>
                                            <button
                                                onClick={(event) => {
                                                    event.stopPropagation();
                                                    deleteLayout(property.id, layout.id);
                                                }}
                                                type="button"
                                                className="cursor-pointer flex items-center justify-center bg-white"
                                            >
                                                <TrashIcon width={20} height={20} fill="#EA3934" />
                                            </button>
                                        </div>
                                        {/*layout types details*/}
                                        {layout.isOpen && (
                                            <div className="mt-[30px]">
                                                {/* layout name and size */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] md:mb-[30px] mb-[15px]">
                                                    <div>
                                                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Layout name <span className="text-[#EA3934]">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={layout.layoutName}
                                                            onChange={(event) =>
                                                                updateLayout(property.id, layout.id, (item) => ({
                                                                    ...item,
                                                                    layoutName: event.target.value,
                                                                }))
                                                            }
                                                            className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Size (sq.ft.) <span className="text-[#EA3934]">*</span></label>
                                                        <div className="grid grid-cols-2 gap-[10px]">
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    value={layout.areaSqm}
                                                                    onChange={(event) =>
                                                                        updateLayout(property.id, layout.id, (item) => ({
                                                                            ...item,
                                                                            areaSqm: event.target.value,
                                                                        }))
                                                                    }
                                                                    className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[56px] text-[13px] text-[#222] focus:outline-none"
                                                                />
                                                                <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070] font-[SemiBold]">Sq.m</span>
                                                            </div>
                                                            <div className="relative">
                                                                <input
                                                                    type="text"
                                                                    value={layout.areaSqft}
                                                                    onChange={(event) =>
                                                                        updateLayout(property.id, layout.id, (item) => ({
                                                                            ...item,
                                                                            areaSqft: event.target.value,
                                                                        }))
                                                                    }
                                                                    className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[56px] text-[13px] text-[#222] focus:outline-none"
                                                                />
                                                                <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070] font-[SemiBold]">Sq.ft</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                                {/* number of bedrooms and maid bedroom is available */}
                                                <div className="md:mb-[30px] mb-[15px]">
                                                    <div>
                                                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Number of bedrooms <span className="text-[#EA3934]">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={layout.bedrooms}
                                                            onChange={(event) =>
                                                                updateLayout(property.id, layout.id, (item) => ({
                                                                    ...item,
                                                                    bedrooms: event.target.value,
                                                                }))
                                                            }
                                                            className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none"
                                                        />
                                                    </div>
                                                    <label className="inline-flex items-center gap-[8px] mt-[10px] cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            checked={layout.hasMaidBedroom}
                                                            onChange={(event) =>
                                                                updateLayout(property.id, layout.id, (item) => ({
                                                                    ...item,
                                                                    hasMaidBedroom: event.target.checked,
                                                                }))
                                                            }
                                                            className="h-[15px] w-[15px] rounded border border-[rgba(34,34,34,0.20)]"
                                                        />
                                                        <span className="text-[12px] text-[#707070] font-[Regular]">Maid bedroom is available</span>
                                                    </label>
                                                </div>

                                                {/* number of bathrooms and number of units */}
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-[14px] md:mb-[30px] mb-[15px]">
                                                    <div>
                                                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Number of bathrooms <span className="text-[#EA3934]">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={layout.bathrooms}
                                                            onChange={(event) =>
                                                                updateLayout(property.id, layout.id, (item) => ({
                                                                    ...item,
                                                                    bathrooms: event.target.value,
                                                                }))
                                                            }
                                                            className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Number of units <span className="text-[#EA3934]">*</span></label>
                                                        <input
                                                            type="text"
                                                            value={layout.totalUnits}
                                                            disabled={Boolean(layout.layoutMongoId)}
                                                            onChange={(event) =>
                                                                updateLayout(property.id, layout.id, (item) => ({
                                                                    ...item,
                                                                    totalUnits: event.target.value,
                                                                }))
                                                            }
                                                            className="font-[Regular] h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] text-[#222] focus:outline-none disabled:bg-[#F0F0F0] disabled:text-[#707070]"
                                                        />
                                                    </div>
                                                </div>

                                                {/* layout price */}
                                                <div className="">
                                                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">Layout price <span className="text-[#EA3934]">*</span></label>
                                                    <div className="relative">
                                                        <input
                                                            type="text"
                                                            value={layout.layoutPrice}
                                                            onChange={(event) =>
                                                                updateLayout(property.id, layout.id, (item) => ({
                                                                    ...item,
                                                                    layoutPrice: event.target.value,
                                                                }))
                                                            }
                                                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[48px] text-[13px] text-[#222] font-[Regular] focus:outline-none"
                                                        />
                                                        <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070] font-[SemiBold]">AED</span>
                                                    </div>
                                                </div>

                                                {/* layout gallery */}
                                                <div className="md:mt-[30px] mt-[15px]">
                                                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[10px]">
                                                        Upload floor plan images <span className="text-[#EA3934]">*</span>
                                                    </label>
                                                    <div className="rounded-[10px] border border-dashed border-[rgba(34,34,34,0.15)] bg-white min-h-[180px] flex flex-col items-center justify-center text-center md:p-[56px] p-[20px]">
                                                        {floorPlanPreview ? (
                                                            <img
                                                                src={floorPlanPreview}
                                                                alt={`Layout ${layout.id} preview`}
                                                                className="w-full max-w-[360px] h-[140px] object-cover rounded-[8px]"
                                                            />
                                                        ) : (
                                                            <>
                                                                <GalleryIcon width={42} height={42} />
                                                                <p className="text-[13px] font-[Medium] text-[#000] mt-[20px]">
                                                                    Select a file or drag and drop here
                                                                </p>
                                                                <p className="text-[12px] font-[Regular] text-[#707070] mt-[4px]">
                                                                    JPG, PNG or webp, file size no more than 200MB
                                                                </p>
                                                            </>
                                                        )}
                                                        <label className="cursor-pointer mt-[20px] h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold] inline-flex items-center justify-center">
                                                            <input
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(event) => {
                                                                    const file = event.target.files?.[0];
                                                                    handleLayoutImageChange(property.id, layout.id, file);
                                                                    event.target.value = "";
                                                                }}
                                                            />
                                                            {floorPlanPreview ? "Change File" : "Select File"}
                                                        </label>
                                                    </div>
                                                </div>

                                            </div>
                                        )}
                                    </div>
                                    );
                                })}
                                {property.layouts.length > 0 && (
                                    <div className="flex justify-center align-center m-[30px_0px_20px_0px]">
                                        <button
                                            type="button"
                                            onClick={() => addLayout(property.id)}
                                            className="cursor-pointer h-[21px] rounded-[5px] px-[8px] border border-[rgba(8,50,174,0.30)] bg-[rgba(8,50,174,0.10)] text-[#0832AE] text-[12px] font-[SemiBold] inline-flex items-center gap-[5px]"
                                        >
                                            <PlusIcon width={12} height={12} fill="#0832AE" />
                                            Add Layout types
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                ))}
            </div>
            <button
                type="button"
                onClick={addProperty}
                className="cursor-pointer mt-[12px] w-full h-[56px] rounded-[10px] border border-dashed border-[rgba(34,34,34,0.16)] text-[#0832AE] text-[13px] font-[SemiBold] inline-flex items-center justify-center gap-[7px]"
            >
                <PlusIcon width={13} height={13} fill="#0832AE" />
                Add another property
            </button>
        </div>
    );
};

export default UnitDetails;
