import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";

import AgencyHeader from "../../../../components/Header/AgencyHeader";
import ProjectDescription from "../../Allocation/ProjectAllocation/ProjectAllocationComponent/ProjectDescription";
import PayMap from "../../Allocation/ProjectAllocation/ProjectAllocationComponent/PayMap";
import CommonSection from "../../Allocation/ProjectAllocation/ProjectAllocationComponent/CommonSection";
import { agencyService } from "../../../../services/agencyService";
import { getApiErrorMessage } from "../../../../services/apiClient";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";

type LeadDetailShape = {
  project?: { id?: string; _id?: string; projectName?: string | null } | null;
};

const ViewProjectDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { id: leadId } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(false);
  const [leadDetail, setLeadDetail] = useState<LeadDetailShape | null>(null);
  const [projectDetail, setProjectDetail] = useState<Record<string, unknown> | null>(null);

  useEffect(() => {
    const trimmed = (leadId || "").trim();
    if (!trimmed) {
      toast.error("Missing lead", "Lead id not found. Open this page from a project lead.");
      navigate(-1);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      try {
        const lead = (await agencyService.getProjectLeadById(trimmed)) as LeadDetailShape;
        if (cancelled) return;
        setLeadDetail(lead || null);

        const pid = String(lead?.project?.id ?? lead?.project?._id ?? "").trim();
        if (!pid) {
          setProjectDetail(null);
          toast.error("Missing project", "This lead has no linked project.");
          return;
        }

        const project = (await agencyService.getProjects({
          projectId: pid,
          page: 1,
          limit: 1,
        })) as Record<string, unknown> | null;

        if (cancelled) return;
        setProjectDetail(project && typeof project === "object" ? project : null);
      } catch (error: unknown) {
        if (!cancelled) {
          setLeadDetail(null);
          setProjectDetail(null);
          toast.error(
            "Load failed",
            getApiErrorMessage(error, "Could not load project details."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void load();
    return () => {
      cancelled = true;
    };
  }, [leadId, location.key, navigate]);

  const projectName = useMemo(() => {
    const fromProject =
      typeof projectDetail?.projectName === "string" ? projectDetail.projectName.trim() : "";
    if (fromProject) return fromProject;
    const fromLead = leadDetail?.project?.projectName?.trim();
    return fromLead || "—";
  }, [leadDetail?.project?.projectName, projectDetail]);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <AgencyHeader
        title="Project details"
        showBack={true}
        onBackClick={() => navigate(-1)}
      />

      <div className="rounded-[15px] bg-white md:p-[22px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px]">
        <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0">
          <span className="text-[#707070] font-[Regular]">Project Name : </span>
          <span className="text-[#222] font-[Bold]">{projectName}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end" />
      </div>

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
          <ProjectDescription project={projectDetail} />
          <PayMap project={projectDetail} />
          <CommonSection project={projectDetail} />
        </>
      )}
    </div>
  );
};

export default ViewProjectDetails;
