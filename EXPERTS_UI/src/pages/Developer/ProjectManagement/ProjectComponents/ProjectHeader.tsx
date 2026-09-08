import { TrashIcon, EditIcon, UnitsIcon, MultiUserIcon } from "../../../../components/CustomFile/icons";
import { useNavigate } from "react-router-dom";
import { useLocation } from "react-router-dom";
type ProjectHeaderProps = {
    projectName?: string;
    projectId?: string;
};

const ProjectHeader = ({ projectName = "Omniyat Bespoke", projectId }: ProjectHeaderProps) => {
    const navigate = useNavigate();
    const location = useLocation();
    const isSoldOut = location.pathname === "/developer/soldout-project-details";
    return (
        <div>
            {/* Project details */}
            <div className="rounded-[15px] bg-white md:p-[22px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px]">
                <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0">
                    <span className="text-[#707070] font-[Regular]">Project Name : </span>
                    <span className="text-[#222] font-[Bold]">{projectName || "-"}</span>
                </p>
                <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end">
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                projectId
                                    ? `/developer/units?projectId=${encodeURIComponent(projectId)}`
                                    : "/developer/units",
                                { state: { projectName } }
                            )
                        }
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <UnitsIcon width={20} height={20} stroke="#222222" />
                        View units
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                projectId
                                    ? `/developer/edit-project?projectId=${encodeURIComponent(projectId)}`
                                    : "/developer/edit-project"
                            )
                        }
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <EditIcon width={20} height={20} stroke="#222222" />
                        Edit
                    </button>
                    <button
                        type="button"
                        className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full border border-[rgba(34,34,34,0.10)] bg-white px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#222] shrink-0"
                    >
                        <TrashIcon width={20} height={20} />
                        Delete
                    </button>
                    <button
                        type="button"
                        onClick={() =>
                            navigate(
                                projectId
                                    ? `/developer/assign-agencies?projectId=${encodeURIComponent(projectId)}`
                                    : "/developer/assign-agencies",
                                { state: { projectName } }
                            )
                        }
                        className={`cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full  px-[14px] h-[33px] text-[12px] font-[SemiBold] text-[#FFF] shrink-0 ${isSoldOut ? "opacity-50 bg-[#D4A373]" : "bg-[#D4A373]"}`}
                    >
                        <MultiUserIcon width={20} height={20} stroke="#FFFFFF" />
                        Assign agency
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProjectHeader;
