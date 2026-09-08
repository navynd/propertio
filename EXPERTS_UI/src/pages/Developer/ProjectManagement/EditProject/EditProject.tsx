import { useCallback, useEffect, useState } from "react";
import EditProjectStatus from "./EditProjectStatus";
import EditMedia from "./EditMedia";
import EditPricePay from "./EditPricePay";
import EditLocation from "./EditLocation";
import EditUnitdetail from "./EditUnitdetail";
import DeveloperHeader from "../../../../components/Header/DeveloperHeader";
import Loader from "../../../../components/Loader/loader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { developerService, type DeveloperProjectDetailsResponse } from "../../../../services/developerService";
import { toast } from "../../../../services/toast";

type EditTabId = "status" | "media" | "price" | "location" | "unit";

const EditProject = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const projectId = searchParams.get("projectId") || "";
    const isDraftFlow = searchParams.get("mode") === "draft";
    const [activeTab, setActiveTab] = useState<EditTabId>("status");
    const [isLoading, setIsLoading] = useState(false);
    const [projectDetails, setProjectDetails] = useState<Record<string, unknown> | null>(null);
    const [unitProperties, setUnitProperties] = useState<Array<Record<string, unknown>>>([]);

    const applyProjectResponse = useCallback((response: DeveloperProjectDetailsResponse) => {
        setProjectDetails((response.project || null) as Record<string, unknown> | null);
        setUnitProperties(Array.isArray(response.unitProperties) ? response.unitProperties : []);
    }, []);

    useEffect(() => {
        if (!projectId) {
            toast.error("Project not found", "Missing projectId in URL.");
            navigate("/developer/project-management?tab=unpublished");
            return;
        }

        let isMounted = true;
        setIsLoading(true);
        developerService
            .getProjectDetails(projectId)
            .then((response) => {
                if (!isMounted) return;
                applyProjectResponse(response);
            })
            .catch((error: unknown) => {
                const message =
                    (error as { message?: string })?.message || "Failed to fetch project details.";
                toast.error("Project load failed", message);
            })
            .finally(() => {
                if (!isMounted) return;
                setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [projectId, navigate, applyProjectResponse]);

    const refreshProjectDetails = useCallback(async () => {
        const response = await developerService.getProjectDetails(projectId);
        applyProjectResponse(response);
    }, [projectId, applyProjectResponse]);

    const tabs: { id: EditTabId; label: string }[] = [
        { id: "status", label: "Project status & project details" },
        { id: "media", label: "Media upload" },
        { id: "price", label: "Price & Payment plan" },
        { id: "location", label: "Location" },
        { id: "unit", label: "Unit details" },
    ];
    const tabOrder: EditTabId[] = ["status", "media", "price", "location", "unit"];
    const activeTabIndex = tabOrder.indexOf(activeTab);
    const goToNextTab = () => {
        const next = tabOrder[activeTabIndex + 1];
        if (next) setActiveTab(next);
    };

    const renderTabContent = () => {
        if (!projectDetails) return null;
        if (activeTab === "status") {
            return (
                <EditProjectStatus
                    projectId={projectId}
                    project={projectDetails}
                    onContinue={isDraftFlow ? goToNextTab : undefined}
                    primaryActionLabel={isDraftFlow ? "Next" : "Save changes"}
                />
            );
        }
        if (activeTab === "media") {
            return (
                <EditMedia
                    projectId={projectId}
                    project={projectDetails}
                    onAfterSave={refreshProjectDetails}
                    onContinue={isDraftFlow ? goToNextTab : undefined}
                    primaryActionLabel={isDraftFlow ? "Next" : "Save changes"}
                />
            );
        }
        if (activeTab === "price") {
            return (
                <EditPricePay
                    projectId={projectId}
                    project={projectDetails}
                    onContinue={isDraftFlow ? goToNextTab : undefined}
                    primaryActionLabel={isDraftFlow ? "Next" : "Save changes"}
                />
            );
        }
        if (activeTab === "location") {
            return (
                <EditLocation
                    projectId={projectId}
                    project={projectDetails}
                    onAfterSave={refreshProjectDetails}
                    onContinue={isDraftFlow ? goToNextTab : undefined}
                    primaryActionLabel={isDraftFlow ? "Next" : "Save changes"}
                />
            );
        }
        return (
            <EditUnitdetail
                projectId={projectId}
                unitProperties={unitProperties}
                onAfterSave={refreshProjectDetails}
                primaryActionLabel={isDraftFlow ? "Save" : "Save changes"}
            />
        );
    };

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
            {/* Header */}
            <DeveloperHeader
                title="Edit Project"
                showBack={true}
                onBackClick={() => navigate(-1)}
            />

            <div className="rounded-[15px]">
                <div className="px-[20px] border-b border-[rgba(34,34,34,0.08)] overflow-x-auto scrollbar-hide bg-white">
                    <div className="min-w-max flex items-center gap-[4px] scrollbar-hide mt-[8px]">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`cursor-pointer p-[20px_30px] border-b-2 text-[13px] font-[SemiBold] whitespace-nowrap transition-colors ${isActive
                                        ? "text-[#0832AE] border-[#0832AE]"
                                        : "text-[#222] border-transparent "
                                        }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div>
                    {renderTabContent()}
                    {!isLoading && !projectDetails && (
                        <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] p-[20px] text-[#707070]">
                            Unable to load project details.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EditProject;
