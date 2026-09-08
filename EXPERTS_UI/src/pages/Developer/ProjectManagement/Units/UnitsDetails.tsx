import { useEffect, useMemo, useRef, useState } from "react";
import { ReloadIcon } from "@radix-ui/react-icons";
import mainbg from "../../../../assets/img/mainbg.png";
import floorPlanImg from "../../../../assets/img/pen.jpg";
import { ChangeIcon, EditIcon, LeftArrowWhiteIcon, MultiUserIcon, TrashIcon } from "../../../../components/CustomFile/icons";
import DeveloperHeader from "../../../../components/Header/DeveloperHeader";
import AssignedUnit from "./AssignedUnit.tsx";
import { useNavigate, useSearchParams } from "react-router-dom";
import { API_BASE_URL } from "../../../../services/apiClient";
import Loader from "../../../../components/Loader/loader";
import { toast } from "../../../../services/toast";
import { developerService, type DeveloperProjectUnitDetailResponse } from "../../../../services/developerService";

type DetailItem = {
    label: string;
    value: string;
    subValue?: string;
};

/** Deep blue assigned chips; light grey unassigned — matches Available units design */
const UNIT_ASSIGNED_BG = "#0832AE";
const UNIT_UNASSIGNED_BG = "#F2F2F2";

type AvailableUnit = {
    id: string;
    label: string;
    assigned: boolean;
};

