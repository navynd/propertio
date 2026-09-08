import {
  EditIcon,
  MultiUserIcon,
  TrashIcon,
  UnitsIcon,
} from "../../../components/CustomFile/icons";
import AgencyHeader from "../../../components/Header/AgencyHeader";
import { useNavigate, useParams } from "react-router-dom";
import ListingHeader from "./ListingComponents/ListingHeader";
import ListingCommon from "./ListingComponents/ListingCommon";
import { agencyService } from "../../../services/agencyService";
import Loader from "../../../components/Loader/loader";
import { useEffect, useState } from "react";
import { getApiErrorMessage } from "../../../services/apiClient";
import { toast } from "../../../services/toast";
const ListingDetails = () => {
  const navigate = useNavigate();

  const { id } = useParams();

  const [listing, setListing] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchListing();
  }, [id]);

 const fetchListing = async () => {
  try {
    setLoading(true);

    const res = await agencyService.getAgentProperties({
      page: 1,
      limit: 1,
      propertyId: id,
    });

    if (res) {
      setListing(res);
    } else {
      setListing(null);
    }
  } catch (err) {
    console.error("Listing detail fetch error:", err);
    setListing(null);
    toast.error(
      "Could not load listing details",
      getApiErrorMessage(err, "Please try again."),
    );
  } finally {
    setLoading(false);
  }
};
  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      {/* Header */}
      <AgencyHeader
        title="Listing detail"
        showBack={true}
        onBackClick={() => navigate(-1)}
      />
      <div className="rounded-[15px] bg-white md:p-[22px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px]">
        <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0">
          <span className="text-[#707070] font-[Regular]">Project Name : </span>
          <span className="text-[#222] font-[Bold]">
            {listing?.title || "-"}
          </span>
        </p>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full lg:w-auto lg:justify-end">
          <button
            type="button"
            onClick={() =>
              navigate("/agency/listings/edit-property", {
                state: { propertyId: id },
              })
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
        </div>
      </div>
      {loading ? (
        <div
          className="rounded-[15px] bg-white min-h-[320px] flex flex-col items-center justify-center gap-3"
          aria-busy="true"
          aria-live="polite"
        >
          <Loader size={72} margin={0} />
          <p className="text-[13px] font-[Regular] text-[#707070]">
            Loading listing details...
          </p>
        </div>
      ) : (
        <>
          <ListingHeader listing={listing} />
          <ListingCommon listing={listing} />
        </>
      )}
    </div>
  );
};

export default ListingDetails;
