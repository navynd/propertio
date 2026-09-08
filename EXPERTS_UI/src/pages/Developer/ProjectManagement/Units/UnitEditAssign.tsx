import DeveloperHeader from "../../../../components/Header/DeveloperHeader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { TickIcon } from "../../../../components/CustomFile/icons";
import { useEffect, useMemo, useState } from "react";
import buildingImage from "../../../../assets/img/building.svg";
import { developerService } from "../../../../services/developerService";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";

type UnitStatus = "Assigned" | "Unassigned";
type UnitLabel = { id: string; name: string; status: UnitStatus; isClosed?: boolean };
type Layout = { id: string; name: string; specs: string; unitCount: number; unitLabels: UnitLabel[] };
type Tower = { id: string; name: string; buildingType: string; layout: Layout[]; buildingImg: string };
type AgencyOption = { id: string; name: string };

const UnitEditAssign = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || "";
  const layoutId = searchParams.get("layoutId") || "";
  const allocationId = searchParams.get("allocationId") || "";
  const isAllocationEditMode = Boolean(projectId && layoutId && allocationId);

  const [agencyUnitMap, setAgencyUnitMap] = useState<Record<string, string[]>>({});
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([]);
  const [agencyOptions, setAgencyOptions] = useState<AgencyOption[]>([]);
  const [groups, setGroups] = useState<Tower[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [activeAgencyId, setActiveAgencyId] = useState<string>("");
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (isAllocationEditMode) {
      setHasHydratedSelection(true);
      return;
    }
    const raw = sessionStorage.getItem("developer.unitsAssignSelection");
    if (!raw) {
      setHasHydratedSelection(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        projectId?: string;
        layoutId?: string;
        selectedUnits?: string[];
        selectedAgencyIds?: string[];
        perAgencyUnitIds?: Record<string, string[]>;
      };
      const sameProject = String(parsed.projectId || "") === projectId;
      const sameLayout = String(parsed.layoutId || "") === layoutId;
      if (sameProject && sameLayout) {
        const units = Array.isArray(parsed.selectedUnits) ? parsed.selectedUnits.map(String) : [];
        const agencies = Array.isArray(parsed.selectedAgencyIds) ? parsed.selectedAgencyIds.map(String) : [];
        setSelectedAgencyIds(agencies);
        if (parsed.perAgencyUnitIds && typeof parsed.perAgencyUnitIds === "object") {
          const seeded: Record<string, string[]> = {};
          agencies.forEach((agencyId) => {
            seeded[agencyId] = Array.isArray(parsed.perAgencyUnitIds?.[agencyId])
              ? parsed.perAgencyUnitIds[agencyId].map(String)
              : [...units];
          });
          setAgencyUnitMap(seeded);
        } else {
          const seeded: Record<string, string[]> = {};
          agencies.forEach((agencyId) => {
            seeded[agencyId] = [...units];
          });
          setAgencyUnitMap(seeded);
        }
        if (agencies[0]) setActiveAgencyId(agencies[0]);
      }
    } catch {
      // ignore malformed selection
    } finally {
      setHasHydratedSelection(true);
    }
  }, [isAllocationEditMode, layoutId, projectId]);

  useEffect(() => {
    let mounted = true;
    developerService
      .getAgencies()
      .then((res) => {
        if (!mounted) return;
        setAgencyOptions((res.agencies || []).map((a) => ({ id: String(a.id), name: String(a.name || "-") })));
      })
      .catch(() => undefined);
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    setIsLoading(true);

    const load = layoutId
      ? developerService.getProjectUnitDetail({ projectId, layoutId, allocationId: allocationId || undefined, page: 1, limit: 100 })
      : developerService.getProjectUnits({ projectId, bulk: true, page: 1, limit: 100 });

    load
      .then((res: unknown) => {
        if (!mounted) return;
        if (layoutId) {
          const detail = res as {
            layout: {
              _id: string;
              layoutName: string;
              building: { id: string; name: string } | null;
              propertyType: { name: string } | null;
              areaSqft: number;
              bedrooms: number;
              totalUnits: number;
            };
            agencies?: Array<{ allocationId?: string; agency?: { _id?: string } | null; units?: Array<{ _id: string }> }>;
            unitStatus: { units: Array<{ _id: string; unitId?: string; unitNumber?: string; isAssigned: boolean; status?: string; assignedAgencies?: Array<{ id?: string }> }> };
          };
          const matchedAllocation = (detail.agencies || []).find((a) => String(a.allocationId || "") === allocationId);
          const currentAgencyId = String(matchedAllocation?.agency?._id || "");
          const preselectedUnitIds = (matchedAllocation?.units || []).map((u) => String(u._id));
          if (currentAgencyId) {
            setSelectedAgencyIds([currentAgencyId]);
            setActiveAgencyId(currentAgencyId);
            setAgencyUnitMap({ [currentAgencyId]: preselectedUnitIds });
          }
          setGroups([
            {
              id: detail.layout?.building?.id || "no-building",
              name: detail.layout?.building?.name || "No building",
              buildingType: detail.layout?.propertyType?.name || "Property",
              buildingImg: buildingImage,
              layout: [
                {
                  id: detail.layout?._id || layoutId,
                  name: detail.layout?.layoutName || "-",
                  specs: `${detail.layout?.areaSqft || "-"} sqft • ${detail.layout?.bedrooms ?? "-"} Bedrooms • ${detail.layout?.totalUnits || 0} units`,
                  unitCount: Number(detail.layout?.totalUnits || 0),
                  unitLabels: (detail.unitStatus?.units || []).map((u) => ({
                    id: String(u._id),
                    name: u.unitNumber ? `Unit-${u.unitNumber}` : u.unitId || "Unit",
                    status: "Unassigned",
                    isClosed: String(u.status || "").toLowerCase() === "closed",
                  })),
                },
              ],
            },
          ]);
          return;
        }

        const bulk = res as {
          layouts?: Array<{
            layoutId: string;
            layoutName: string;
            building: { id: string; name: string } | null;
            propertyType: { name: string } | null;
            areaSqft: number;
            bedrooms: number;
            totalUnits: number;
            units?: Array<{ _id: string; unitId?: string; unitNumber?: string; isAssigned?: boolean; status?: string }>;
          }>;
        };
        const grouped: Record<string, Tower> = {};
        (bulk.layouts || []).forEach((layoutItem) => {
          const gid = layoutItem.building?.id || "no-building";
          if (!grouped[gid]) {
            grouped[gid] = {
              id: gid,
              name: layoutItem.building?.name || "No building",
              buildingType: layoutItem.propertyType?.name || "Property",
              buildingImg: buildingImage,
              layout: [],
            };
          }
          grouped[gid].layout.push({
            id: layoutItem.layoutId,
            name: layoutItem.layoutName || "-",
            specs: `${layoutItem.areaSqft || "-"} sqft • ${layoutItem.bedrooms ?? "-"} Bedrooms • ${layoutItem.totalUnits || 0} units`,
            unitCount: Number(layoutItem.totalUnits || 0),
            unitLabels: (layoutItem.units || []).map((u) => ({
              id: String(u._id),
              name: u.unitNumber ? `Unit-${u.unitNumber}` : u.unitId || "Unit",
              status: u.isAssigned ? "Assigned" : "Unassigned",
              isClosed: String(u.status || "").toLowerCase() === "closed",
            })),
          });
        });
        setGroups(Object.values(grouped));
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        toast.error("Failed to load units", (error as { message?: string })?.message || "Could not fetch units.");
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [allocationId, layoutId, projectId]);

  const selectedAgencyItems = useMemo(
    () => selectedAgencyIds.map((id) => agencyOptions.find((a) => a.id === id)).filter(Boolean) as AgencyOption[],
    [agencyOptions, selectedAgencyIds]
  );

  const activeAgencyUnitIds = useMemo(() => agencyUnitMap[activeAgencyId] || [], [activeAgencyId, agencyUnitMap]);
  const selectedUnitSet = useMemo(() => new Set(activeAgencyUnitIds), [activeAgencyUnitIds]);

  const allUnits = useMemo(
    () =>
      groups.flatMap((tower) =>
        tower.layout.flatMap((layout) =>
          layout.unitLabels.map((unit) => ({
            ...unit,
            towerId: tower.id,
            layoutId: layout.id,
          }))
        )
      ),
    [groups]
  );

  const allSelectedIds = useMemo(
    () => allUnits.filter((unit) => unit.status === "Unassigned" && !unit.isClosed).map((unit) => unit.id),
    [allUnits]
  );

  const visibleSelectedCountForAgency = useMemo(() => {
    // Multi-assign semantics: same selected units apply for every selected agency.
    return activeAgencyUnitIds.length;
  }, [activeAgencyUnitIds.length]);

  useEffect(() => {
    if (!hasHydratedSelection) return;
    if (selectedAgencyIds.length === 0) return;
    const allSelectedUnion = new Set<string>();
    Object.values(agencyUnitMap).forEach((unitIds) => unitIds.forEach((id) => allSelectedUnion.add(id)));
    const payload = {
      projectId,
      layoutId,
      selectedUnits: [...allSelectedUnion],
      selectedAgencyIds,
      perAgencyUnitIds: agencyUnitMap,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem("developer.unitsAssignSelection", JSON.stringify(payload));
  }, [agencyUnitMap, hasHydratedSelection, layoutId, projectId, selectedAgencyIds]);

  const toggleUnit = (unitId: string, status: UnitStatus, isClosed?: boolean) => {
    if (status === "Assigned" || isClosed) return;
    if (!activeAgencyId) return;
    setAgencyUnitMap((prev) => {
      const current = prev[activeAgencyId] || [];
      const next = current.includes(unitId) ? current.filter((id) => id !== unitId) : [...current, unitId];
      return { ...prev, [activeAgencyId]: next };
    });
  };

  const toggleSelectAll = () => {
    if (!activeAgencyId) return;
    setAgencyUnitMap((prev) => {
      const current = prev[activeAgencyId] || [];
      const next = current.length === allSelectedIds.length ? [] : allSelectedIds;
      return { ...prev, [activeAgencyId]: next };
    });
  };

  const toggleSelectAllInLayout = (layout: Layout) => {
    if (!activeAgencyId) return;
    const layoutSelectableIds = layout.unitLabels.filter((unit) => unit.status === "Unassigned" && !unit.isClosed).map((unit) => unit.id);
    const areAllSelected = layoutSelectableIds.every((id) => selectedUnitSet.has(id));
    setAgencyUnitMap((prev) => {
      const current = prev[activeAgencyId] || [];
      const next = areAllSelected
        ? current.filter((id) => !layoutSelectableIds.includes(id))
        : [...new Set([...current, ...layoutSelectableIds])];
      return { ...prev, [activeAgencyId]: next };
    });
  };

  const handleUpdateAssignment = async () => {
    const agencyId = activeAgencyId || selectedAgencyIds[0] || "";
    if (!projectId || !allocationId || !agencyId) {
      toast.error("Missing assignment data", "Project, allocation, and agency are required.");
      return;
    }
    const selectedIds = agencyUnitMap[agencyId] || [];
    setIsSaving(true);
    try {
      await developerService.updateAssignedAgencyUnits({
        projectId,
        allocationId,
        unitIds: selectedIds,
      });
      toast.success("Assignment updated successfully");
      navigate(-1);
    } catch (error: unknown) {
      toast.error("Failed to update assignment", (error as { message?: string })?.message || "Could not update assigned units.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <div>
        <DeveloperHeader title="Edit Assignment" showBack={true} onBackClick={() => navigate(-1)} />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-[20px] mb-[60px]">
        <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] p-[20px]">
          <div className="flex items-center justify-between gap-3 mb-[6px]">
            <h2 className="text-[#222] text-[20px] leading-[1.2] font-[Bold]">Select units to assign</h2>
            <button
              type="button"
              onClick={toggleSelectAll}
              className="cursor-pointer flex items-center justify-center h-[33px] px-[14px] rounded-full border border-[rgba(34,34,34,0.10)] text-[12px] font-[SemiBold] text-[#222]"
            >
              {activeAgencyUnitIds.length === allSelectedIds.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <p className="text-[12px] font-[SemiBold] text-[#707070] mb-[8px]">
            <span className="text-[#222]">{activeAgencyUnitIds.length}</span> units selected
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

          {isLoading ? (
            <div className="rounded-[15px] bg-[#F5F5F5] p-[20px] flex items-center justify-center min-h-[120px]">
              <Loader size={56} margin={0} />
            </div>
          ) : (
            <div className="rounded-[15px] bg-[#F5F5F5] md:p-[20px] p-[15px]">
              {groups.map((tower) => (
                <div key={tower.id} className="mb-[14px] last:mb-0">
                  <div className="flex items-center justify-between gap-3 mb-[20px]">
                    <div className="flex items-center gap-3">
                      <div className="shrink-0">
                        <img src={tower.buildingImg} alt={tower.name} className="w-[24px] h-[24px] object-cover" />
                      </div>
                      <div>
                        <p className="text-[15px] text-[#222] font-[Bold] leading-[1.2]">{tower.name}</p>
                        <p className="text-[12px] text-[#707070] font-[Regular]">{tower.buildingType}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="cursor-pointer h-[33px] px-[12px] rounded-full border border-[rgba(34,34,34,0.10)] text-[12px] font-[SemiBold] text-[#222] bg-white"
                    >
                      Select all property
                    </button>
                  </div>

                  {tower.layout.map((layout) => {
                    const selectedInLayout = layout.unitLabels.filter((unit) => selectedUnitSet.has(unit.id)).length;
                    const layoutSelectableIds = layout.unitLabels.filter((unit) => unit.status === "Unassigned" && !unit.isClosed).map((unit) => unit.id);
                    const isAllLayoutSelected = layoutSelectableIds.every((id) => selectedUnitSet.has(id));
                    return (
                      <div key={layout.id} className="rounded-[12px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[20px] mb-[25px] last:mb-0">
                        <div className="flex items-center justify-between gap-4 mb-[12px]">
                          <div>
                            <p className="text-[15px] text-[#222] font-[Medium]">{layout.name}</p>
                            <p className="text-[12px] text-[#707070] font-[Regular]">{layout.specs}</p>
                          </div>
                          <div className="flex items-center gap-[8px]">
                            <p className="h-[21px] min-w-[36px] px-[8px] rounded-[5px] bg-[#F5F5F5] text-[12px] text-[#222] font-[SemiBold] inline-flex items-center justify-center">
                              {selectedInLayout}/{layout.unitCount}
                            </p>
                            <button
                              type="button"
                              onClick={() => toggleSelectAllInLayout(layout)}
                              className="cursor-pointer h-[33px] px-[12px] rounded-full border border-[rgba(34,34,34,0.10)] text-[12px] font-[SemiBold] text-[#222] bg-white"
                            >
                              {isAllLayoutSelected ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-[8px]">
                          {layout.unitLabels.map((unit) => {
                            const isSelected = selectedUnitSet.has(unit.id);
                            const isAssigned = unit.status === "Assigned";
                            const isClosed = unit.isClosed;
                            return (
                              <button
                                key={unit.id}
                                type="button"
                                disabled={isClosed}
                                onClick={() => toggleUnit(unit.id, unit.status, isClosed)}
                                className={`rounded-[10px] p-[15px_20px] flex flex-col gap-[9px] items-center justify-between text-[12px] font-[Bold] border border-[rgba(34,34,34,0.10)] leading-[1.2] transition-colors ${
                                  isSelected
                                    ? "cursor-pointer bg-[#222] text-white border-[#222] border border-[rgba(34,34,34,0.10)]"
                                    : isClosed
                                      ? "cursor-not-allowed bg-[#FFECEC] text-[#D4A373] border-[#F7C5C5]"
                                    : isAssigned
                                      ? "cursor-not-allowed bg-[rgba(8,50,174,0.10)] text-[#222] border-none"
                                      : "cursor-pointer bg-white text-[#222] border-[rgba(34,34,34,0.10)]"
                                }`}
                              >
                                <span
                                  className={`h-[15px] w-[15px] rounded-full border flex items-center justify-center text-[9px] leading-none ${
                                    isSelected
                                      ? "bg-[#D4A373] border-[#D4A373] text-white"
                                      : isAssigned
                                        ? "bg-[#DCE3F5] border-[#C4CEE9] text-transparent"
                                        : "bg-white border-[rgba(34,34,34,0.12)] text-transparent"
                                  }`}
                                >
                                  {isSelected && <TickIcon width={8} height={6} />}
                                </span>
                                <span>{unit.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] h-fit">
          <h2 className="text-[#222] text-[20px] leading-[1.1] font-[Bold] mb-[18px]">Select Agencies</h2>
          {selectedAgencyItems.length === 0 ? (
            <div className="rounded-[10px] bg-[#F5F5F5] p-[12px] text-[12px] text-[#707070] mb-[14px]">
              No agencies selected. Go back and choose agencies in the previous step.
            </div>
          ) : null}
          <div className="flex flex-col gap-[10px] mb-[24px]">
            {selectedAgencyItems.map((agency) => {
              const isActive = activeAgencyId === agency.id;
              return (
                <button
                  key={agency.id}
                  type="button"
                  onClick={() => setActiveAgencyId(agency.id)}
                  className={`h-[44px] w-full rounded-full border px-[14px] text-[14px] font-[Medium] flex items-center justify-between transition-colors ${
                    isActive ? "border-[#222] bg-white text-[#222]" : "border-[rgba(34,34,34,0.10)] text-[#222]"
                  }`}
                >
                  <span>{agency.name}</span>
                  {isActive ? <TickIcon width={10} height={7} fill="#222" /> : <span />}
                </button>
              );
            })}
          </div>

          <div className="border-t border-[rgba(34,34,34,0.06)] pt-[18px]">
            <div className="rounded-[12px] bg-[#F5F5F5] md:p-[20px] p-[15px] mb-[14px]">
              <h3 className="text-[15px] text-[#222] font-[Bold] mb-[10px]">Assignment summary</h3>
              <div className="flex items-center justify-between text-[14px] mb-[6px]">
                <span className="text-[#707070] font-[Regular]">Units Selected:</span>
                <span className="text-[#222] font-[Bold]">{visibleSelectedCountForAgency}</span>
              </div>
              <div className="flex items-center justify-between text-[14px] mb-[6px]">
                <span className="text-[#707070] font-[Regular]">Agencies Selected:</span>
                <span className="text-[#222] font-[Bold]">{selectedAgencyItems.length}</span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-[#707070] font-[Regular]">Viewing Agency:</span>
                <span className="text-[#222] font-[Bold]">
                  {selectedAgencyItems.find((a) => a.id === activeAgencyId)?.name || "-"}
                </span>
              </div>
            </div>
            {/* <button
              type="button"
              onClick={handleUpdateAssignment}
              disabled={isSaving || !isAllocationEditMode}
              className="w-full h-[44px] rounded-[10px] bg-[#0832AE] text-white text-[14px] font-[Bold] cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? "Updating..." : "Update assignment"}
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitEditAssign;
