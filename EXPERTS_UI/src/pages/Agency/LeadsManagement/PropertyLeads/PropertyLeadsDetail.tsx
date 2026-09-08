import AgencyHeader from "../../../../components/Header/AgencyHeader";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ProperyLeadsHeader from "./PropertyLeadsComponents/ProperyLeadsHeader";
import PropertyCommon from "./PropertyLeadsComponents/PropertyCommon";
import { agencyService } from "../../../../services/agencyService";
import { toast } from "../../../../services/toast";
import { getApiErrorMessage } from "../../../../services/apiClient";
import Loader from "../../../../components/Loader/loader";

const PropertyLeadsDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [leadDetail, setLeadDetail] = useState<Record<string, unknown> | null>(
    null,
  );
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;

    const fetchLeadDetail = async () => {
      try {
        setLoading(true);
        const res = await agencyService.getPropertyLeadById(id);
        setLeadDetail((res && typeof res === "object" ? res : null) as Record<
          string,
          unknown
        > | null);
      } catch (error) {
        console.error("lead detail error", error);
        setLeadDetail(null);
        toast.error(
          "Could not load lead details",
          getApiErrorMessage(error, "Please try again."),
        );
      } finally {
        setLoading(false);
      }
    };

    void fetchLeadDetail();
  }, [id]);

  const inquiry = leadDetail?.inquiry as Record<string, unknown> | undefined;
  const property = leadDetail?.property as Record<string, unknown> | undefined;
  const title =
    (typeof property?.title === "string" && property.title) ||
    (typeof inquiry?.propertyTitle === "string" && inquiry.propertyTitle) ||
    "-";

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8 flex flex-col gap-[20px]">
      <AgencyHeader
        title="Leads detail"
        showBack={true}
        onBackClick={() => navigate(-1)}
      />
      <div className="rounded-[15px] bg-white md:p-[22px] p-[20px] min-w-0 flex justify-between flex-wrap gap-[20px]">
        <p className="md:text-[20px] text-[16px] leading-[140%] shrink-0">
          <span className="text-[#707070] font-[Regular]">Property name : </span>
          <span className="text-[#222] font-[Bold]">{title}</span>
        </p>
      </div>
      {loading ? (
        <div
          className="rounded-[15px] bg-white min-h-[320px] flex flex-col items-center justify-center gap-3 py-12"
          aria-busy="true"
          aria-live="polite"
        >
          <Loader size={72} margin={0} />
          <p className="text-[13px] font-[Regular] text-[#707070]">
            Loading lead details…
          </p>
        </div>
      ) : leadDetail ? (
        <>
          <ProperyLeadsHeader leads={leadDetail} />
          <PropertyCommon leads={leadDetail} />
        </>
      ) : (
        <div className="rounded-[15px] bg-white min-h-[200px] flex items-center justify-center p-8 text-center text-[#707070] text-[14px]">
          No lead data loaded.
        </div>
      )}
    </div>
  );
};

export default PropertyLeadsDetail;
