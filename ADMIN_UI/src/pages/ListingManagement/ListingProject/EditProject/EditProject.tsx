import { useState } from "react";
import EditProjectStatus from "./EditProjectStatus";
import EditMedia from "./EditMedia";
import EditPricePay from "./EditPricePay";
import EditLocation from "./EditLocation";
import EditUnitdetail from "./EditUnitdetail";

type EditTabId = "status" | "media" | "price" | "location" | "unit";

type EditProjectProps = {
    projectId: string;
    projectDetails: Record<string, unknown> | null;
    unitProperties: Array<Record<string, unknown>>;
    onRefresh: () => Promise<void>;
};

const EditProject = ({
    projectId,
    projectDetails,
    unitProperties,
    onRefresh,
}: EditProjectProps) => {
    const [activeTab, setActiveTab] = useState<EditTabId>("status");

    const tabs: { id: EditTabId; label: string }[] = [
        { id: "status", label: "Project status & project details" },
        { id: "media", label: "Media upload" },
        { id: "price", label: "Price & Payment plan" },
        { id: "location", label: "Location" },
        { id: "unit", label: "Unit details" },
    ];

    const renderTabContent = () => {
        if (!projectDetails) return null;
        if (activeTab === "status") {
            return (
                <EditProjectStatus
                    projectId={projectId}
                    project={projectDetails}
                    onAfterSave={onRefresh}
                    primaryActionLabel="Save changes"
                />
            );
        }
        if (activeTab === "media") {
            return (
                <EditMedia
                    projectId={projectId}
                    project={projectDetails}
                    onAfterSave={onRefresh}
                    primaryActionLabel="Save changes"
                />
            );
        }
        if (activeTab === "price") {
            return (
                <EditPricePay
                    projectId={projectId}
                    project={projectDetails}
                    primaryActionLabel="Save changes"
                />
            );
        }
        if (activeTab === "location") {
            return (
                <EditLocation
                    projectId={projectId}
                    project={projectDetails}
                    onAfterSave={onRefresh}
                    primaryActionLabel="Save changes"
                />
            );
        }
        return (
            <EditUnitdetail
                projectId={projectId}
                unitProperties={unitProperties}
                onAfterSave={onRefresh}
                primaryActionLabel="Save changes"
            />
        );
    };

    return (
        <div className="flex flex-col gap-[20px]">
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
                                    className={`cursor-pointer p-[20px_30px] border-b-2 text-[13px] font-[SemiBold] whitespace-nowrap transition-colors ${
                                        isActive
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

                <div>{renderTabContent()}</div>
            </div>
        </div>
    );
};

export default EditProject;
