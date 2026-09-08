import { useEffect, useState, useMemo, type ReactNode } from "react";
import { SuperAgentIcon, AgentIcon, TickIcon, AgentsIcon } from "../../../../../components/CustomFile/icons";
import mainbg from "../../../../../assets/img/mainbg.png";
import { agencyService } from "../../../../../services/agencyService";
import { API_BASE_URL } from "../../../../../services/apiClient";

function listingTypeLabel(leads: Record<string, unknown> | null | undefined): string {
  const inq = leads?.inquiry as Record<string, unknown> | undefined;
  const ltInq = inq?.listingType as Record<string, unknown> | undefined;
  if (typeof ltInq?.name === "string" && ltInq.name) return ltInq.name;
  const prop = leads?.property as Record<string, unknown> | undefined;
  const ltProp = prop?.listingType as Record<string, unknown> | string | undefined;
  if (ltProp && typeof ltProp === "object" && typeof ltProp.name === "string") {
    return ltProp.name;
  }
  return "-";
}

function propertyTypeLabel(leads: Record<string, unknown> | null | undefined): string {
  const prop = leads?.property as Record<string, unknown> | undefined;
  const pt = prop?.propertyType as Record<string, unknown> | string | undefined;
  if (pt && typeof pt === "object" && typeof pt.name === "string") return pt.name;
  return "-";
}

