import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DeveloperHeader from "../../../../components/Header/DeveloperHeader";
import { CancelIcon, DownArrowIcon, TickIcon } from "../../../../components/CustomFile/icons";
import buildingImage from "../../../../assets/img/building.svg";
import { developerService } from "../../../../services/developerService";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";

type UnitStatus = "Assigned" | "Unassigned";

type UnitLabel = {
  id: string;
  name: string;
  status: UnitStatus;
  isClosed?: boolean;
};

type Layout = {
  id: string;
  name: string;
  specs: string;
  unitCount: number;
  unitLabels: UnitLabel[];
};

type Tower = {
  id: string;
  name: string;
  buildingType: string;
  buildingImg: string;
  layout: Layout[];
};

type AgencyOption = {
  id: string;
  name: string;
};

const AssignAgencies = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || "";
  const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([]);
  const [agencyOptions, setAgencyOptions] = useState<AgencyOption[]>([]);
  const [bulkGroups, setBulkGroups] = useState<Tower[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasHydratedSelection, setHasHydratedSelection] = useState(false);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, []);

  useEffect(() => {
    const raw = sessionStorage.getItem("developer.bulkAssignSelection");
    if (!raw) {
      setHasHydratedSelection(true);
      return;
    }
    try {
      const parsed = JSON.parse(raw) as {
        projectId?: string;
        selectedUnits?: string[];
        selectedAgencyIds?: string[];
      };
      if (String(parsed.projectId || "") === projectId) {
        setSelectedUnits(Array.isArray(parsed.selectedUnits) ? parsed.selectedUnits.map(String) : []);
        setSelectedAgencyIds(Array.isArray(parsed.selectedAgencyIds) ? parsed.selectedAgencyIds.map(String) : []);
      }
    } catch {
      // ignore malformed state
    } finally {
      setHasHydratedSelection(true);
    }
  }, [projectId]);

  useEffect(() => {
    let mounted = true;
    developerService
      .getAgencies()
      .then((res) => {
        if (!mounted) return;
        setAgencyOptions((res.agencies || []).map((agency) => ({ id: String(agency.id), name: String(agency.name || "-") })));
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        toast.error(
          "Failed to load agencies",
          (error as { message?: string })?.message || "Could not fetch agency list."
        );
      });
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!projectId) return;

    let mounted = true;
    setIsLoading(true);
    developerService
      .getProjectUnits({
        projectId,
        bulk: true,
        page: 1,
        limit: 100,
      })
      .then((res) => {
        if (!mounted) return;
        const grouped: Record<string, Tower> = {};
        (res.layouts || []).forEach((layoutItem) => {
          const groupId = layoutItem.building?.id || "no-building";
          const groupName = layoutItem.building?.name || "No building";
          if (!grouped[groupId]) {
            grouped[groupId] = {
              id: groupId,
              name: groupName,
              buildingType: layoutItem.propertyType?.name || "Property",
              buildingImg: buildingImage,
              layout: [],
            };
          }
          grouped[groupId].layout.push({
            id: layoutItem.layoutId,
            name: layoutItem.layoutName || "-",
            specs: `${layoutItem.areaSqft || "-"} sqft • ${layoutItem.bedrooms ?? "-"} Bedrooms • ${layoutItem.totalUnits || 0} units`,
            unitCount: Number(layoutItem.totalUnits || 0),
            unitLabels: (layoutItem.units || []).map((unit) => ({
              id: String(unit._id),
              name: unit.unitNumber ? `Unit-${unit.unitNumber}` : unit.unitId || "Unit",
              status: unit.isAssigned ? "Assigned" : "Unassigned",
              isClosed: String(unit.status || "").toLowerCase() === "closed",
            })),
          });
        });
        setBulkGroups(Object.values(grouped));
      })
      .catch((error: unknown) => {
        if (!mounted) return;
        toast.error(
          "Failed to load units for assignment",
          (error as { message?: string })?.message || "Could not fetch bulk unit data."
        );
      })
      .finally(() => {
        if (!mounted) return;
        setIsLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [projectId]);

  const allUnits = useMemo(
    () =>
      bulkGroups.flatMap((tower) =>
        tower.layout.flatMap((layout) =>
          layout.unitLabels.map((unit) => ({
            ...unit,
            towerId: tower.id,
            layoutId: layout.id,
          }))
        )
      ),
    [bulkGroups]
  );

  const allUnitIds = useMemo(() => allUnits.filter((unit) => !unit.isClosed).map((unit) => unit.id), [allUnits]);

  const toggleUnit = (unitId: string, isClosed?: boolean) => {
    if (isClosed) return;
    setSelectedUnits((prev) => (prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]));
  };

  const toggleSelectAll = () => {
    setSelectedUnits((prev) => (prev.length === allUnitIds.length ? [] : allUnitIds));
  };

  const toggleSelectAllInLayout = (layout: Layout) => {
    const layoutUnitIds = layout.unitLabels.filter((unit) => !unit.isClosed).map((unit) => unit.id);
    const areAllSelected = layoutUnitIds.every((id) => selectedUnits.includes(id));
    setSelectedUnits((prev) =>
      areAllSelected ? prev.filter((id) => !layoutUnitIds.includes(id)) : [...new Set([...prev, ...layoutUnitIds])]
    );
  };

  const removeAgency = (agencyId: string) => {
    setSelectedAgencyIds((prev) => prev.filter((id) => id !== agencyId));
  };

  const addAgency = (agencyId: string) => {
    setSelectedAgencyIds((prev) => (prev.includes(agencyId) ? prev : [...prev, agencyId]));
    setIsAgencyDropdownOpen(false);
  };

  const selectedAgencyItems = useMemo(
    () => selectedAgencyIds.map((id) => agencyOptions.find((agency) => agency.id === id)).filter(Boolean) as AgencyOption[],
    [agencyOptions, selectedAgencyIds]
  );

  useEffect(() => {
    if (!hasHydratedSelection) return;
    const payload = {
      projectId,
      selectedUnits,
      selectedAgencyIds,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem("developer.bulkAssignSelection", JSON.stringify(payload));
  }, [hasHydratedSelection, projectId, selectedAgencyIds, selectedUnits]);

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <div>
        <DeveloperHeader title="Assign agencies" showBack={true} onBackClick={() => navigate(-1)} />
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
              {selectedUnits.length === allUnitIds.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <p className="text-[12px] font-[SemiBold] text-[#707070] mb-[8px] p-[2px_10px] rounded-[5px] border border-[rgba(34,34,34,0.10)] w-[120px]">
            <span className="text-[#222]">{selectedUnits.length}</span> units selected
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

          {!projectId ? (
            <div className="rounded-[15px] bg-[#F5F5F5] p-[20px] text-[13px] text-[#707070]">
              Missing `projectId` in URL. Open this page from a project details screen.
            </div>
          ) : isLoading ? (
            <div className="rounded-[15px] bg-[#F5F5F5] p-[20px] flex items-center justify-center min-h-[120px]">
              <Loader size={56} margin={0} />
            </div>
          ) : bulkGroups.length === 0 ? (
            <div className="rounded-[15px] bg-[#F5F5F5] p-[20px] text-[13px] text-[#707070]">No layouts found for this project.</div>
          ) : (
            <div className="rounded-[15px] bg-[#F5F5F5] md:p-[20px] p-[15px]">
              {bulkGroups.map((tower) => (
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
                  </div>

                  {tower.layout.map((layout) => {
                    const selectedInLayout = layout.unitLabels.filter((unit) => selectedUnits.includes(unit.id)).length;
                    const layoutUnitIds = layout.unitLabels.map((unit) => unit.id);
                    const isAllLayoutUnitsSelected = layoutUnitIds.every((id) => selectedUnits.includes(id));

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
                              {isAllLayoutUnitsSelected ? "Deselect all" : "Select all"}
                            </button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-[8px]">
                          {layout.unitLabels.map((unit) => {
                            const isSelected = selectedUnits.includes(unit.id);
                            const isAssigned = unit.status === "Assigned";
                            const isClosed = unit.isClosed;

                            return (
                              <button
                                key={unit.id}
                                type="button"
                                disabled={isClosed}
                                onClick={() => toggleUnit(unit.id, isClosed)}
                                className={`rounded-[10px] p-[15px_20px] flex flex-col gap-[9px] items-center justify-between text-[12px] font-[Bold] border border-[rgba(34,34,34,0.10)] leading-[1.2] transition-colors ${isSelected ? "cursor-pointer bg-[#222] text-white border-[#222] border border-[rgba(34,34,34,0.10)]" : isClosed ? "cursor-not-allowed bg-[#FFECEC] text-[#EA3934] border-[#F7C5C5]" : isAssigned ? "cursor-pointer bg-[rgba(8,50,174,0.10)] text-[#222] border-none" : "cursor-pointer bg-white text-[#222] border-[rgba(34,34,34,0.10)]"}`}
                              >
                                <span
                                  className={`h-[15px] w-[15px] rounded-full border flex items-center justify-center text-[9px] leading-none ${isSelected ? "bg-[#EA3934] border-[#EA3934] text-white" : isAssigned ? "bg-[#DCE3F5] border-[#C4CEE9] text-transparent" : "bg-white border-[rgba(34,34,34,0.12)] text-transparent"}`}
                                >
                                  {isSelected && <TickIcon width={8} height={6} fill="#FFF" />}
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
          <div className={`relative ${selectedAgencyItems.length > 0 ? "mb-[10px]" : "mb-[20px]"}`}>
            <label className="text-[#222] text-[14px] font-[SemiBold] mb-[8px] block">
              Agencies <span className="text-[#EA3934]">*</span>
            </label>
            <button
              type="button"
              onClick={() => setIsAgencyDropdownOpen((prev) => !prev)}
              className="w-full h-[44px] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] text-left text-[14px] font-[Regular]  text-[#707070] flex items-center justify-between"
            >
              Select authorized agencies
              <DownArrowIcon width={11} height={7} className={`transition-transform ${isAgencyDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isAgencyDropdownOpen && (
              <div className="absolute left-0 top-[78px] z-30 w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] py-[6px] max-h-[220px] overflow-y-auto">
                {agencyOptions.map((agency) => {
                  const isSelected = selectedAgencyIds.includes(agency.id);
                  return (
                    <button
                      key={agency.id}
                      type="button"
                      onClick={() => addAgency(agency.id)}
                      className={`w-full text-left px-[14px] py-[9px] text-[12px] font-[SemiBold] transition-colors ${isSelected ? "bg-[#F5F7FF] text-[#0832AE]" : "text-[#222] hover:bg-[#F5F5F5]"}`}
                    >
                      {agency.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {selectedAgencyItems.length > 0 && (
            <>
              <div className="flex flex-wrap gap-[8px] mb-[18px] min-h-[34px]">
                {selectedAgencyItems.map((agency) => (
                  <span key={agency.id} className="inline-flex items-center gap-[6px] h-[21px] rounded-[5px] bg-[#222] text-white px-[8px] text-[12px] font-[SemiBold]">
                    {agency.name}
                    <button
                      type="button"
                      onClick={() => removeAgency(agency.id)}
                      className="cursor-pointer text-white/90 leading-none"
                      aria-label={`Remove ${agency.name}`}
                    >
                      <CancelIcon width={6} height={6} stroke="#FFFFFF" />
                    </button>
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="border-t border-[rgba(34,34,34,0.06)] pt-[18px]">
            <div className="rounded-[12px] bg-[#F5F5F5] md:p-[20px] p-[15px]">
              <h3 className="text-[15px] text-[#222] font-[Bold] mb-[10px]">Assignment summary</h3>
              <div className="flex items-center justify-between text-[14px] mb-[6px]">
                <span className="text-[#707070] font-[Regular]">Units Selected:</span>
                <span className="text-[#222] font-[Bold]">{selectedUnits.length}</span>
              </div>
              <div className="flex items-center justify-between text-[14px]">
                <span className="text-[#707070] font-[Regular]">Agencies Selected:</span>
                <span className="text-[#222] font-[Bold]">{selectedAgencyItems.length}</span>
              </div>
            </div>

            {/* <button type="button" className="w-full h-[44px] rounded-[10px] bg-[#0832AE] text-white text-[14px] font-[Bold] cursor-pointer">
              Assign units
            </button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssignAgencies;
