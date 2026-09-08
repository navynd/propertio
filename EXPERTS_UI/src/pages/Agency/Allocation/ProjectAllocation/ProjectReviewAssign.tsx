import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AgencyHeader from "../../../../components/Header/AgencyHeader";
import Loader from "../../../../components/Loader/loader";
import { TickIcon } from "../../../../components/CustomFile/icons";
import buildingImage from "../../../../assets/img/building.svg";
import mainbg from "../../../../assets/img/mainbg.png";
import {
  agencyService,
  type AgencyBulkAssignLayout,
  type AgencyBulkAssignUnitsResponse,
  type ProjectUnitDetailResponse,
} from "../../../../services/agencyService";
import { API_BASE_URL, getApiErrorMessage } from "../../../../services/apiClient";
import { toast } from "../../../../services/toast";
import { canSelectUnitForAssignment } from "../unitStatusHelpers";
import {
  readAssignAgentNav,
  writeAssignAgentNav,
  notifyAssignAgentDraftUpdated,
} from "../assignAgentNav";

function isBulkResponse(
  data: ProjectUnitDetailResponse | AgencyBulkAssignUnitsResponse,
): data is AgencyBulkAssignUnitsResponse {
  return data != null && Array.isArray((data as AgencyBulkAssignUnitsResponse).buildings);
}

