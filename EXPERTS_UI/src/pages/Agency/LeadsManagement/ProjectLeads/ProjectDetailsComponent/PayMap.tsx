import { useState, useEffect } from "react";
import { DownloadIcon, PdfIcon } from "../../../../../components/CustomFile/icons";
import ProjectLocationMap from "../../../../../components/ProjectLocationMap/ProjectLocationMap";

import mainbg from "../../../../../assets/img/mainbg.png";
import {
  agencyService,
  type SortByProjectMasterItem,
} from "../../../../../services/agencyService";
import { toast } from "../../../../../services/toast";
import { API_BASE_URL } from "../../../../../services/apiClient";
import Loader from "../../../../../components/Loader/loader";
const TAB_ACTIVE = "text-[#0832AE] font-[SemiBold] border-[#0832AE]";
const TAB_INACTIVE = "text-[#222] font-[Regular] border-transparent";

function PayMap({ leads }: { leads: any }) {
  const [activeTab, setActiveTab] = useState(0);
  const plans = leads?.project?.paymentPlans || [];
  const activePlan = plans[activeTab];
  const [projectbrochureImageBaseUrl, setProjectbrochureImageBaseUrl] =
    useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallback = `${fallbackOrigin}/uploads/img/project/`;

    agencyService
      .getMasterData(["supportedurls"])
      .then((res) => {
        if (!isMounted) return;

        const projectImg = res?.supportedUrls?.projectUrl?.doc || fallback;

        setProjectbrochureImageBaseUrl(projectImg.replace(/\/?$/, "/"));
      })
      .catch(() => {
        if (!isMounted) return;
        setProjectbrochureImageBaseUrl(fallback);
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
    const base = (projectbrochureImageBaseUrl || fallbackBase).replace(
      /\/?$/,
      "/",
    );
    return `${base}${image}`;
  };
  const brochureUrl = leads?.project?.brochure
    ? toProjectImageUrl(leads?.project.brochure)
    : null;

  const handleDownload = () => {
    if (!leads?.project?.brochure) return;

    const url = toProjectImageUrl(leads?.project.brochure);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    link.setAttribute("target", "_blank");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="flex flex-col gap-5">
        {/* Uploaded brochure — top left */}
        <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col">
          <h2 className="md:text-[20px] text-[16px] font-[Bold] text-[#222] mb-4">
            Uploaded brochure
          </h2>
          <div className="rounded-[10px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)] p-[25px_20px] flex items-center gap-4 min-w-0">
            <span className="shrink-0 inline-flex">
              <PdfIcon width={34} height={42} />
            </span>
            <div className="flex-1 min-w-0 overflow-hidden">
              {brochureUrl ? (
                <>
                  <a
                    href={brochureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-[15px] font-[Bold] text-[#222] truncate"
                  >
                    {leads?.project?.brochure?.split("/").pop()}
                  </a>

                  <p className="text-[12px] font-[Regular] text-[#707070] mt-1 truncate">
                    Click to view brochure
                  </p>
                </>
              ) : (
                <p className="text-[14px] text-[#999]">No brochure available</p>
              )}
            </div>
            <button
              type="button"
              onClick={handleDownload}
              className="cursor-pointer shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-[10px] bg-[#F5F5F5] border border-[rgba(34,34,34,0.08)] flex items-center justify-center hover:bg-[#EBEBEB] transition-colors"
            >
              <DownloadIcon width={14} height={14} />
            </button>
          </div>
        </section>
        {/* Payment plan — bottom left */}
        {/* Payment plan */}
        <section className="rounded-[15px] bg-white flex flex-col">
          <h2 className="md:p-[30px] p-[20px] md:text-[20px] text-[16px] font-[Bold] text-[#222]">
            Payment plan
          </h2>

          {/* Tabs */}
          <div className="md:p-[0px_30px_0px_30px] p-[0px_20px_0px_20px] flex border-b border-[rgba(34,34,34,0.08)] mb-5 overflow-x-auto">
            {plans.map((plan: any, index: number) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveTab(index)}
                className={`cursor-pointer whitespace-nowrap p-[20px_30px] text-[13px] border-b-[3px] -mb-px transition-colors ${
                  activeTab === index ? TAB_ACTIVE : TAB_INACTIVE
                }`}
              >
                {plan.planName}
              </button>
            ))}
          </div>

          {/* Active Plan */}
          {activePlan && (
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 md:p-[0px_30px_30px_30px] p-[0px_20px_20px_20px]">
              {/* Down Payment */}
              <div className="flex-1 rounded-[10px] bg-[#F5F5F5] p-[18px] min-w-0">
                <p className="text-[22px] font-[Bold] text-[#222] text-center mb-2">
                  {activePlan.downPayment?.percentage}%
                </p>

                <p className="text-[14px] font-[Medium] text-[#222] text-center mb-1">
                  Down Payment
                </p>

                <p className="text-[12px] font-[Regular] text-[#707070] text-center">
                  AED {activePlan.downPayment?.amount?.toLocaleString()}
                </p>
              </div>

              {/* During Construction */}
              <div className="flex-1 rounded-[10px] bg-[#F5F5F5] p-[18px] min-w-0">
                <p className="text-[22px] font-[Bold] text-[#222] text-center mb-2">
                  {activePlan.duringConstruction?.percentage}%
                </p>

                <p className="text-[14px] font-[Medium] text-[#222] text-center mb-1">
                  During Construction
                </p>

                <p className="text-[12px] font-[Regular] text-[#707070] text-center">
                  AED {activePlan.duringConstruction?.amount?.toLocaleString()}
                </p>
              </div>

              {/* On Handover */}
              <div className="flex-1 rounded-[10px] bg-[#F5F5F5] p-[18px] min-w-0">
                <p className="text-[22px] font-[Bold] text-[#222] text-center mb-2">
                  {activePlan.onHandover?.percentage}%
                </p>

                <p className="text-[14px] font-[Medium] text-[#222] text-center mb-1">
                  On Handover
                </p>

                <p className="text-[12px] font-[Regular] text-[#707070] text-center">
                  AED {activePlan.onHandover?.amount?.toLocaleString()}
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
      <ProjectLocationMap
        project={(leads?.project ?? null) as Record<string, unknown> | null}
        title="Map location"
      />
    </div>
  );
}

export default PayMap;