/** How the lead reached the agent — API `inquiryType`: call | email | whatsapp (not `source` e.g. property-listing). */
function leadChannelLabel(inquiryType: unknown): string {
  const t = String(inquiryType ?? "").trim().toLowerCase();
  if (t === "call") return "Call";
  if (t === "whatsapp") return "Whatsapp";
  if (t === "email") return "Mail";
  if (!t) return "-";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function formatDealTypeLabel(dealType: unknown): string {
  const t = String(dealType ?? "").toLowerCase().trim();
  if (t === "sale") return "Sale";
  if (t === "rent") return "Rent";
  return t ? t.charAt(0).toUpperCase() + t.slice(1) : "-";
}

function formatDealClosedDateDisplay(iso: unknown): string {
  if (iso == null || iso === "") return "-";
  const d = new Date(String(iso));
  if (Number.isNaN(d.getTime())) return "-";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDealAmountDisplay(amount: unknown, currency: string): string {
  if (amount == null || amount === "") return "-";
  const n = Number(amount);
  if (Number.isNaN(n)) return String(amount);
  const cur = currency.trim() || "AED";
  return `${n.toLocaleString("en-AE")} ${cur}`;
}

const ProperyLeadsHeader = ({ leads }: { leads: any }) => {
  const property = leads?.property as Record<string, unknown> | undefined;
  const inquiry = leads?.inquiry as Record<string, unknown> | undefined;
  const agent = leads?.agent as Record<string, unknown> | undefined;
  const customer = leads?.customer as Record<string, unknown> | undefined;

  const agentType = String(agent?.agentType ?? "").toLowerCase();
  const isSuperAgent = agentType === "superagent";
  const isAgent = agentType === "agent";

  const spec = agent?.specialization as Record<string, unknown> | string | undefined;
  const specializationTitle =
    spec && typeof spec === "object" && typeof spec.title === "string"
      ? spec.title
      : typeof spec === "string"
        ? spec
        : "-";

  const inquiredDisplay = inquiry?.inquiredAt
    ? new Date(String(inquiry.inquiredAt)).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
    : "-";

  const dealClosedData = inquiry?.dealClosed as Record<string, unknown> | null | undefined;
  const hasClosedDeal =
    Boolean(dealClosedData && typeof dealClosedData === "object") &&
    (dealClosedData!.isClosed === true ||
      dealClosedData!.dealAmount != null ||
      (typeof dealClosedData!.dealType === "string" && dealClosedData!.dealType.trim() !== ""));

  const dealClosureRef = dealClosedData?.dealClosureRef as Record<string, unknown> | undefined;
  const dealCurrency = String(dealClosureRef?.currency ?? property?.currency ?? "AED");

  const closedDealRows: { label: string; value: ReactNode }[] = hasClosedDeal
    ? [
      {
        label: "Deal type",
        value: <span className="font-[Bold]">{formatDealTypeLabel(dealClosedData!.dealType)}</span>,
      },
      {
        label: "Deal amount",
        value: (
          <span className="font-[Bold]">
            {formatDealAmountDisplay(dealClosedData!.dealAmount, dealCurrency)}
          </span>
        ),
      },
      {
        label: "Deal closed date",
        value: <span className="font-[Bold]">{formatDealClosedDateDisplay(dealClosedData!.closedDate)}</span>,
      },
    ]
    : [];

  const AssignedRows: { label: string; value: ReactNode }[] = [
    { label: "Email address", value: <span className="font-[Bold]">{String(agent?.email ?? "-")}</span> },
    { label: "Phone number", value: <span className="font-[Bold]">{String(agent?.phoneNumber ?? "-")}</span> },
  ];

  const CustomerRows: { label: string; value: ReactNode }[] = [
    { label: "Email address", value: <span className="font-[Bold]">{String(customer?.email ?? "-")}</span> },
    { label: "Phone number", value: <span className="font-[Bold]">{String(customer?.phoneNumber ?? "-")}</span> },
    { label: "Date", value: <span className="font-[Bold]">{inquiredDisplay}</span> },
    { label: "Lead source", value: <span className="font-[Bold]">{leadChannelLabel(inquiry?.inquiryType)}</span> },
    ...closedDealRows,
  ];

  const isMaid = Boolean(property?.maidBedroom);

  const detailRows: { label: string; value: ReactNode }[] = useMemo(
    () => [
      {
        label: "Project Location",
        value: (
          <span className="font-[Bold] text-right max-w-[min(100%,280px)]">
            {String(
              property?.location && typeof property.location === "object"
                ? (property.location as { fullAddress?: string }).fullAddress ?? "-"
                : "-",
            )}
          </span>
        ),
      },
      { label: "Listing type ", value: <span className="font-[Bold]">{listingTypeLabel(leads)}</span> },
      { label: "Property type ", value: <span className="font-[Bold]">{propertyTypeLabel(leads)}</span> },
      { label: "Number of bedrooms", value: <span className="font-[Bold]">{String(property?.bedrooms ?? "-")}</span> },
      {
        label: "Maid room available",
        value: isMaid ? (
          <span className="font-[Bold] text-[#00A663] flex items-center gap-[5px]">
            <span className="w-[20px] h-[20px] bg-[#00A663] rounded-full flex items-center justify-center">
              <TickIcon width={10} height={10} fill="#fff" />
            </span>
            Available
          </span>
        ) : (
          <span className="font-[Bold] text-[#707070]">Not available</span>
        ),
      },
      { label: "Number of bathrooms", value: <span className="font-[Bold]">{String(property?.bathrooms ?? "-")}</span> },
      {
        label: "Area of the property (Sq.m)",
        value: (
          <span className="font-[Bold]">
            {String(
              property?.area && typeof property.area === "object"
                ? (property.area as { sqm?: unknown }).sqm ?? "-"
                : "-",
            )}
          </span>
        ),
      },
      {
        label: "Area of the property (Sq.ft)",
        value: (
          <span className="font-[Bold]">
            {String(
              property?.area && typeof property.area === "object"
                ? (property.area as { sqft?: unknown }).sqft ?? "-"
                : "-",
            )}
          </span>
        ),
      },
      { label: "DLD Permit number", value: <span className="font-[Bold]">{String(property?.dldPermitNumber ?? "-")}</span> },
      { label: "DLD Permit url", value: <span className="font-[Bold]">{String(property?.dldPermitUrl ?? "-")}</span> },
      {
        label: "Zone location",
        value: (
          <span className="font-[Bold]">
            {String(
              property?.location && typeof property.location === "object"
                ? (property.location as { zone?: string }).zone ?? "-"
                : "-",
            )}
          </span>
        ),
      },
      {
        label: "Price",
        value: (
          <span className="font-[Bold]">
            {property?.price != null && property.price !== ""
              ? `${property.price} ${String(property?.currency ?? "AED")}`
              : "-"}
          </span>
        ),
      },
      {
        label: "Maintenance fee",
        value: <span className="font-[Bold]">{property?.maintenanceFees != null ? String(property.maintenanceFees) : "-"}</span>,
      },
      {
        label: "Service charges",
        value: <span className="font-[Bold]">{property?.serviceCharges != null ? String(property.serviceCharges) : "-"}</span>,
      },
    ],
    [leads, property, isMaid],
  );

  const [imageBaseUrls, setImageBaseUrls] = useState({
    agent: "",
    user: "",
  });

  useEffect(() => {
    let isMounted = true;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackAgent = `${fallbackOrigin}/uploads/img/property/`;
    const fallbackUser = `${fallbackOrigin}/uploads/img/user/`;

    const fetchMasterData = async () => {
      try {
        const res = await agencyService.getMasterData([
          "supportedurls",
          "projectLeadStatuses",
          "projectLeadTabs",
          "projectLeadSubTabs",
        ]);

        if (!isMounted) return;

        const supported = res?.supportedUrls;

        setImageBaseUrls({
          agent: supported?.agentUrl?.img?.trim() || fallbackAgent,
          user: supported?.userUrl?.img?.trim() || fallbackUser,
        });
      } catch {
        if (!isMounted) return;

        setImageBaseUrls({
          agent: fallbackAgent,
          user: fallbackUser,
        });
      }
    };

    void fetchMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  const toImageUrl = (image: string | null, type: "agent" | "user") => {
    let resolved = image?.trim() ?? "";
    if (type === "user" && !resolved) resolved = "profileless.png";
    if (!resolved) return mainbg;
    if (resolved.startsWith("http")) return resolved;

    const fallbackOrigin = API_BASE_URL.replace(/\/api\/?$/, "");
    const fallbackAgent = `${fallbackOrigin}/uploads/img/property/`;
    const fallbackUser = `${fallbackOrigin}/uploads/img/user/`;

    const base =
      (type === "agent" ? imageBaseUrls.agent : imageBaseUrls.user) ||
      (type === "agent" ? fallbackAgent : fallbackUser);

    const cleanBase = base.replace(/\/+$/, "");
    const cleanImage = resolved.replace(/^\/+/, "");

    return `${cleanBase}/${cleanImage}`;
  };

  const status = String(inquiry?.status ?? "");

  return (
    <div className="rounded-[15px] bg-white overflow-hidden min-w-0">
      <div className="flex flex-col lg:flex-col lg:items-stretch xl:flex-row xl:items-stretch">
        <div className="flex-1 min-w-0 md:p-[30px] p-[20px] ">
          <h2 className="text-[18px] md:text-[20px] font-[Bold] text-[#222] leading-tight mb-4">
            Property description
          </h2>
          <div
            className="text-[14px] font-[Regular] text-[#222] leading-[160%] mb-4 [&_p]:mb-2"
            dangerouslySetInnerHTML={{
              __html: String(property?.description ?? ""),
            }}
          />
          <div className="w-full">
            <div className="h-px w-full bg-[rgba(34,34,34,0.10)] mb-6" />
            <div className="flex flex-col">
              {detailRows.map((row) => (
                <div
                  key={row.label}
                  className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 py-3 border-b border-[rgba(34,34,34,0.08)] last:border-b-0 text-[14px]"
                >
                  <span className="text-[14px] text-[#222] font-[Regular] shrink-0">{row.label}</span>
                  <div className="text-[14px] text-[#222] font-[Bold] sm:text-right min-w-0">{row.value}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="w-auto xl:w-[min(100%,380px)] shrink-0 m-[4px] flex flex-col gap-[5px]">
          <div className="rounded-[15px] bg-[#F5F5F5] md:p-[39px_30px] p-[10px_20px]">
            <h3 className="text-[20px] font-[Bold] text-[#222] mb-[28px]">Customer details</h3>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-[10px]">
                <div className="w-[60px] h-[60px] rounded-full overflow-hidden shrink-0 border-[2px] border-[rgba(34,34,34,0.10)]">
                  <img
                    src={toImageUrl(customer?.profilePicture != null ? String(customer.profilePicture) : null, "user")}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-[5px]">
                  <span className="text-[14px] text-[#222] font-[Bold]">{String(customer?.name ?? "-")}</span>
                  <span className="text-[12px] text-[#707070] font-[Regular]">{inquiredDisplay}</span>
                </div>
              </div>
              <div className="flex flex-col">
                {CustomerRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 py-3 border-b border-[rgba(34,34,34,0.10)] last:border-b-0 text-[14px]"
                  >
                    <span className="text-[14px] text-[#222] font-[Regular] shrink-0">{row.label}</span>
                    <div className="text-[14px] text-[#222] font-[Bold] sm:text-right min-w-0">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-[10px] mt-[40px]">
              {hasClosedDeal && (
                <button
                  type="button"
                  className="h-[44px] w-full rounded-[10px] bg-[#00A663] text-[#FFF] text-[14px] font-[Bold] transition-opacity flex items-center justify-center gap-[5px]"
                >
                  <span className="w-[20px] h-[20px] bg-[#FFF] rounded-full flex items-center justify-center">
                    <TickIcon width={10} height={10} fill="#00A663" />
                  </span>
                  Deal is closed
                </button>
              )}
              {!hasClosedDeal && status === "new" && (
                <button
                  type="button"
                  className="h-[44px] w-full rounded-[10px] bg-[#E7EBF7] border border-[#0832AE] text-[#0832AE] text-[14px] font-[Bold] transition-opacity"
                >
                  New inquiry
                </button>
              )}
              {!hasClosedDeal && status === "attended" && (
                <button
                  type="button"
                  className="h-[44px] w-full rounded-[10px] bg-[#E6F7F0] border border-[#00A663] text-[#00A663] text-[14px] font-[Bold] transition-opacity"
                >
                  Attended
                </button>
              )}
              {!hasClosedDeal && status === "closed" && (
                <button
                  type="button"
                  className="h-[44px] w-full rounded-[10px] bg-[#FDE7E7] border border-[#E80808] text-[#E80808] text-[14px] font-[Bold] transition-opacity"
                >
                  Closed
                </button>
              )}
            </div>
          </div>
          <div className="h-full rounded-[15px] bg-[#F5F5F5] md:p-[39px_30px] p-[10px_20px]">
            <h3 className="text-[20px] font-[Bold] text-[#222] mb-[28px]">Assigned agent</h3>
            <div className="flex flex-col gap-5">
              <div className="flex items-center gap-[10px]">
                <div className="w-[60px] h-[60px] rounded-full overflow-hidden shrink-0 border-[2px] border-[rgba(34,34,34,0.10)]">
                  <img
                    src={toImageUrl(agent?.profilePicture != null ? String(agent.profilePicture) : null, "agent")}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col gap-[5px]">
                  {isSuperAgent && (
                    <span className="flex items-center justify-center gap-1 bg-[#EA3934] w-fit h-[21px] p-[6px_7px] text-[10px] font-[SemiBold] text-white uppercase ">
                      <SuperAgentIcon width={10} height={10} />
                      SUPER AGENT
                    </span>
                  )}
                  {isAgent && !isSuperAgent && (
                    <span className="flex items-center justify-center gap-1 bg-[#0832AE] w-fit h-[21px] p-[6px_7px] text-[10px] font-[SemiBold] text-white uppercase ">
                      <AgentsIcon width={10} height={10} />
                      AGENT
                    </span>
                  )}
                  <span className="text-[14px] text-[#222] font-[Bold]">{String(agent?.fullName ?? "-")}</span>
                  <span className="text-[12px] text-[#707070] font-[Regular]">{specializationTitle}</span>
                </div>
              </div>
              <div className="flex flex-col">
                {AssignedRows.map((row) => (
                  <div
                    key={row.label}
                    className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 sm:gap-4 py-3 border-b border-[rgba(34,34,34,0.10)] last:border-b-0 text-[14px]"
                  >
                    <span className="text-[14px] text-[#222] font-[Regular] shrink-0">{row.label}</span>
                    <div className="text-[14px] text-[#222] font-[Bold] sm:text-right min-w-0">{row.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProperyLeadsHeader;