const ProjectReviewAssign = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const navCtx = useMemo(() => readAssignAgentNav(location.state), [location.state]);
  const projectId = navCtx?.projectId;
  const layoutId = navCtx?.layoutId;

  const [bulkData, setBulkData] = useState<AgencyBulkAssignUnitsResponse | null>(null);
  const [layoutDetail, setLayoutDetail] = useState<ProjectUnitDetailResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [agentImageBaseUrl, setAgentImageBaseUrl] = useState("");
  const lastHydratedKey = useRef<string | null>(null);

  const hydrateKey = `${projectId ?? ""}|${layoutId ?? ""}`;

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!navCtx?.projectId) return;
    if (lastHydratedKey.current !== hydrateKey) {
      lastHydratedKey.current = hydrateKey;
      const nav = readAssignAgentNav(location.state);
      const ids = nav?.selectedUnitIds ?? [];
      setSelectedUnits(ids);
      if (nav?.projectId && ids.length > 0) {
        writeAssignAgentNav({
          ...nav,
          selectedUnitIds: ids,
        });
        notifyAssignAgentDraftUpdated();
      }
      return;
    }
    writeAssignAgentNav({
      ...navCtx,
      selectedUnitIds: selectedUnits.length > 0 ? selectedUnits : undefined,
      selectedAgentId: navCtx.selectedAgentId,
      selectedAgentName: navCtx.selectedAgentName,
      selectedAgentType: navCtx.selectedAgentType,
      selectedAgentProfilePicture: navCtx.selectedAgentProfilePicture,
    });
    notifyAssignAgentDraftUpdated();
  }, [navCtx, selectedUnits, hydrateKey, location.state]);

  useEffect(() => {
    let isMounted = true;
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallback = `${fallbackOrigin}/uploads/img/project/`;
    agencyService
      .getMasterData(["supportedurls"])
      .then((res) => {
        if (!isMounted) return;
        const agentImg = res?.supportedUrls?.agentUrl?.img?.trim() || fallback;
        setAgentImageBaseUrl(agentImg.replace(/\/?$/, "/"));
      })
      .catch(() => {
        if (!isMounted) return;
        setAgentImageBaseUrl(fallback.replace(/\/?$/, "/"));
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const toAgentProfileUrl = (image: string | null | undefined) => {
    if (!image) return mainbg;
    if (image.startsWith("http")) return image;
    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackBase = `${fallbackOrigin}/uploads/img/project/`;
    const base = (agentImageBaseUrl || fallbackBase).replace(/\/+$/, "");
    return `${base}/${String(image).replace(/^\/+/, "")}`;
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!projectId) {
        toast.error(
          "Missing project",
          "Open review from the assign agent flow so project context is available.",
        );
        return;
      }
      try {
        setLoading(true);
        const res = await agencyService.getProjectUnits(
          layoutId ? { projectId, layoutId, page: 1, limit: 100 } : { projectId, bulk: true },
        );
        if (cancelled) return;
        if (isBulkResponse(res)) {
          setBulkData(res);
          setLayoutDetail(null);
        } else {
          setLayoutDetail(res);
          setBulkData(null);
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(
            "Could not load units",
            getApiErrorMessage(error, "Could not load units."),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [projectId, layoutId]);

  const allUnassignedIds = useMemo(() => {
    if (bulkData) {
      const ids: string[] = [];
      for (const b of bulkData.buildings) {
        for (const L of b.layouts) {
          for (const u of L.units) {
            if (canSelectUnitForAssignment(u.status, u.isAssigned)) ids.push(String(u.unitId));
          }
        }
      }
      return ids;
    }
    if (layoutDetail?.unitGrid) {
      return layoutDetail.unitGrid
        .filter((u) => canSelectUnitForAssignment(u.status, u.isAssigned))
        .map((u) => String(u.unitId));
    }
    return [];
  }, [bulkData, layoutDetail]);

  const toggleUnit = (unitId: string, status: string | undefined, isAssigned: boolean) => {
    if (!canSelectUnitForAssignment(status, isAssigned)) return;
    const id = String(unitId);
    setSelectedUnits((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  };

  const toggleSelectAllGlobal = () => {
    setSelectedUnits((prev) =>
      prev.length === allUnassignedIds.length && allUnassignedIds.length > 0
        ? []
        : [...allUnassignedIds],
    );
  };

  const toggleSelectAllInLayout = (layout: AgencyBulkAssignLayout) => {
    const ids = layout.units
      .filter((u) => canSelectUnitForAssignment(u.status, u.isAssigned))
      .map((u) => String(u.unitId));
    const allPicked = ids.length > 0 && ids.every((id) => selectedUnits.includes(id));
    setSelectedUnits((prev) => {
      if (allPicked) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const toggleSelectAllInBuilding = (building: AgencyBulkAssignUnitsResponse["buildings"][0]) => {
    const ids = building.layouts.flatMap((L) =>
      L.units
        .filter((u) => canSelectUnitForAssignment(u.status, u.isAssigned))
        .map((u) => String(u.unitId)),
    );
    const allPicked = ids.length > 0 && ids.every((id) => selectedUnits.includes(id));
    setSelectedUnits((prev) => {
      if (allPicked) return prev.filter((id) => !ids.includes(id));
      return [...new Set([...prev, ...ids])];
    });
  };

  const isGlobalAllUnassignedSelected =
    allUnassignedIds.length > 0 &&
    allUnassignedIds.every((id) => selectedUnits.includes(id));

  const renderUnitButton = (
    unitId: string,
    unitNumber: string,
    isAssigned: boolean,
    status?: string,
  ) => {
    const id = String(unitId);
    const isSelected = selectedUnits.includes(id);
    const selectable = canSelectUnitForAssignment(status, isAssigned);
    const locked = !selectable;
    return (
      <button
        key={id}
        type="button"
        disabled={locked}
        onClick={() => toggleUnit(id, status, isAssigned)}
        className={`rounded-[10px] p-[15px_20px] flex flex-col gap-[9px] items-center justify-between text-[12px] font-[Bold] border border-[rgba(34,34,34,0.10)] leading-[1.2] transition-colors ${isSelected
          ? "cursor-pointer bg-[#222] text-white border-[#222] border border-[rgba(34,34,34,0.10)]"
          : locked
            ? "cursor-not-allowed bg-[rgba(8,50,174,0.10)] text-[#222] border-none"
            : "cursor-pointer bg-white text-[#222] border-[rgba(34,34,34,0.10)]"
          }`}
      >
        <span
          className={`h-[15px] w-[15px] rounded-full border flex items-center justify-center text-[9px] leading-none ${isSelected
            ? "bg-[#D4A373] border-[#D4A373] text-white"
            : locked
              ? "bg-[#DCE3F5] border-[#C4CEE9] text-transparent"
              : "bg-white border-[rgba(34,34,34,0.12)] text-transparent"
            }`}
        >
          {isSelected && <TickIcon width={8} height={6} fill="#FFF" />}
        </span>
        <span>{unitNumber}</span>
      </button>
    );
  };

  const renderLayoutCard = (
    layout: AgencyBulkAssignLayout,
    opts: { layoutUnassignedIds: string[]; layoutUnitCount: number },
  ) => {
    const selectedInLayout = layout.units.filter((u) =>
      selectedUnits.includes(String(u.unitId)),
    ).length;
    const allLayoutUnassignedPicked =
      opts.layoutUnassignedIds.length > 0 &&
      opts.layoutUnassignedIds.every((id) => selectedUnits.includes(id));

    return (
      <div
        key={layout.layoutId}
        className="rounded-[12px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[20px] mb-[25px] last:mb-0"
      >
        <div className="flex items-center justify-between gap-4 mb-[12px]">
          <div>
            <p className="text-[15px] text-[#222] font-[Medium]">{layout.layoutName}</p>
            <p className="text-[12px] text-[#707070] font-[Regular]">
              {layout.beds} bed · {layout.areaSqft != null ? `${layout.areaSqft} sqft` : "—"} ·{" "}
              {opts.layoutUnitCount} units
            </p>
          </div>
          <div className="flex items-center gap-[8px]">
            <p className="h-[21px] min-w-[36px] px-[8px] rounded-[5px] bg-[#F5F5F5] text-[12px] text-[#222] font-[SemiBold] inline-flex items-center justify-center">
              {selectedInLayout}/{opts.layoutUnitCount}
            </p>
            <button
              type="button"
              onClick={() => toggleSelectAllInLayout(layout)}
              className="cursor-pointer h-[33px] px-[12px] rounded-full border border-[rgba(34,34,34,0.10)] text-[12px] font-[SemiBold] text-[#222] bg-white"
            >
              {allLayoutUnassignedPicked ? "Deselect all" : "Select all"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-[8px]">
          {layout.units.map((u) =>
            renderUnitButton(u.unitId, u.unitNumber, u.isAssigned, u.status),
          )}
        </div>
      </div>
    );
  };

  const agentDisplayName =
    navCtx?.selectedAgentName?.trim() || (navCtx?.selectedAgentId ? "Selected agent" : "No agent");
  const agentDisplayType = navCtx?.selectedAgentType?.trim() || "—";

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <div>
        <AgencyHeader
          title="Review assignment"
          showBack={true}
          onBackClick={() => navigate(-1)}
        />
      </div>

      {loading ? (
        <div
          className="rounded-[15px] border border-[rgba(34,34,34,0.08)] bg-white min-h-[280px] flex items-center justify-center py-16"
          aria-busy="true"
          aria-label="Loading units"
        >
          <Loader size={80} margin={0} />
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-[20px] mb-[60px]">
          <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] p-[20px]">
            <div className="flex items-center justify-between gap-3 mb-[6px]">
              <h2 className="text-[#222] text-[20px] leading-[1.2] font-[Bold]">
                Select units to assign
              </h2>
              <button
                type="button"
                onClick={toggleSelectAllGlobal}
                className="cursor-pointer flex items-center justify-center h-[33px] px-[14px] rounded-full border border-[rgba(34,34,34,0.10)] text-[12px] font-[SemiBold] text-[#222]"
              >
                {isGlobalAllUnassignedSelected ? "Deselect all" : "Select all"}
              </button>
            </div>
            <p className="text-[12px] font-[SemiBold] text-[#707070] mb-[8px]">
              <span className="text-[#222]">{selectedUnits.length}</span> units selected
              {bulkData != null && (
                <span className="text-[#707070] font-[Regular]">
                  {" "}
                  · {bulkData.totalUnits} total in allocation
                </span>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-[16px] mb-[18px]">
              <span className="flex items-center gap-[7px] text-[14px] font-[Regular] text-[#222]">
                <span className="h-[15px] w-[15px] rounded-[5px] border border-[rgba(255,255,255,0.30)] bg-[#222]" />
                Selected
              </span>
              <span className="flex items-center gap-[7px] text-[14px] font-[Regular] text-[#707070]">
                <span className="h-[15px] w-[15px] rounded-[5px] border border-[rgba(8,50,174,0.30)] bg-[#E7EBF7]" />
                Assigned
              </span>
              <span className="flex items-center gap-[7px] text-[14px] font-[Regular] text-[#707070]">
                <span className="h-[15px] w-[15px] rounded-[5px] border border-[rgba(34,34,34,0.30)] bg-white" />
                Unassigned
              </span>
            </div>

            <div className="rounded-[15px] bg-[#F5F5F5] md:p-[20px] p-[15px]">
              {bulkData &&
                bulkData.buildings.map((building) => {
                  const bKey = building.buildingId ?? building.buildingName ?? "building";
                  const buildingUnassignedIds = building.layouts.flatMap((L) =>
                    L.units
                      .filter((u) => canSelectUnitForAssignment(u.status, u.isAssigned))
                      .map((u) => String(u.unitId)),
                  );
                  const allBuildingUnassignedPicked =
                    buildingUnassignedIds.length > 0 &&
                    buildingUnassignedIds.every((id) => selectedUnits.includes(id));

                  return (
                    <div key={bKey} className="mb-[14px] last:mb-0">
                      <div className="flex items-center justify-between gap-3 mb-[20px]">
                        <div className="flex items-center gap-3">
                          <div className="shrink-0">
                            <img
                              src={buildingImage}
                              alt={building.buildingName ?? "Building"}
                              className="w-[24px] h-[24px] object-cover  "
                            />
                          </div>
                          <div>
                            <p className="text-[15px] text-[#222] font-[Bold] leading-[1.2]">
                              {building.buildingName ?? "—"}
                            </p>
                            <p className="text-[12px] text-[#707070] font-[Regular]">
                              {building.propertyType ?? "—"}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleSelectAllInBuilding(building)}
                          className="cursor-pointer h-[33px] px-[12px] rounded-full border border-[rgba(34,34,34,0.10)] text-[12px] font-[SemiBold] text-[#222] bg-white"
                        >
                          {allBuildingUnassignedPicked ? "Deselect building" : "Select all property"}
                        </button>
                      </div>

                      {building.layouts.map((layout) => {
                        const layoutUnassignedIds = layout.units
                          .filter((u) => canSelectUnitForAssignment(u.status, u.isAssigned))
                          .map((u) => String(u.unitId));
                        return renderLayoutCard(layout, {
                          layoutUnassignedIds,
                          layoutUnitCount: layout.units.length,
                        });
                      })}
                    </div>
                  );
                })}

              {layoutDetail && (
                <div className="mb-[14px] last:mb-0">
                  <div className="flex items-center justify-between gap-3 mb-[20px]">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        <img
                          src={buildingImage}
                          alt={layoutDetail.buildingName ?? ""}
                          className="w-[24px] h-[24px] object-cover  "
                        />
                      </div>
                      <div>
                        <p className="text-[15px] text-[#222] font-[Bold] leading-[1.2]">
                          {layoutDetail.buildingName}
                        </p>
                        <p className="text-[12px] text-[#707070] font-[Regular]">
                          {layoutDetail.propertyType}
                        </p>
                      </div>
                    </div>
                  </div>

                  {(() => {
                    const layoutUnassignedIds = (layoutDetail.unitGrid || [])
                      .filter((u) => canSelectUnitForAssignment(u.status, u.isAssigned))
                      .map((u) => String(u.unitId));
                    const syntheticLayout: AgencyBulkAssignLayout = {
                      layoutId: layoutId ?? "single",
                      layoutName: layoutDetail.layoutName,
                      beds: layoutDetail.beds,
                      areaSqft: layoutDetail.areaSqft,
                      totalUnits: layoutDetail.unitGrid?.length ?? 0,
                      selectedCount: 0,
                      units: (layoutDetail.unitGrid || []).map((u) => ({
                        unitId: u.unitId,
                        unitNumber: u.unitNumber,
                        isAssigned: u.isAssigned,
                        status: u.status,
                      })),
                    };
                    const allLayoutUnassignedPicked =
                      layoutUnassignedIds.length > 0 &&
                      layoutUnassignedIds.every((id) => selectedUnits.includes(id));

                    return (
                      <div className="rounded-[12px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[20px] mb-[25px] last:mb-0">
                        <div className="flex items-center justify-between gap-4 mb-[12px]">
                          <div>
                            <p className="text-[15px] text-[#222] font-[Medium]">
                              {layoutDetail.layoutName}
                            </p>
                            <p className="text-[12px] text-[#707070] font-[Regular]">
                              {layoutDetail.unitGrid?.length ?? 0} units
                            </p>
                          </div>
                          <div className="flex items-center gap-[8px]">
                            <p className="h-[21px] min-w-[36px] px-[8px] rounded-[5px] bg-[#F5F5F5] text-[12px] text-[#222] font-[SemiBold] inline-flex items-center justify-center">
                              {
                                (layoutDetail.unitGrid || []).filter((u) =>
                                  selectedUnits.includes(String(u.unitId)),
                                ).length
                              }
                              /{layoutDetail.unitGrid?.length ?? 0}
                            </p>
                            <button
                              type="button"
                              onClick={() => toggleSelectAllInLayout(syntheticLayout)}
                              className="cursor-pointer h-[33px] px-[12px] rounded-full border border-[rgba(34,34,34,0.10)] text-[12px] font-[SemiBold] text-[#222] bg-white"
                            >
                              {allLayoutUnassignedPicked ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-[8px]">
                          {(layoutDetail.unitGrid || []).map((u) =>
                            renderUnitButton(u.unitId, u.unitNumber, u.isAssigned, u.status),
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              )}

              {!bulkData && !layoutDetail && !loading && (
                <p className="text-[14px] text-[#707070] text-center py-8">
                  No unit data for this project.
                </p>
              )}
            </div>
          </div>

          <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] h-fit">
            <h2 className="text-[#222] text-[20px] leading-[1.1] font-[Bold] mb-[18px]">Select agents</h2>

            <div className="flex flex-col gap-[12px] mb-[24px]">
              <div
                className="w-full rounded-full border border-[#222] bg-white p-[12px_15px] flex items-center gap-[12px]"
                role="status"
              >
                <img
                  src={toAgentProfileUrl(navCtx?.selectedAgentProfilePicture)}
                  alt=""
                  className="h-[30px] w-[30px] rounded-full object-cover shrink-0"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = mainbg;
                  }}
                />
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-[#222] text-[12px] leading-[1.2] font-[Bold] truncate">
                    {agentDisplayName}
                  </p>
                  <p className="text-[#707070] text-[12px] font-[Regular] capitalize truncate">
                    {agentDisplayType}
                  </p>
                </div>
                <TickIcon width={12} height={9} fill="#222" />
              </div>
            </div>

            <div className="border-t border-[rgba(34,34,34,0.06)] pt-[18px]">
              <div className="rounded-[12px] bg-[#F5F5F5] md:p-[20px] p-[15px] mb-[25px]">
                <h3 className="text-[15px] text-[#222] font-[Bold] mb-[10px]">Assignment summary</h3>
                <div className="flex items-center justify-between text-[14px]">
                  <span className="text-[#707070] font-[Regular]">Assigned units</span>
                  <span className="text-[#222] font-[Bold]">{selectedUnits.length}</span>
                </div>
              </div>


            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectReviewAssign;
