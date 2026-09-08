import { useCallback, useEffect, useState } from "react";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useNavigate, useSearchParams } from "react-router-dom";
import EditProject from "./EditProject/EditProject";
import AdditionalProject from "./AdditionalProject/AdditionalProject";
import { projectsService } from "../../../services/projectsService";
import { getApiErrorMessage } from "../../../services/apiClient";
import { useToast } from "../../../context/ToastContext";
import type { ProjectDetailResponse } from "../../../types/api";

type ListingDetailTabId = "details" | "additional";

function ListingProjectDetail() {
    const navigate = useNavigate();
    const { push } = useToast();
    const [searchParams] = useSearchParams();
    const projectId =
        searchParams.get("id")?.trim() ||
        searchParams.get("projectId")?.trim() ||
        "";

    const [activeTab, setActiveTab] = useState<ListingDetailTabId>("details");
    const [isLoading, setIsLoading] = useState(Boolean(projectId));
    const [projectDetails, setProjectDetails] = useState<Record<string, unknown> | null>(null);
    const [unitProperties, setUnitProperties] = useState<Array<Record<string, unknown>>>([]);

    const applyProjectResponse = useCallback((response: ProjectDetailResponse) => {
        setProjectDetails((response.project || null) as Record<string, unknown> | null);
        setUnitProperties(Array.isArray(response.unitProperties) ? response.unitProperties : []);
    }, []);

    const loadProject = useCallback(async () => {
        if (!projectId) return;
        const response = await projectsService.getProjectById(projectId);
        applyProjectResponse(response);
    }, [projectId, applyProjectResponse]);

    useEffect(() => {
        if (!projectId) {
            push({
                type: "error",
                title: "Project not found",
                description: "Missing project id in URL.",
            });
            navigate("/listingproject");
            return;
        }

        let isMounted = true;
        setIsLoading(true);
        loadProject()
            .catch((error: unknown) => {
                if (!isMounted) return;
                push({
                    type: "error",
                    title: "Project load failed",
                    description: getApiErrorMessage(error, "Failed to load project"),
                });
            })
            .finally(() => {
                if (!isMounted) return;
                setIsLoading(false);
            });

        return () => {
            isMounted = false;
        };
    }, [projectId, navigate, loadProject, push]);

    const tabs: { id: ListingDetailTabId; label: string }[] = [
        { id: "details", label: "Project Details" },
        { id: "additional", label: "Additional Details" },
    ];

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}

            <Header
                title="Listing Project Detail"
                showBack={true}
                onBackClick={() => navigate("/listingproject")}
            />

            <div className="p-[20px] bg-[#fff] mt-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] rounded-[12px]">
                <div className="rounded-t-[12px] border-b border-[rgba(34,34,34,0.08)] overflow-x-auto">
                    <div className="min-w-max flex items-center gap-[4px] mt-[8px]">
                        {tabs.map((tab) => {
                            const isActive = activeTab === tab.id;
                            return (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`cursor-pointer p-[16px_24px] border-b-2 text-[13px] font-[SemiBold] whitespace-nowrap transition-colors ${
                                        isActive
                                            ? "text-[#0832AE] border-[#0832AE]"
                                            : "text-[#222] border-transparent"
                                    }`}
                                >
                                    {tab.label}
                                </button>
                            );
                        })}
                    </div>
                </div>

                {!isLoading && !projectDetails ? (
                    <div className="p-[20px] text-[14px] text-[#707070]">Unable to load project details.</div>
                ) : (
                    <>
                        {activeTab === "details" && projectDetails && (
                            <EditProject
                                projectId={projectId}
                                projectDetails={projectDetails}
                                unitProperties={unitProperties}
                                onRefresh={loadProject}
                            />
                        )}
                        {activeTab === "additional" && projectDetails && (
                            <AdditionalProject
                                project={projectDetails}
                                unitProperties={unitProperties}
                            />
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default ListingProjectDetail;
