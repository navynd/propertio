import { useEffect, useMemo, useState } from "react";

import { TrashIcon, EditIcon, UnitsIcon, MultiUserIcon } from "../../../../components/CustomFile/icons";
import { useLocation, useNavigate } from "react-router-dom";
import ProjectDescription from "./AllocatedProjectComponent/ProjectDescription";
import PayMap from "./AllocatedProjectComponent/PayMap";
import CommonSection from "./AllocatedProjectComponent/CommonSection";
import Loader from "../../../../components/Loader/loader";
import { agentService, type AgentAllocatedProjectDetail } from "../../../../services/agentService";
import { toast } from "../../../../services/toast";

const AllocatedProjectDetail = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [project, setProject] = useState<AgentAllocatedProjectDetail | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [projectImageBaseUrl, setProjectImageBaseUrl] = useState("");
    const [projectVideoBaseUrl, setProjectVideoBaseUrl] = useState("");
    const [projectDocBaseUrl, setProjectDocBaseUrl] = useState("");
    const [agencyImageBaseUrl, setAgencyImageBaseUrl] = useState("");
    const projectId = useMemo(() => {
        const state = location.state as { projectId?: string } | null;
        return state?.projectId || "";
    }, [location.state]);

    useEffect(() => {
        if (!projectId) {
            toast.error("Missing project", "Project ID not found.");
            navigate("/agent/allocated/project");
            return;
        }

        const fetchDetails = async () => {
            setIsLoading(true);
            try {
                const [supportedRes, detailRes] = await Promise.all([
                    agentService.getSupportedUrlsMasterData(),
                    agentService.getAllocatedProjectById(projectId),
                ]);
                const anySupported = supportedRes as unknown as {
                    supportedUrls?: { projectUrl?: { img?: string; vid?: string; doc?: string } };
                    supportedurls?: { projectUrl?: { img?: string; vid?: string; doc?: string } };
                    projectUrl?: { img?: string; vid?: string; doc?: string };
                    agencyUrl?: { img?: string; vid?: string; doc?: string };
                };
                const projectUrl =
                    anySupported?.supportedUrls?.projectUrl ||
                    anySupported?.supportedurls?.projectUrl ||
                    anySupported?.projectUrl ||
                    {};
                const agencyUrl =
                    (anySupported as { supportedUrls?: { agencyUrl?: { img?: string } } })?.supportedUrls?.agencyUrl ||
                    (anySupported as { supportedurls?: { agencyUrl?: { img?: string } } })?.supportedurls?.agencyUrl ||
                    anySupported?.agencyUrl ||
                    {};
                setProjectImageBaseUrl(projectUrl.img || "");
                setProjectVideoBaseUrl(projectUrl.vid || "");
                setProjectDocBaseUrl(projectUrl.doc || "");
                setAgencyImageBaseUrl(agencyUrl.img || "");
                setProject(detailRes || null);
            } catch (error: unknown) {
                const message = (error as { message?: string })?.message || "Failed to fetch project details.";
                toast.error("Load failed", message);
            } finally {
                setIsLoading(false);
            }
        };

        void fetchDetails();
    }, [navigate, projectId]);

    const brochureUrl = useMemo(() => {
        if (!project?.brochure) return "";
        if (project.brochure.startsWith("http://") || project.brochure.startsWith("https://")) return project.brochure;
        if (!projectDocBaseUrl) return project.brochure;
        return `${projectDocBaseUrl.replace(/\/?$/, "/")}${project.brochure}`;
    }, [project?.brochure, projectDocBaseUrl]);

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <div className="rounded-[15px] bg-white md:p-[20px_30px_20px_30px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px]">
                <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0">
                    <span className="text-[#707070] font-[Regular]">Project Name : </span>
                    <span className="text-[#222] font-[Bold]">{project?.projectName || "--/--"}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end">
                    <button
                        type="button"
                        onClick={() => navigate(`/agent/allocated/project-units`, { state: { projectId } })}
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <UnitsIcon width={20} height={20} stroke="#222222" />
                        View units
                    </button>
                    <button
                        type="button"
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <TrashIcon width={20} height={20} stroke="#222222" />
                        Delete
                    </button>
                </div>
            </div>
            {/* Project description */}
            <ProjectDescription project={project} />
            <PayMap project={project} brochureUrl={brochureUrl} />
            <CommonSection
                project={project}
                imageBaseUrl={projectImageBaseUrl}
                videoBaseUrl={projectVideoBaseUrl}
                agencyImageBaseUrl={agencyImageBaseUrl}
            />
            {isLoading && (
                <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/25">
                    <Loader size={90} margin={0} />
                </div>
            )}
        </div>
    );
};

export default AllocatedProjectDetail;      
