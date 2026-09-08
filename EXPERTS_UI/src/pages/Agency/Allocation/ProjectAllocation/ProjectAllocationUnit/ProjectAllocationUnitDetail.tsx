import { useEffect, useState } from "react";
import mainbg from "../../../../../assets/img/mainbg.png";
import {
  MultiUserIcon,
  TrashIcon,
} from "../../../../../components/CustomFile/icons";
// import AssignedUnit from "./AssignedUnit";
import { useLocation, useNavigate } from "react-router-dom";
import AgencyHeader from "../../../../../components/Header/AgencyHeader";
import ProjectAssignUnitTab, {
  type UnitStatusFilter,
} from "../ProjectAssignUnitTab";
import {
  agencyService,
  type ProjectUnitDetailResponse,
} from "../../../../../services/agencyService";
import { toast } from "../../../../../services/toast";
import { API_BASE_URL, getApiErrorMessage } from "../../../../../services/apiClient";
import Loader from "../../../../../components/Loader/loader";
import { readAssignAgentNav, writeAssignAgentNav } from "../../assignAgentNav";
type DetailItem = {
  label: string;
  value: string | number;
  subValue?: string;
};
type UnitTileStatus =
  | "agentSold"
  | "soldOther"
  | "agentWorking"
  | "available"
  | "unavailable";

const unitLegend: {
  status: UnitTileStatus;
  label: string;
  swatchClass: string;
}[] = [
    {
      status: "agentSold",
      label: "Units Sold by your agent",
      swatchClass: "bg-[#0832AE]",
    },
    {
      status: "soldOther",
      label: "Units Sold by other",
      swatchClass: "bg-[#D4A373]",
    },
    {
      status: "agentWorking",
      label: "Agent working on",
      swatchClass: "bg-[#00A663]",
    },
    {
      status: "available",
      label: "Units available",
      swatchClass: "bg-[#F3F4F6] border border-[rgba(34,34,34,0.08)]",
    },
    {
      status: "unavailable",
      label: "Units unavailable",
      swatchClass: "bg-[#D1D5DB]",
    },
  ];

function unitTileClass(status: UnitTileStatus) {
  if (status === "agentSold") return "bg-[#0832AE] text-white";
  if (status === "soldOther") return "bg-[#D4A373] text-white";
  if (status === "agentWorking") return "bg-[#00A663] text-white";
  if (status === "available")
    return "bg-[#F3F4F6] text-[#222] border border-[rgba(34,34,34,0.08)]";
  return "bg-[#D1D5DB] text-[#222]";
}

const mapDisplayState = (state?: string): UnitTileStatus => {
  switch (state) {
    case "agent-working-on":
      return "agentWorking";
    case "sold-by-your-agent":
    case "sold-by-agent":
      return "agentSold";
    case "sold-by-other":
      return "soldOther";
    case "available":
      return "available";
    default:
      return "unavailable";
  }
};

