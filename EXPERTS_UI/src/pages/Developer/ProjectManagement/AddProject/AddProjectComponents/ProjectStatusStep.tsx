import { NewProjectsIcon, OffPlanProjectsIcon } from "../../../../../components/CustomFile/icons";
import type { ProjectTypeStatusMasterItem } from "../../../../../services/developerService";

type ProjectStatusStepProps = {
    status: "ready" | "off-plan";
    options: ProjectTypeStatusMasterItem[];
    onChange: (status: "ready" | "off-plan") => void;
};

const ProjectStatusStep = ({ status, options, onChange }: ProjectStatusStepProps) => {
    const projectStatusOptions = options.map((option) => ({
        id: option.value,
        label: option.name,
        Icon: option.value === "off-plan" ? OffPlanProjectsIcon : NewProjectsIcon,
    }));

    return (
        <div className="rounded-[15px] bg-white p-[16px] md:p-[30px]">
            <h3 className="text-[20px] font-[Bold] text-[#222] mb-[30px] leading-[1.2]">Project status</h3>
            <p className="text-[14px] font-[SemiBold] text-[#222] mb-[15px]">Select project status <span className="text-[#EA3934]">*</span></p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[10px]">
                {projectStatusOptions.map(({ id, label, Icon }) => {
                    const isActive = status === id;
                    return (
                        <button
                            key={id}
                            type="button"
                            onClick={() => onChange(id)}
                            className={`h-[115px] p-[20px_15px] rounded-[10px] border flex flex-col items-center justify-center gap-[10px] ${isActive
                                ? "border-[rgba(8,50,174,0.30)] bg-[rgba(8,50,174,0.10)]"
                                : "border-[rgba(34,34,34,0.10)] bg-white"
                                }`}
                        >
                            <Icon width={50} height={50} fill={isActive ? "#0832AE" : "#222"} />
                            <span className={`text-[13px] font-[Medium] ${isActive ? "text-[#0832AE]" : "text-[#222]"}`}>
                                {label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default ProjectStatusStep;
