import { useLocation } from "react-router-dom";
export type OtherDetailsFormValue = {
    bedrooms: string;
    maidBedroom: boolean;
    bathrooms: string;
    areaSqm: string;
    areaSqft: string;
    dldPermitNumber: string;
    dldPermitUrl: string;
    price: string;
    maintenanceFees: string;
    serviceCharges: string;
};

type OtherDetailsStepProps = {
    listingTransaction?: string;
    value: OtherDetailsFormValue;
    onChange: (value: OtherDetailsFormValue) => void;
};

const OtherDetailsStep = ({ listingTransaction = "", value, onChange }: OtherDetailsStepProps) => {
    const location = useLocation();
    const isEditpath =
        location.pathname.includes("/agent/properties-management/edit-property") ||
        location.pathname.includes("/agency/listings/edit-property");
    const normalizedTransaction = listingTransaction.trim().toLowerCase();
    const priceLabel = normalizedTransaction === "buy" ? "Price" : "Yearly rental price";
    const pricePlaceholder =
        normalizedTransaction === "buy" ? "Enter the price" : "Enter the yearly rental price";

    return (
        <div className="rounded-[15px] bg-white md:p-[30px] p-[16px]">
            <h3 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Other details</h3>
            <div className="flex flex-col gap-[14px]">
                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                        Number of bedrooms <span className="text-[#EA3934]">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Enter number of beds"
                        value={value.bedrooms}
                        onChange={(event) => onChange({ ...value, bedrooms: event.target.value })}
                        className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                    />
                    <label className="mt-[8px] inline-flex items-center gap-[8px] cursor-pointer">
                        <input
                            type="checkbox"
                            checked={value.maidBedroom}
                            onChange={(event) => onChange({ ...value, maidBedroom: event.target.checked })}
                            className="h-[13px] w-[13px] rounded border border-[rgba(34,34,34,0.20)]"
                        />
                        <span className="text-[12px] font-[Regular] text-[#707070]">Maid bedroom is available</span>
                    </label>
                </div>

                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                        Number of bathrooms <span className="text-[#EA3934]">*</span>
                    </label>
                    <input
                        type="text"
                        placeholder="Enter number of baths"
                        value={value.bathrooms}
                        onChange={(event) => onChange({ ...value, bathrooms: event.target.value })}
                        className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                    />
                </div>

                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                        Area of the property <span className="text-[#EA3934]">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px]">
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="0.00"
                                value={value.areaSqm}
                                onChange={(event) => onChange({ ...value, areaSqm: event.target.value })}
                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[56px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                            />
                            <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070]">Sq.m</span>
                        </div>
                        <div className="relative">
                            <input
                                type="text"
                                placeholder="0.00"
                                value={value.areaSqft}
                                onChange={(event) => onChange({ ...value, areaSqft: event.target.value })}
                                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[56px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                            />
                            <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#707070]">Sq.ft</span>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                        DLD Permit number <span className="text-[#EA3934]">*</span>
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px]">
                        <input
                            type="text"
                            placeholder="Enter DLD permit number"
                            value={value.dldPermitNumber}
                            onChange={(event) => onChange({ ...value, dldPermitNumber: event.target.value })}
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                        />
                        <input
                            type="text"
                            placeholder="Paste the DLD permit url"
                            value={value.dldPermitUrl}
                            onChange={(event) => onChange({ ...value, dldPermitUrl: event.target.value })}
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                        />
                    </div>
                </div>

                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                        {priceLabel} <span className="text-[#EA3934]">*</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder={pricePlaceholder}
                            value={value.price}
                            onChange={(event) => onChange({ ...value, price: event.target.value })}
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[52px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                        />
                        <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#222]">AED</span>
                    </div>
                </div>

                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                        Maintenance fees <span className="text-[#707070] font-[Regular]">(Optional)</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Enter maintenance fees"
                            value={value.maintenanceFees}
                            onChange={(event) => onChange({ ...value, maintenanceFees: event.target.value })}
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[42px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                        />
                        <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#222]">%</span>
                    </div>
                </div>

                <div>
                    <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
                        Service charges <span className="text-[#707070] font-[Regular]">(Optional)</span>
                    </label>
                    <div className="relative">
                        <input
                            type="text"
                            placeholder="Enter service charges"
                            value={value.serviceCharges}
                            onChange={(event) => onChange({ ...value, serviceCharges: event.target.value })}
                            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[52px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                        />
                        <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#222]">AED</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OtherDetailsStep;

