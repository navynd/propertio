import { TickIcon } from "../../../../assets/icons";
import type { AmenityMasterItem } from "../../../../types/api";

type PropertyAmenitiesSectionProps = {
  amenities: AmenityMasterItem[];
  selectedAmenityIds: string[];
  onToggleAmenity: (amenityId: string) => void;
  loading?: boolean;
};

const PropertyAmenitiesSection = ({
  amenities,
  selectedAmenityIds,
  onToggleAmenity,
  loading = false,
}: PropertyAmenitiesSectionProps) => (
  <div className="bg-white rounded-[12px] p-[20px] border border-[#EAEAEA]">
    <h3 className="text-[18px] font-[Bold] text-[#222] mb-[20px]">Amenities</h3>
    {loading ? (
      <p className="text-[13px] text-[#707070]">Loading amenities…</p>
    ) : amenities.length === 0 ? (
      <p className="text-[13px] text-[#707070]">No amenities available</p>
    ) : (
      <div className="flex flex-wrap gap-[8px]">
        {amenities.map((amenity) => {
          const id = String(amenity._id);
          const isActive = selectedAmenityIds.includes(id);
          return (
            <button
              key={id}
              type="button"
              onClick={() => onToggleAmenity(id)}
              className={`min-w-[180px] h-[39px] rounded-full px-[14px] border text-[13px] font-[Regular] inline-flex items-center gap-[6px] cursor-pointer ${
                isActive
                  ? "bg-[#222] text-white border-[#222]"
                  : "bg-white text-[#222] border-[rgba(34,34,34,0.10)]"
              }`}
            >
              <span
                className={`h-[15px] w-[15px] rounded-full border flex items-center justify-center ${
                  isActive
                    ? "bg-[#EA3934] border-[#EA3934]"
                    : "bg-white border-[rgba(34,34,34,0.20)]"
                }`}
              >
                {isActive && <TickIcon width={8} height={7} fill="#fff" />}
              </span>
              {amenity.name || "—"}
            </button>
          );
        })}
      </div>
    )}
  </div>
);

export default PropertyAmenitiesSection;