const ProjectAllocationUnitDetail = () => {
  const navigate = useNavigate();
  const [unitsData, setUnitsData] = useState<ProjectUnitDetailResponse | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [mainTab, setMainTab] = useState<"agencies" | "status">("agencies");
  const [statusFilter, setStatusFilter] = useState<UnitStatusFilter>("All");
  const [statusSearch, setStatusSearch] = useState("");
  const [statusPage, setStatusPage] = useState(1);
  const [debouncedStatusSearch, setDebouncedStatusSearch] = useState("");
  const [projectImageBaseUrl, setProjectImageBaseUrl] = useState<string | null>(
    null,
  );

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedStatusSearch(statusSearch.trim());
    }, 350);
    return () => window.clearTimeout(t);
  }, [statusSearch]);

  useEffect(() => {
    setStatusPage(1);
  }, [statusFilter, debouncedStatusSearch, mainTab]);

  const location = useLocation();
  const navCtx = readAssignAgentNav(location.state);
  const projectId = navCtx?.projectId;
  const layoutId = navCtx?.layoutId;
  const projectName = navCtx?.projectName?.trim() || "Project";
  const toApiStatusFilter = (f: UnitStatusFilter): string => {
    if (f === "All") return "all";
    if (f === "Follow up") return "follow-up";
    if (f === "In-Progress") return "in-progress";
    if (f === "PreClose") return "pre-close";
    return f.toLowerCase();
  };

  useEffect(() => {
    if (!projectId || !layoutId) {
      toast.error(
        "Missing project or layout",
        "Open this unit from project units so project and layout context are available.",
      );
      navigate(-1);
      return;
    }
    const fetchUnits = async () => {
      try {
        setLoading(true);

        const res = (await agencyService.getProjectUnits({
          projectId,
          layoutId,
          unitStatusTab: mainTab === "status" ? "unit-status" : "assigned-agents",
          tab: "assigned",
          statusFilter: mainTab === "status" ? toApiStatusFilter(statusFilter) : undefined,
          search: mainTab === "status" ? debouncedStatusSearch || undefined : undefined,
          page: mainTab === "status" ? statusPage : undefined,
          limit: mainTab === "status" ? 10 : undefined,
        })) as ProjectUnitDetailResponse;
        setUnitsData(res);
      } catch (error) {
        toast.error(
          "Could not load unit details",
          getApiErrorMessage(error, "Could not load unit details."),
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUnits();
  }, [
    projectId,
    layoutId,
    navigate,
    mainTab,
    statusFilter,
    debouncedStatusSearch,
    statusPage,
  ]);

  useEffect(() => {
    if (!projectId || !layoutId) return;
    writeAssignAgentNav({
      projectId,
      layoutId,
      projectName,
      from: "project-unit-details",
    });
  }, [projectId, layoutId, projectName]);

  const layoutDetailFields: DetailItem[] = [
    { label: "Layout name", value: unitsData?.layoutName || "TYPE A - 1BHK" },

    {
      label: "Number of beds",
      value: unitsData?.beds || 2,
      subValue: unitsData?.maidBedroom ? "(maid rooms available)" : "",
    },

    {
      label: "Number of units available",
      value: unitsData?.unitsAvailable || 20,
    },

    {
      label: "Number of units assigned",
      value: unitsData?.unitsAssigned || 0,
    },

    {
      label: "Property type",
      value: unitsData?.propertyType || "Apartment",
    },

    {
      label: "Number of baths",
      value: unitsData?.baths || 4,
    },

    {
      label: "Area of this property",
      value: `${unitsData?.areaSqft || 1396} sqft`,
    },

    {
      label: "Price",
      value: `${unitsData?.price?.amount || "4.8M"} ${unitsData?.price?.currency || "AED"}`,
    },
  ];

  useEffect(() => {
    let isMounted = true;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallback = `${fallbackOrigin}/uploads/img/project/`;

    agencyService
      .getMasterData(["supportedurls"])
      .then((res) => {
        if (!isMounted) return;

        const projectImg = res?.supportedUrls?.projectUrl?.img || fallback;

        setProjectImageBaseUrl(projectImg.replace(/\/?$/, "/"));
      })
      .catch(() => {
        if (!isMounted) return;
        setProjectImageBaseUrl(fallback);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const toProjectImageUrl = (image: string | null) => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;
    const base = (projectImageBaseUrl || fallbackBase).replace(/\/?$/, "/");
    return `${base}${image}`;
  };

  const hasFloorPlan = (unitsData?.floorPlans?.length ?? 0) > 0;
  const isInitialPageLoading = loading && !unitsData;
  const isTabSectionLoading = loading && !!unitsData;

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      {/*Header*/}
      <div>
        <AgencyHeader
          title="Unit detail"
          showBack={true}
          onBackClick={() => navigate(-1)}
        />
      </div>
      {/*Tower Name*/}
      <div className="rounded-[15px] bg-white md:p-[25px_30px] p-[20px] min-w-0 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[20px] leading-[140%] shrink-0">
          <span className="text-[#707070] font-[Regular]">Name : </span>
          <span className="text-[#222] font-[Bold]">{projectName}</span>
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
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
              navigate("/agency/allocation/project-assign-agent", {
                state: {
                  from: "project-unit-details",
                  projectId: projectId!,
                  layoutId: layoutId!,
                },
              })
            }
            className="cursor-pointer inline-flex items-center justify-center gap-[6px] rounded-full bg-[#D4A373] px-[14px] h-[33px] text-[12px] font-[SemiBold] text-white"
          >
            <MultiUserIcon width={20} height={20} stroke="#FFFFFF" />
            Assign agent
          </button>
        </div>
      </div>

      {isInitialPageLoading ? (
        <div className="rounded-[15px] border border-[rgba(34,34,34,0.08)] bg-white min-h-[280px] flex items-center justify-center py-16">
          <Loader size={80} margin={0} />
        </div>
      ) : (
        <>
          {/*Layout Details*/}
          <div className="min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {layoutDetailFields.map((field) => (
                <div
                  key={field.label}
                  className="rounded-[12px] bg-white md:p-[25px_30px] p-[20px] flex flex-col justify-start"
                >
                  <p className="text-[12px] text-[#222] font-[Medium] mb-2 leading-tight">
                    {field.label}
                  </p>
                  <div className="flex items-center gap-2">
                    <p className="text-[16px] font-[Bold] text-[#222] leading-snug">
                      {field.value}
                    </p>
                    {field.subValue ? (
                      <p className="text-[12px] text-[#707070] font-[Regular] leading-snug">
                        {field.subValue}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/*Floor Plan*/}
          <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0">
            <h2 className="text-[20px] font-[Bold] text-[#222] mb-5 sm:mb-6">
              Floor plan
            </h2>
            <div className="flex flex-col lg:flex-row lg:items-center gap-8 lg:gap-10 xl:gap-14">
              <div className="flex-1 min-w-0 lg:basis-[58%] lg:max-w-[62%]">
                <div className="rounded-[12px] overflow-hidden bg-[#F0F0F0] aspect-[4/3] max-h-[320px] sm:max-h-[380px] flex items-center justify-center">
                  {hasFloorPlan ? (
                    <img
                      src={toProjectImageUrl(unitsData?.floorPlans?.[0] ?? null)}
                      alt="Floor plan"
                      className="h-full w-full object-cover min-h-[200px]"
                    />
                  ) : (
                    <p className="text-[14px] text-[#707070] font-[Regular]">
                      Floor plan not available.
                    </p>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-6 sm:gap-8 shrink-0 lg:py-2"></div>
            </div>
          </section>

          {/*Available units*/}
          <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] min-w-0">
            <h2 className="text-[20px] font-[Bold] text-[#222] mb-5 sm:mb-6">
              Available units
            </h2>
            <div className="flex flex-wrap gap-x-[20px] gap-y-[10px] mb-[20px]">
              {unitLegend.map((item) => (
                <span
                  key={item.status}
                  className="inline-flex items-center gap-[8px] text-[12px] font-[Regular] text-[#222]"
                >
                  <span
                    className={`h-[15px] w-[15px] shrink-0 rounded-[5px] ${item.swatchClass}`}
                  />
                  {item.label}
                </span>
              ))}
            </div>
            <div className="grid grid-cols-3 min-[480px]:grid-cols-5 sm:grid-cols-6 lg:grid-cols-7 gap-2 sm:gap-3">
              {unitsData?.unitGrid?.map((unit) => {
                const tileStatus = mapDisplayState(unit.displayState);
                return (
                  <div
                    key={unit.unitId}
                    className={`flex min-h-[39px] items-center justify-center rounded-[10px] text-center text-[12px] font-[Bold] ${unitTileClass(tileStatus)}`}
                  >
                    <p className="truncate max-w-[70%] text-[12px] font-[Bold]">
                      {unit.unitNumber}
                    </p>
                  </div>
                );
              })}
            </div>
          </section>

          {/*Assigned units*/}
          <div>
            <ProjectAssignUnitTab
              units={unitsData}
              mainTab={mainTab}
              onMainTabChange={setMainTab}
              tabLoading={isTabSectionLoading}
              statusFilter={statusFilter}
              statusSearch={statusSearch}
              statusPage={statusPage}
              onStatusFilterChange={setStatusFilter}
              onStatusSearchChange={setStatusSearch}
              onStatusPageChange={setStatusPage}
              projectId={projectId}
              layoutId={layoutId}
              projectName={projectName}
            />
          </div>
        </>
      )}
    </div>
  );
};

export default ProjectAllocationUnitDetail;
