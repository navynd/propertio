import { useEffect, useMemo, useState } from "react";
import ProjectDescription from "./ProjectDetailsComponent/ProjectDescription";
import PayMap from "./ProjectDetailsComponent/PayMap";
import CommonSection from "./ProjectDetailsComponent/CommonSection";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import {
    agentService,
    type AgentAllocatedProjectDetail,
    type AgentProjectLeadDetailResponse,
} from "../../../../services/agentService";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";

const LeadsViewProjectDetails = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const params = useParams<{ id?: string }>();
    const state = (location.state || {}) as { leadId?: string };
    const leadId = (state.leadId || params.id || "").trim();
    const [isLoading, setIsLoading] = useState(false);
    const [data, setData] = useState<AgentProjectLeadDetailResponse | null>(null);
    const [projectDetail, setProjectDetail] = useState<AgentAllocatedProjectDetail | null>(null);
    const [projectImageBaseUrl, setProjectImageBaseUrl] = useState("");
    const [projectVideoBaseUrl, setProjectVideoBaseUrl] = useState("");
    const [projectDocBaseUrl, setProjectDocBaseUrl] = useState("");
    const [agencyImageBaseUrl, setAgencyImageBaseUrl] = useState("");

    useEffect(() => {
        if (!leadId) {
            toast.error("Missing lead", "Lead id not found. Please open from project lead detail.");
            navigate(-1);
            return;
        }
        const loadDetail = async () => {
            setIsLoading(true);
            try {
                const detail = await agentService.getProjectLeadById(leadId);
                setData(detail || null);
            } catch (error: unknown) {
                const message = (error as { message?: string })?.message || "Failed to load project details.";
                toast.error("Load failed", message);
            } finally {
                setIsLoading(false);
            }
        };
        void loadDetail();
    }, [leadId, navigate]);

    const projectName = useMemo(
        () => data?.project?.projectName || data?.inquiry?.projectTitle || "--/--",
        [data?.inquiry?.projectTitle, data?.project?.projectName]
    );
    const projectId = useMemo(() => (data?.project?.id || "").trim(), [data?.project?.id]);

    useEffect(() => {
        if (!projectId) return;
        const loadProjectDetails = async () => {
            setIsLoading(true);
            try {
                const [supportedRes, projectRes] = await Promise.all([
                    agentService.getSupportedUrlsMasterData(),
                    agentService.getAllocatedProjectById(projectId),
                ]);
                const anySupported = supportedRes as unknown as {
                    supportedUrls?: { projectUrl?: { img?: string; vid?: string; doc?: string }; agencyUrl?: { img?: string } };
                    supportedurls?: { projectUrl?: { img?: string; vid?: string; doc?: string }; agencyUrl?: { img?: string } };
                    projectUrl?: { img?: string; vid?: string; doc?: string };
                    agencyUrl?: { img?: string };
                };
                const projectUrl =
                    anySupported?.supportedUrls?.projectUrl ||
                    anySupported?.supportedurls?.projectUrl ||
                    anySupported?.projectUrl ||
                    {};
                const agencyUrl =
                    anySupported?.supportedUrls?.agencyUrl ||
                    anySupported?.supportedurls?.agencyUrl ||
                    anySupported?.agencyUrl ||
                    {};
                setProjectImageBaseUrl(projectUrl.img || "");
                setProjectVideoBaseUrl(projectUrl.vid || "");
                setProjectDocBaseUrl(projectUrl.doc || "");
                setAgencyImageBaseUrl(agencyUrl.img || "");
                setProjectDetail(projectRes || null);
            } catch (error: unknown) {
                const message = (error as { message?: string })?.message || "Failed to load project details.";
                toast.error("Load failed", message);
            } finally {
                setIsLoading(false);
            }
        };
        void loadProjectDetails();
    }, [projectId]);

    const brochureUrl = useMemo(() => {
        if (!projectDetail?.brochure) return "";
        if (projectDetail.brochure.startsWith("http://") || projectDetail.brochure.startsWith("https://")) return projectDetail.brochure;
        if (!projectDocBaseUrl) return projectDetail.brochure;
        return `${projectDocBaseUrl.replace(/\/?$/, "/")}${projectDetail.brochure}`;
    }, [projectDetail?.brochure, projectDocBaseUrl]);

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
            <div className="rounded-[15px] bg-white md:p-[22px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px]">
                <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0">
                    <span className="text-[#707070] font-[Regular]">Project Name : </span>
                    <span className="text-[#222] font-[Bold]">{projectName}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end">
                    {/* <button
                        type="button"
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <UnitsIcon width={20} height={20} stroke="#222222" />
                        View units
                    </button> */}
                </div>
            </div>
            {/* Project description */}
            <ProjectDescription project={data?.project || null} />
            <PayMap project={projectDetail} brochureUrl={brochureUrl} />
            <CommonSection
                project={projectDetail}
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

export default LeadsViewProjectDetails;  
