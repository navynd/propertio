import { useEffect, useMemo, useState } from "react";
import profileless from "../../../../assets/img/profileless.png";
import { projectsService } from "../../../../services/projectsService";

type AdditionalProjectProps = {
    project: Record<string, unknown>;
    unitProperties: Array<Record<string, unknown>>;
};

const formatDate = (value: unknown) => {
    if (!value) return "—";
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatLabel = (value: unknown) => {
    if (value === null || value === undefined || value === "") return "—";
    return String(value);
};

function AdditionalProject({ project, unitProperties }: AdditionalProjectProps) {
    const [agencyImgBase, setAgencyImgBase] = useState("");

    useEffect(() => {
        let mounted = true;
        projectsService
            .getSupportedUrls()
            .then((data) => {
                if (!mounted) return;
                const source =
                    (data.supportedUrls as Record<string, unknown>) ||
                    (data.supportedurls as Record<string, unknown>) ||
                    {};
                const agencyUrl =
                    (source.agencyUrl as Record<string, unknown>) ||
                    (source.agencyurl as Record<string, unknown>) ||
                    {};
                setAgencyImgBase(String(agencyUrl.img || "").replace(/\/?$/, "/"));
            })
            .catch(() => undefined);
        return () => {
            mounted = false;
        };
    }, []);

    const toAgencyPortraitUrl = (picture: unknown) => {
        const raw = typeof picture === "string" ? picture.trim() : "";
        if (!raw || raw.toLowerCase().includes("profileless")) return profileless;
        if (raw.startsWith("http://") || raw.startsWith("https://")) return raw;
        const filename = raw.includes("/") ? raw.split("/").pop() || raw : raw;
        return agencyImgBase ? `${agencyImgBase}${filename}` : profileless;
    };

    const agencies = useMemo(() => {
        const list = Array.isArray(project.authorizedAgencies) ? project.authorizedAgencies : [];
        return list
            .map((agency) => {
                if (!agency || typeof agency !== "object") return null;
                const row = agency as {
                    _id?: string;
                    agencyName?: string;
                    profilePicture?: string;
                };
                return {
                    id: String(row._id || row.agencyName || ""),
                    name: String(row.agencyName || "Agency"),
                    img: toAgencyPortraitUrl(row.profilePicture),
                };
            })
            .filter((x): x is { id: string; name: string; img: string } => Boolean(x));
    }, [project.authorizedAgencies, agencyImgBase]);

    const launchPrice = (project.launchPrice || {}) as {
        startingFrom?: number;
        currency?: string;
    };

    const readOnlyFields = useMemo(
        () => [
            { label: "Publish status", value: formatLabel(project.publishStatus) },
            { label: "Completion status", value: formatLabel(project.completionStatus) },
            { label: "Progress status", value: formatLabel(project.progressStatus) },
            { label: "Construction progress", value: formatLabel(project.constructionProgress) },
            {
                label: "Launch price",
                value:
                    typeof launchPrice.startingFrom === "number"
                        ? `${launchPrice.currency || "AED"} ${launchPrice.startingFrom.toLocaleString("en-US")}`
                        : "—",
            },
            { label: "Government fees (%)", value: formatLabel(project.governmentFees) },
            { label: "Total units", value: formatLabel(project.totalUnits) },
            { label: "Available units", value: formatLabel(project.availableUnits) },
            { label: "Sold units", value: formatLabel(project.soldUnits) },
            { label: "Reserved units", value: formatLabel(project.reservedUnits) },
            { label: "DLD registered", value: project.isDldRegistered ? "Yes" : "No" },
            { label: "DLD registration number", value: formatLabel(project.dldRegistrationNumber) },
            { label: "Project announced", value: formatDate(project.projectAnnouncement) },
            { label: "Booking open", value: formatDate(project.bookingOpen) },
            { label: "Construction started", value: formatDate(project.constructionStarted) },
            { label: "Launch date", value: formatDate(project.launchDate) },
            { label: "Delivery date", value: formatDate(project.deliveryDate) },
            { label: "Expected completion", value: formatDate(project.expectedCompletionDate) },
            { label: "Published at", value: formatDate(project.publishedAt) },
            { label: "Verified", value: project.isVerified ? "Yes" : "No" },
            { label: "Featured", value: project.isFeatured ? "Yes" : "No" },
            { label: "Active", value: project.isActive ? "Yes" : "No" },
            {
                label: "Layout groups",
                value: unitProperties.length ? String(unitProperties.length) : "—",
            },
        ],
        [project, launchPrice, unitProperties.length]
    );

    const faqs = Array.isArray(project.faqs)
        ? (project.faqs as Array<{ question?: string; answer?: string }>)
        : [];

    return (
        <div className="flex flex-col gap-[20px]">
            <div className="mt-[20px] rounded-[15px] bg-white md:p-[30px] p-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)]">
                <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Additional details</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-[16px]">
                    {readOnlyFields.map((field) => (
                        <div
                            key={field.label}
                            className="rounded-[10px] border border-[rgba(34,34,34,0.08)] p-[14px] bg-[#FAFAFA]"
                        >
                            <p className="text-[12px] font-[SemiBold] text-[#707070] mb-[6px]">
                                {field.label}
                            </p>
                            <p className="text-[14px] font-[Medium] text-[#222] break-words">
                                {field.value}
                            </p>
                        </div>
                    ))}
                </div>
            </div>

            {faqs.length > 0 && (
                <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)]">
                    <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">FAQs</h2>
                    <div className="flex flex-col gap-[12px]">
                        {faqs.map((faq, index) => (
                            <div
                                key={`faq-${index}`}
                                className="rounded-[10px] border border-[rgba(34,34,34,0.08)] p-[14px]"
                            >
                                <p className="text-[14px] font-[Bold] text-[#222] mb-[6px]">
                                    {faq.question || "—"}
                                </p>
                                <p className="text-[13px] font-[Regular] text-[#707070]">
                                    {faq.answer || "—"}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-[15px] bg-white md:p-[30px] p-[20px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)]">
                <h2 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Authorized agencies</h2>
                {agencies.length === 0 ? (
                    <p className="text-[14px] text-[#707070]">No authorized agencies assigned.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {agencies.map((agency) => (
                            <div
                                key={agency.id}
                                className="flex items-center gap-3 rounded-[10px] bg-[#F5F5F5] h-[90px] p-[6px_10px_6px_4px]"
                            >
                                <img
                                    src={agency.img}
                                    alt=""
                                    className="h-[85px] w-[85px] shrink-0 rounded-[10px] object-cover"
                                />
                                <span className="text-[15px] font-[Bold] text-[#222] leading-[165%]">
                                    {agency.name}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdditionalProject;
