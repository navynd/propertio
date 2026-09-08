import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import DeveloperHeader from "../../../../components/Header/DeveloperHeader";
import { CancelIcon, DownArrowIcon, TickIcon } from "../../../../components/CustomFile/icons";
import buildingImage from "../../../../assets/img/building.svg";
import { developerService } from "../../../../services/developerService";
import { toast } from "../../../../services/toast";
import Loader from "../../../../components/Loader/loader";

type UnitStatus = "Assigned" | "Unassigned";
type UnitLabel = { id: string; name: string; status: UnitStatus; isClosed?: boolean };
type Layout = { id: string; name: string; specs: string; unitCount: number; unitLabels: UnitLabel[] };
type Tower = { id: string; name: string; buildingType: string; layout: Layout[]; buildingImg: string };
type AgencyOption = { id: string; name: string };

const UnitAssign = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("projectId") || "";
  const layoutId = searchParams.get("layoutId") || "";
  const [isAgencyDropdownOpen, setIsAgencyDropdownOpen] = useState(false);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedAgencyIds, setSelectedAgencyIds] = useState<string[]>([]);
  const [groups, setGroups] = useState<Tower[]>([]);
  const [agencyOptions, setAgencyOptions] = useState<AgencyOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    developerService.getAgencies().then((res) => {
      if (!mounted) return;
      setAgencyOptions((res.agencies || []).map((a) => ({ id: String(a.id), name: String(a.name || "-") })));
    }).catch(() => undefined);
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!projectId) return;
    let mounted = true;
    setIsLoading(true);

    const load = layoutId
      ? developerService.getProjectUnitDetail({ projectId, layoutId, page: 1, limit: 100 })
      : developerService.getProjectUnits({ projectId, bulk: true, page: 1, limit: 100 });

    load
      .then((res: unknown) => {
        if (!mounted) return;
        if (layoutId) {
          const detail = res as { layout: { _id: string; layoutName: string; building: { id: string; name: string } | null; propertyType: { name: string } | null; areaSqft: number; bedrooms: number; totalUnits: number; }; unitStatus: { units: Array<{ _id: string; unitId?: string; unitNumber?: string; isAssigned: boolean; status?: string; }>; }; };
          setGroups([{
            id: detail.layout?.building?.id || "no-building",
            name: detail.layout?.building?.name || "No building",
            buildingType: detail.layout?.propertyType?.name || "Property",
            buildingImg: buildingImage,
            layout: [{
              id: detail.layout?._id || layoutId,
              name: detail.layout?.layoutName || "-",
              specs: `${detail.layout?.areaSqft || "-"} sqft • ${detail.layout?.bedrooms ?? "-"} Bedrooms • ${detail.layout?.totalUnits || 0} units`,
              unitCount: Number(detail.layout?.totalUnits || 0),
              unitLabels: (detail.unitStatus?.units || []).map((u) => ({
                id: String(u._id),
                name: u.unitNumber ? `Unit-${u.unitNumber}` : u.unitId || "Unit",
                status: u.isAssigned ? "Assigned" : "Unassigned",
                isClosed: String(u.status || "").toLowerCase() === "closed",
              })),
            }],
          }]);
          return;
        }

        const bulk = res as { layouts?: Array<{ layoutId: string; layoutName: string; building: { id: string; name: string } | null; propertyType: { name: string } | null; areaSqft: number; bedrooms: number; totalUnits: number; units?: Array<{ _id: string; unitId?: string; unitNumber?: string; isAssigned?: boolean; status?: string }>; }>; };
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

    return () => { mounted = false; };
  }, [layoutId, projectId]);

  const allUnits = useMemo(
    () => groups.flatMap((tower) => tower.layout.flatMap((layout) => layout.unitLabels.map((u) => ({ ...u, layoutId: layout.id })))),
    [groups]
  );
  const allUnitIds = useMemo(() => allUnits.map((u) => u.id), [allUnits]);
  const selectedAgencyItems = useMemo(
    () => selectedAgencyIds.map((id) => agencyOptions.find((a) => a.id === id)).filter(Boolean) as AgencyOption[],
    [agencyOptions, selectedAgencyIds]
  );

  useEffect(() => {
    const payload = {
      projectId,
      layoutId,
      selectedUnits,
      selectedAgencyIds,
      updatedAt: Date.now(),
    };
    sessionStorage.setItem("developer.unitsAssignSelection", JSON.stringify(payload));
  }, [layoutId, projectId, selectedAgencyIds, selectedUnits]);

  const toggleUnit = (unitId: string) => {
    setSelectedUnits((prev) => (prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]));
  };
  const toggleSelectAll = () => {
    const selectableIds = allUnits.filter((u) => !u.isClosed).map((u) => u.id);
    setSelectedUnits((prev) => (prev.length === selectableIds.length ? [] : selectableIds));
  };
  const toggleSelectAllInLayout = (layout: Layout) => {
    const ids = layout.unitLabels.filter((u) => !u.isClosed).map((u) => u.id);
    const allSelected = ids.every((id) => selectedUnits.includes(id));
    setSelectedUnits((prev) => (allSelected ? prev.filter((id) => !ids.includes(id)) : [...new Set([...prev, ...ids])]));
  };
  const addAgency = (id: string) => {
    setSelectedAgencyIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setIsAgencyDropdownOpen(false);
  };
  const removeAgency = (id: string) => setSelectedAgencyIds((prev) => prev.filter((x) => x !== id));

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <div><DeveloperHeader title="Assign agencies" showBack={true} onBackClick={() => navigate(-1)} /></div>
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_330px] gap-[20px] mb-[60px]">
        <div className="rounded-[15px] bg-white border border-[rgba(34,34,34,0.06)] p-[20px]">
          <div className="flex items-center justify-between gap-3 mb-[6px]">
            <h2 className="text-[#222] text-[20px] leading-[1.2] font-[Bold]">Select units to assign</h2>
            <button type="button" onClick={toggleSelectAll} className="cursor-pointer flex items-center justify-center h-[33px] px-[14px] rounded-full border border-[rgba(34,34,34,0.10)] text-[12px] font-[SemiBold] text-[#222]">
              {selectedUnits.length === allUnitIds.length ? "Deselect all" : "Select all"}
            </button>
          </div>
          <p className="text-[12px] font-[SemiBold] text-[#707070] mb-[8px]"><span className="text-[#222]">{selectedUnits.length}</span> units selected</p>
          {isLoading ? (
            <div className="rounded-[15px] bg-[#F5F5F5] p-[20px] flex items-center justify-center min-h-[120px]">
              <Loader size={56} margin={0} />
            </div>
          ) : (
            <div className="rounded-[15px] bg-[#F5F5F5] md:p-[20px] p-[15px]">
              {groups.map((tower) => (
                <div key={tower.id} className="mb-[14px] last:mb-0">
                  <div className="flex items-center gap-3 mb-[20px]">
                    <img src={tower.buildingImg} alt={tower.name} className="w-[24px] h-[24px] object-cover" />
                    <div>
                      <p className="text-[15px] text-[#222] font-[Bold] leading-[1.2]">{tower.name}</p>
                      <p className="text-[12px] text-[#707070] font-[Regular]">{tower.buildingType}</p>
                    </div>
                  </div>
                  {tower.layout.map((layout) => {
                    const selectedInLayout = layout.unitLabels.filter((u) => selectedUnits.includes(u.id)).length;
                    const ids = layout.unitLabels.filter((u) => !u.isClosed).map((u) => u.id);
                    const isAllLayoutUnitsSelected = ids.every((id) => selectedUnits.includes(id));
                    return (
                      <div key={layout.id} className="rounded-[12px] bg-white border border-[rgba(34,34,34,0.06)] md:p-[30px] p-[20px] mb-[25px] last:mb-0">
                        <div className="flex items-center justify-between gap-4 mb-[12px]">
                          <div><p className="text-[15px] text-[#222] font-[Medium]">{layout.name}</p><p className="text-[12px] text-[#707070] font-[Regular]">{layout.specs}</p></div>
                          <div className="flex items-center gap-[8px]">
                            <p className="h-[21px] min-w-[36px] px-[8px] rounded-[5px] bg-[#F5F5F5] text-[12px] text-[#222] font-[SemiBold] inline-flex items-center justify-center">{selectedInLayout}/{layout.unitCount}</p>
                            <button type="button" onClick={() => toggleSelectAllInLayout(layout)} className="cursor-pointer h-[33px] px-[12px] rounded-full border border-[rgba(34,34,34,0.10)] text-[12px] font-[SemiBold] text-[#222] bg-white">{isAllLayoutUnitsSelected ? "Deselect all" : "Select all"}</button>
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
                                onClick={() => {
                                  if (isClosed) return;
                                  toggleUnit(unit.id);
                                }}
                                className={`rounded-[10px] p-[12px_20px] flex flex-col gap-[7px] items-center justify-between text-[12px] font-[Bold] border border-[rgba(34,34,34,0.10)] leading-[1.2] transition-colors ${isSelected ? "cursor-pointer bg-[#222] text-white border-[#222]" : isClosed ? "cursor-not-allowed bg-[#FFECEC] text-[#EA3934] border-[#F7C5C5]" : isAssigned ? "cursor-pointer bg-[rgba(8,50,174,0.10)] text-[#222] border-none" : "cursor-pointer bg-white text-[#222]"}`}
                              >
                                <span className={`h-[15px] w-[15px] rounded-full border flex items-center justify-center text-[9px] leading-none ${isSelected ? "bg-[#EA3934] border-[#EA3934] text-white" : isAssigned ? "bg-[#DCE3F5] border-[#C4CEE9] text-transparent" : "bg-white border-[rgba(34,34,34,0.12)] text-transparent"}`}>{isSelected && <TickIcon width={8} height={6} fill="#FFF" />}</span>
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
            <label className="text-[#222] text-[14px] font-[SemiBold] mb-[8px] block">Agencies <span className="text-[#EA3934]">*</span></label>
            <button type="button" onClick={() => setIsAgencyDropdownOpen((prev) => !prev)} className="w-full h-[44px] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] text-left text-[14px] font-[Regular] text-[#707070] flex items-center justify-between cursor-pointer">
              Select authorized agencies
              <DownArrowIcon width={11} height={7} className={`transition-transform ${isAgencyDropdownOpen ? "rotate-180" : ""}`} />
            </button>
            {isAgencyDropdownOpen && (
              <div className="absolute left-0 top-[78px] z-30 w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white shadow-[0_8px_20px_rgba(0,0,0,0.08)] py-[6px] max-h-[220px] overflow-y-auto">
                {agencyOptions.map((agency) => {
                  const isSelected = selectedAgencyIds.includes(agency.id);
                  return (
                    <button key={agency.id} type="button" onClick={() => addAgency(agency.id)} className={`w-full text-left px-[14px] py-[9px] text-[12px] font-[SemiBold] transition-colors ${isSelected ? "bg-[#F5F7FF] text-[#0832AE]" : "text-[#222] hover:bg-[#F5F5F5]"}`}>
                      {agency.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
          {selectedAgencyItems.length > 0 && (
            <>
              <div className="flex flex-wrap gap-[8px] mb-[18px]">
                {selectedAgencyItems.map((agency) => (
                  <span key={agency.id} className="inline-flex items-center gap-[6px] h-[21px] rounded-[5px] bg-[#222] text-white px-[8px] text-[12px] font-[SemiBold]">
                    {agency.name}
                    <button type="button" onClick={() => removeAgency(agency.id)} className="cursor-pointer text-white/90 leading-none" aria-label={`Remove ${agency.name}`}>
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
              <div className="flex items-center justify-between text-[14px] mb-[6px]"><span className="text-[#707070] font-[Regular]">Units Selected:</span><span className="text-[#222] font-[Bold]">{selectedUnits.length}</span></div>
              <div className="flex items-center justify-between text-[14px]"><span className="text-[#707070] font-[Regular]">Agencies Selected:</span><span className="text-[#222] font-[Bold]">{selectedAgencyItems.length}</span></div>
            </div>
            {/* <button type="button" className="w-full h-[44px] rounded-[10px] bg-[#0832AE] text-white text-[14px] font-[Bold] cursor-pointer">Assign units</button> */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default UnitAssign;
