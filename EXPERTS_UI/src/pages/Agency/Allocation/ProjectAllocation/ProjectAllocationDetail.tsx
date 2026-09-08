import { TrashIcon, UnitsIcon, MultiUserIcon } from "../../../../components/CustomFile/icons";
import { useNavigate, useParams } from "react-router-dom";
import AgencyHeader from "../../../../components/Header/AgencyHeader";
import ProjectDescription from "./ProjectAllocationComponent/ProjectDescription";
import PayMap from "./ProjectAllocationComponent/PayMap";
import CommonSection from "./ProjectAllocationComponent/CommonSection";
import { agencyService } from "../../../../services/agencyService";
import { toast } from "../../../../services/toast";
import { getApiErrorMessage } from "../../../../services/apiClient";
import Loader from "../../../../components/Loader/loader";
import { useEffect, useState } from "react";

const ProjectAllocationDetail = () => {
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const { id: projectId } = useParams();

  useEffect(() => {
    if (!projectId) return;
    let cancelled = false;

    (async () => {
      try {
        setLoading(true);
        const res = await agencyService.getProjects({
          projectId,
          page: 1,
          limit: 1,
        });
        if (!cancelled) setProject(res);
      } catch (err) {
        if (!cancelled) {
          toast.error(
            "Could not load project",
            getApiErrorMessage(
              err,
              "Could not load project details. Please try again.",
            ),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [projectId]);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <AgencyHeader
        title="Project details"
        showBack={true}
        onBackClick={() => navigate(-1)}
      />

      {loading ? (
        <div
          className="rounded-[15px] border border-[rgba(34,34,34,0.08)] bg-white min-h-[320px] flex items-center justify-center py-16"
          aria-busy="true"
          aria-label="Loading project details"
        >
          <Loader size={80} margin={0} />
        </div>
      ) : (
        <>
          <div className="rounded-[15px] bg-white md:p-[22px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px]">
            <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0">
              <span className="text-[#707070] font-[Regular]">Project Name : </span>
              <span className="text-[#222] font-[Bold]">{project?.projectName}</span>
            </p>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end">
              <button
                type="button"
                onClick={() =>
                  navigate(`/agency/allocation/project-units/${projectId}`, {
                    state: {
                      projectId,
                      projectName: project?.projectName,
                      from: "project-details",
                    },
                  })
                }
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
              <button
                type="button"
                onClick={() =>
                  navigate("/agency/allocation/project-assign-agent", {
                    state: {
                      from: "project-details",
                      projectId,
                      projectName: project?.projectName,
                    },
                  })
                }
                className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#D4A373] px-[14px] h-[33px] text-[12px] font-[SemiBold] text-white shrink-0"
              >
                <MultiUserIcon width={20} height={20} stroke="#FFF" />
                Assign Agents
              </button>
            </div>
          </div>
          <ProjectDescription project={project} />
          <PayMap project={project} />
          <CommonSection project={project} />
        </>
      )}
    </div>
  );
};

export default ProjectAllocationDetail;
