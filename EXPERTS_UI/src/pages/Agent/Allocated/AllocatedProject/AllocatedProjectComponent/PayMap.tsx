import { useState } from "react";
import { DownloadIcon, PdfIcon } from "../../../../../components/CustomFile/icons";
import type { AgentAllocatedProjectDetail } from "../../../../../services/agentService";
import ProjectLocationMap from "../../../../../components/ProjectLocationMap/ProjectLocationMap";

const TAB_ACTIVE = "text-[#0832AE] font-[SemiBold] border-[#0832AE]";
const TAB_INACTIVE = "text-[#222] font-[Regular] border-transparent";

const emptyStateClass =
    "flex min-h-[200px] items-center justify-center rounded-[12px] border border-dashed border-[rgba(34,34,34,0.12)] bg-[#FAFAFA] px-4 py-8 text-center text-[14px] font-[Regular] text-[#707070]";

type PaymentCard = {
    percent: string;
    title: string;
    subtitle?: string;
};

type PayMapProps = {
    project: AgentAllocatedProjectDetail | null;
    brochureUrl: string;
};

function PayMap({ project, brochureUrl }: PayMapProps) {
    const planOptions = project?.paymentPlans || [];
    const [activeTab, setActiveTab] = useState(0);
    const activePlan = planOptions[activeTab];

    const cards: PaymentCard[] = activePlan
        ? [
              {
                  percent: `${activePlan.downPayment?.percentage ?? 0}%`,
                  title: "Down payment",
                  subtitle:
                      activePlan.downPayment?.amount != null
                          ? `${activePlan.downPayment.amount.toLocaleString("en-US")} AED`
                          : undefined,
              },
              {
                  percent: `${activePlan.duringConstruction?.percentage ?? 0}%`,
                  title: "During construction",
                  subtitle: activePlan.duringConstruction?.installments?.length
                      ? `${activePlan.duringConstruction.installments.length} installments`
                      : undefined,
              },
              {
                  percent: `${activePlan.onHandover?.percentage ?? 0}%`,
                  title: "On handover",
                  subtitle:
                      activePlan.onHandover?.amount != null
                          ? `${activePlan.onHandover.amount.toLocaleString("en-US")} AED`
                          : undefined,
              },
          ]
        : [];

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="flex flex-col gap-5">
                <section className="rounded-[15px] bg-white md:p-[30px] p-[20px] flex flex-col">
                    <h2 className="md:text-[20px] text-[16px] font-[Bold] text-[#222] mb-4">Uploaded brochure</h2>
                    {project?.brochure ? (
                        <div className="rounded-[10px] bg-white shadow-[0_2px_12px_rgba(0,0,0,0.10)] p-[25px_20px] flex items-center gap-4 min-w-0">
                            <span className="shrink-0 inline-flex">
                                <PdfIcon width={34} height={42} />
                            </span>
                            <div className="flex-1 min-w-0 overflow-hidden">
                                {brochureUrl ? (
                                    <a
                                        href={brochureUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="block text-[15px] font-[Bold] text-[#222] truncate"
                                    >
                                        {project.brochure.split("/").pop()}
                                    </a>
                                ) : (
                                    <p className="text-[15px] font-[Bold] text-[#222] truncate">
                                        {project.brochure.split("/").pop()}
                                    </p>
                                )}
                                <p className="text-[12px] font-[Regular] text-[#707070] mt-1">Click to view brochure</p>
                            </div>
                            <button
                                type="button"
                                aria-label="Download brochure"
                                disabled={!brochureUrl}
                                onClick={() => {
                                    if (brochureUrl) window.open(brochureUrl, "_blank", "noopener,noreferrer");
                                }}
                                className="cursor-pointer shrink-0 w-10 h-10 sm:w-11 sm:h-11 rounded-[10px] bg-[#F5F5F5] border border-[rgba(34,34,34,0.08)] flex items-center justify-center hover:bg-[#EBEBEB] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <DownloadIcon width={14} height={14} />
                            </button>
                        </div>
                    ) : (
                        <div className={emptyStateClass}>Brochure document not available</div>
                    )}
                </section>

                <section className="rounded-[15px] bg-white flex flex-col">
                    <h2 className="md:p-[30px_30px_15px_30px] p-[20px] md:text-[20px] text-[16px] font-[Bold] text-[#222]">
                        Payment plan
                    </h2>
                    <div className="md:p-[0px_30px_0px_30px] p-[0px_20px_0px_20px] flex border-b border-[rgba(34,34,34,0.08)] mb-5">
                        {planOptions.map((plan, idx) => (
                            <button
                                key={`${plan.planName || "plan"}-${idx}`}
                                type="button"
                                onClick={() => setActiveTab(idx)}
                                className={`cursor-pointer p-[20px_30px] text-[13px] font-[Regular] border-b-[3px] -mb-px transition-colors ${
                                    activeTab === idx ? TAB_ACTIVE : TAB_INACTIVE
                                }`}
                            >
                                {plan.planName || `Option ${idx + 1}`}
                            </button>
                        ))}
                    </div>
                    <div className="overflow-x-auto scrollbar-hide md:p-[0px_0px_30px_0px] md:m-[0px_30px_0px_30px] p-[0px_0px_20px_0px] m-[0px_20px_0px_20px]">
                        <div className="flex gap-3 sm:gap-4 flex-nowrap">
                            {cards.map((card, index) => (
                                <div
                                    key={`${activeTab}-${card.percent}-${card.title}-${index}`}
                                    className="flex-shrink-0 min-w-[180px] rounded-[10px] bg-[#F5F5F5] p-[18px]"
                                >
                                    <p className="text-[17px] font-[Bold] text-[#222] leading-none mb-2 text-center whitespace-nowrap">
                                        {card.percent}
                                    </p>
                                    <p className="text-[14px] font-[Medium] text-[#222] text-center mb-1 whitespace-nowrap">
                                        {card.title}
                                    </p>
                                    {card.subtitle ? (
                                        <p className="text-[12px] font-[Regular] text-[#707070] text-center whitespace-nowrap">
                                            {card.subtitle}
                                        </p>
                                    ) : null}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>
            </div>

            <ProjectLocationMap
                project={project as unknown as Record<string, unknown> | null}
                title="Map location"
            />
        </div>
    );
}

export default PayMap;
