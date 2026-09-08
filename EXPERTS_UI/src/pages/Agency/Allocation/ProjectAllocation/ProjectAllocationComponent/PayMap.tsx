import { useState, useEffect } from "react";
import { DownloadIcon, PdfIcon } from "../../../../../components/CustomFile/icons";
import ProjectLocationMap from "../../../../../components/ProjectLocationMap/ProjectLocationMap";

const TAB_ACTIVE = "text-[#0832AE] font-[SemiBold] border-[#0832AE]";
const TAB_INACTIVE = "text-[#222] font-[Regular] border-transparent";

import mainbg from "../../../../../assets/img/mainbg.png";
import { agencyService } from "../../../../../services/agencyService";
import { API_BASE_URL } from "../../../../../services/apiClient";

const emptyStateClass =
  "flex min-h-[200px] items-center justify-center rounded-[12px] border border-dashed border-[rgba(34,34,34,0.12)] bg-[#FAFAFA] px-4 py-8 text-center text-[14px] font-[Regular] text-[#707070]";

function PayMap({ project }: { project: any }) {
  const [activeTab, setActiveTab] = useState(0);
  const plans = project?.paymentPlans || [];
  const activePlan = plans[activeTab];
  const [projectbrochureImageBaseUrl, setProjectbrochureImageBaseUrl] =
    useState<string | null>(null);

  useEffect(() => {
    setActiveTab(0);
  }, [project?.projectId]);

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
  const handleDownload = () => {
    if (!project?.brochure) return;

    const url = toProjectImageUrl(project.brochure);

    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "");
    link.setAttribute("target", "_blank");

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const installmentCount =
    activePlan?.duringConstruction?.installments?.length ?? 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      <div className="flex flex-col gap-[20px]">
        <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col">
          <h2 className="md:text-[20px] text-[16px] font-[Bold] text-[#222] mb-4">
            Uploaded brochure
          </h2>
          {project?.brochure ? (
            <div className="rounded-[10px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)] p-[25px_20px] flex items-center gap-4 min-w-0">
              <span className="shrink-0 inline-flex">
                <PdfIcon width={34} height={42} />
              </span>
              <div className="flex-1 min-w-0 overflow-hidden">
                <a
                  href={toProjectImageUrl(project.brochure)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-[15px] font-[Bold] text-[#222] truncate"
                >
                  {project.brochure.split("/").pop()}
                </a>
                <p className="text-[12px] font-[Regular] text-[#707070] mt-1 truncate">
                  Click to view brochure
                </p>
              </div>
              <button
                type="button"
                onClick={handleDownload}
                className="cursor-pointer shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-[10px] bg-[#F5F5F5] border border-[rgba(34,34,34,0.08)] flex items-center justify-center hover:bg-[#EBEBEB] transition-colors"
              >
                <DownloadIcon width={14} height={14} />
              </button>
            </div>
          ) : (
            <div className={emptyStateClass}>Brochure is not available.</div>
          )}
        </section>
        <section className="rounded-[15px] bg-white  flex flex-col">
          <h2 className="md:p-[30px_30px_15px_30px] p-[20px] md:text-[20px] text-[16px] font-[Bold] text-[#222]">
            Payment plan
          </h2>
          {plans.length === 0 ? (
            <div className={`md:m-[0px_30px_30px_30px] m-[0px_20px_20px_20px] ${emptyStateClass}`}>
              No payment plans available for this project.
            </div>
          ) : (
            <>
              <div className="md:p-[0px_30px_0px_30px] p-[0px_20px_0px_20px] flex border-b border-[rgba(34,34,34,0.08)] mb-5 overflow-x-auto scrollbar-hide">
                {plans.map((plan: any, index: number) => (
                  <button
                    key={plan.planName ?? index}
                    type="button"
                    onClick={() => setActiveTab(index)}
                    className={`cursor-pointer p-[20px_30px] text-[13px] font-[Regular] border-b-[3px] -mb-px transition-colors shrink-0 ${
                      activeTab === index ? TAB_ACTIVE : TAB_INACTIVE
                    }`}
                  >
                    {plan.planName}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto scrollbar-hide md:p-[0px_0px_30px_0px] md:m-[0px_30px_0px_30px] p-[0px_0px_20px_0px] m-[0px_20px_0px_20px]">
                <div className="flex gap-3 sm:gap-4 flex-nowrap">
                  {activePlan && (
                    <>
                      <div className="flex-shrink-0 min-w-[180px] rounded-[10px] bg-[#F5F5F5] p-[18px]">
                        <p className="text-[17px] font-[Bold] text-center">
                          {activePlan.downPayment?.percentage ?? "—"}%
                        </p>
                        <p className="text-[14px] text-center">Down Payment</p>
                        <p className="text-[12px] text-center text-[#707070]">
                          {project?.propertyPrice?.currency}{" "}
                          {activePlan.downPayment?.amount ?? "—"}
                        </p>
                      </div>

                      <div className="flex-shrink-0 min-w-[180px] rounded-[10px] bg-[#F5F5F5] p-[18px]">
                        <p className="text-[17px] font-[Bold] text-center">
                          {activePlan.duringConstruction?.percentage ?? "—"}%
                        </p>
                        <p className="text-[14px] text-center">
                          During Construction
                        </p>
                        <p className="text-[12px] text-center text-[#707070]">
                          {installmentCount} installments
                        </p>
                      </div>

                      <div className="flex-shrink-0 min-w-[180px] rounded-[10px] bg-[#F5F5F5] p-[18px]">
                        <p className="text-[17px] font-[Bold] text-center">
                          {activePlan.onHandover?.percentage ?? "—"}%
                        </p>
                        <p className="text-[14px] text-center">On Handover</p>
                        <p className="text-[12px] text-center text-[#707070]">
                          {project?.propertyPrice?.currency}{" "}
                          {activePlan.onHandover?.amount ?? "—"}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </>
          )}
        </section>
      </div>
      <ProjectLocationMap
        project={project as Record<string, unknown> | null}
        title="Map location"
      />
    </div>
  );
}

export default PayMap;