const UnitsDetails = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const floorPlanFileRef = useRef<HTMLInputElement>(null);
    const floorPlanBlobRef = useRef<string | null>(null);
    const [floorPlanSrc, setFloorPlanSrc] = useState<string | null>(null);
    const [hasLocalFloorPlanRemoval, setHasLocalFloorPlanRemoval] = useState(false);
    const [isUpdatingFloorPlan, setIsUpdatingFloorPlan] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [unitDetail, setUnitDetail] = useState<DeveloperProjectUnitDetailResponse | null>(null);
    const defaultOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const [floorPlanBase, setFloorPlanBase] = useState(`${defaultOrigin}/uploads/img/project/`);

    const projectId = searchParams.get("projectId") || "";
    const layoutId = searchParams.get("layoutId") || "";
    const assignedView = searchParams.get("assigned") === "true";

    const resolveFloorPlanUrl = (value: string) => {
        if (value.startsWith("http://") || value.startsWith("https://")) return value;
        const filename = value.includes("/") ? value.split("/").pop() || value : value;
        return `${floorPlanBase}${encodeURIComponent(filename).replace(/%2F/g, "/")}`;
    };

    useEffect(() => {
        let mounted = true;
        developerService
            .getSupportedUrlsMasterData()
            .then((data) => {
                if (!mounted) return;
                const source =
                    (data.supportedUrls as Record<string, unknown>) ||
                    (data.supportedurls as Record<string, unknown>) ||
                    {};
                const projectUrl = (source.projectUrl as Record<string, unknown>) || {};
                const floorPlansBase = String(projectUrl.img || `${defaultOrigin}/uploads/img/project/`).replace(/\/?$/, "/");
                setFloorPlanBase(floorPlansBase);
            })
            .catch(() => undefined);

        return () => {
            mounted = false;
        };
    }, [defaultOrigin]);

    useEffect(() => {
        if (!projectId || !layoutId) {
            toast.error("Missing params", "projectId and layoutId are required.");
            navigate(-1);
            return;
        }

        let mounted = true;
        setIsLoading(true);
        developerService
            .getProjectUnitDetail({ projectId, layoutId, assigned: assignedView, page: 1, limit: 50 })
            .then((res) => {
                if (!mounted) return;
                setUnitDetail(res);
                const firstFloorPlan = Array.isArray(res?.layout?.floorPlans) ? res.layout.floorPlans[0] : null;
                if (typeof firstFloorPlan === "string" && firstFloorPlan.trim()) {
                    setFloorPlanSrc(resolveFloorPlanUrl(firstFloorPlan));
                } else {
                    setFloorPlanSrc(floorPlanImg);
                }
                setHasLocalFloorPlanRemoval(false);
            })
            .catch((error: unknown) => {
                if (!mounted) return;
                toast.error(
                    "Failed to load unit detail",
                    (error as { message?: string })?.message || "Unable to fetch unit detail data."
                );
            })
            .finally(() => {
                if (!mounted) return;
                setIsLoading(false);
            });

        return () => {
            mounted = false;
        };
    }, [assignedView, floorPlanBase, layoutId, navigate, projectId]);

    useEffect(() => {
        return () => {
            if (floorPlanBlobRef.current) {
                URL.revokeObjectURL(floorPlanBlobRef.current);
                floorPlanBlobRef.current = null;
            }
        };
    }, []);

    const handleFloorPlanFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        event.target.value = "";
        if (!file?.type.startsWith("image/")) return;
        if (!projectId || !layoutId) {
            toast.error("Missing params", "projectId and layoutId are required.");
            return;
        }

        if (floorPlanBlobRef.current) {
            URL.revokeObjectURL(floorPlanBlobRef.current);
            floorPlanBlobRef.current = null;
        }
        const previousSrc = floorPlanSrc;

        setIsUpdatingFloorPlan(true);
        try {
            const formData = new FormData();
            formData.append("projectId", projectId);
            formData.append("floorPlans", file);

            const uploadResponse = await developerService.uploadProjectMedia(formData);
            const uploadedFloorPlan = (uploadResponse.uploads?.floorPlans || [])
                .map((item) => item.filename || item.url)
                .find((x): x is string => Boolean(x));

            if (!uploadedFloorPlan) {
                throw new Error("Floor plan upload failed.");
            }

            const filename = uploadedFloorPlan.includes("/") ? uploadedFloorPlan.split("/").pop() || uploadedFloorPlan : uploadedFloorPlan;
            await developerService.updateProjectLayout({
                projectId,
                layoutId,
                floorPlans: [filename],
            });

            setFloorPlanSrc(resolveFloorPlanUrl(filename));
            setHasLocalFloorPlanRemoval(false);
            setUnitDetail((prev) =>
                prev
                    ? {
                        ...prev,
                        layout: {
                            ...prev.layout,
                            floorPlans: [filename],
                        },
                    }
                    : prev
            );
            toast.success("Floor plan updated", "Floor plan uploaded and saved.");
        } catch (error: unknown) {
            setFloorPlanSrc(previousSrc);
            toast.error(
                "Floor plan update failed",
                (error as { message?: string })?.message || "Unable to update floor plan."
            );
        } finally {
            setIsUpdatingFloorPlan(false);
        }
    };

    const handleFloorPlanRemove = () => {
        // Floor plan is required: force replacement instead of temporary delete.
        floorPlanFileRef.current?.click();
    };

    const layout = unitDetail?.layout;
    const layoutDetailFields: DetailItem[] = useMemo(
        () => [
            { label: "Layout name", value: String(layout?.layoutName || "-") },
            {
                label: "Number of beds",
                value: String(layout?.bedrooms ?? "-"),
                subValue: layout?.maidBedroom ? "(maid rooms available)" : undefined,
            },
            { label: "Number of units available", value: String(layout?.availableUnits ?? 0) },
            { label: "Number of units assigned", value: String(layout?.assignedUnits ?? 0) },
            { label: "Property type", value: String(layout?.propertyType?.name || "-") },
            { label: "Number of baths", value: String(layout?.bathrooms ?? "-") },
            { label: "Area of this property", value: layout?.areaSqft ? `${layout.areaSqft} sqft` : "-" },
            {
                label: "Price",
                value:
                    typeof layout?.startingPrice?.amount === "number"
                        ? `${layout.startingPrice.amount} ${layout.startingPrice.currency || "AED"}`
                        : "-",
            },
        ],
        [layout]
    );

    const availableUnits: AvailableUnit[] = useMemo(
        () =>
            (unitDetail?.unitStatus?.units || []).map((unit) => ({
                id: String(unit._id),
                label: unit.unitNumber ? `Unit-${unit.unitNumber}` : unit.unitId || "Unit",
                assigned: Boolean(unit.isAssigned),
            })),
        [unitDetail]
    );

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            {/*Header*/}
            <div>
                <DeveloperHeader
                    title="Unit detail"
                    showBack={true}
                    onBackClick={() => navigate(-1)}
                />
            </div>
            {(isLoading || isUpdatingFloorPlan) && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}

            {/*Tower Name*/}
            <div className="rounded-[15px] bg-white md:p-[25px] p-[20px] min-w-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-[20px] leading-[140%] shrink-0">
                    <span className="text-[#707070] font-[Regular]">Name : </span>
                    <span className="text-[#222] font-[Bold]">{layout?.building?.name || "-"}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button
                        type="button"
                        onClick={() => navigate("/developer/units-edit")}
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222]"
                    >
                        <EditIcon width={20} height={20} />
                        Edit
                    </button>
                    <button
                        type="button"
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222]"
                    >
                        <TrashIcon width={20} height={20} />
                        Delete
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                `/developer/units-assign?projectId=${encodeURIComponent(projectId)}&layoutId=${encodeURIComponent(layoutId)}`
                            )
                        }
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#D4A373] px-[14px] h-[33px] text-[12px] font-[SemiBold] text-white"
                    >
                        <MultiUserIcon width={20} height={20} stroke="#FFFFFF" />
                        Assign agency
                    </button>
                </div>
            </div>

            {/*Layout Details*/}
            <div className="min-w-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    {layoutDetailFields.map((field) => (
                        <div key={field.label} className="rounded-[12px] bg-white md:p-[25px] p-[25px]  flex flex-col justify-start">
                            <p className="text-[12px] text-[#222] font-[Medium] mb-2 leading-tight">{field.label}</p>
                            <div className="flex items-center gap-2">
                                <p className="text-[16px] font-[Bold] text-[#222] leading-snug">{field.value}</p>
                                {field.subValue ? (
                                    <p className="text-[12px] text-[#707070] font-[Regular] leading-snug">{field.subValue}</p>
                                ) : null}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/*Floor Plan*/}
            <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0">
                <h2 className="text-[20px] font-[Bold] text-[#222] mb-5 sm:mb-6">Floor plan</h2>
                <input
                    ref={floorPlanFileRef}
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    aria-hidden
                    tabIndex={-1}
                    onChange={handleFloorPlanFileChange}
                />
                {/*gap-8 lg:gap-10 xl:gap-14*/}
                <div className="flex flex-col lg:flex-row lg:items-center ">
                    <div className="flex-1 min-w-0 lg:basis-[58%] lg:max-w-[62%]">
                        <div className="rounded-[12px] overflow-hidden bg-[#F0F0F0] aspect-[4/3] max-h-[320px] sm:max-h-[380px] flex items-center justify-center">
                            {floorPlanSrc && !hasLocalFloorPlanRemoval ? (
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

            {/*Available units*/}
            <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0">
                <h2 className="text-[20px] font-[Bold] text-[#222] mb-5 sm:mb-6">Available units</h2>
                <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-5 sm:mb-6">
                    <div className="flex items-center gap-2">
                        <span className="h-[15px] w-[15px] shrink-0 rounded-[3px]" style={{ backgroundColor: UNIT_ASSIGNED_BG }} aria-hidden />
                        <span className="text-[14px] font-[Regular] text-[#222]">Units Assigned</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <span
                            className="h-[15px] w-[15px] shrink-0 rounded-[3px] border border-[rgba(34,34,34,0.08)]"
                            style={{ backgroundColor: UNIT_UNASSIGNED_BG }}
                            aria-hidden
                        />
                        <span className="text-[14px] font-[Regular] text-[#222]">Units Unassigned</span>
                    </div>
                </div>
                <div className="grid grid-cols-3 min-[480px]:grid-cols-5 sm:grid-cols-6 lg:grid-cols-7 gap-2 sm:gap-3">
                    {availableUnits.map((unit) => (
                        <div
                            key={unit.id}
                            className={`flex min-h-[39px] items-center justify-center rounded-[10px] text-center text-[12px] font-[Bold] ${unit.assigned ? "text-white" : "text-[#222]"
                                }`}
                            style={{
                                backgroundColor: unit.assigned ? UNIT_ASSIGNED_BG : UNIT_UNASSIGNED_BG,
                            }}
                        >
                            <p className={`truncate max-w-[70%] text-[12px] font-[Bold] ${unit.assigned ? "text-white" : "text-[#222]"}`}>{unit.label}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/*Assigned units*/}
            <div>
                <AssignedUnit
                    projectId={projectId}
                    layoutId={layoutId}
                    assigned={assignedView}
                    layout={layout || null}
                    agencies={unitDetail?.agencies || []}
                    statusUnits={unitDetail?.unitStatus?.units || []}
                />
            </div>
        </div>
    );
};

export default UnitsDetails;
