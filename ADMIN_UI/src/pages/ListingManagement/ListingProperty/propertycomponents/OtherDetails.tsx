type OtherDetailsProps = {
  dldPermitNumber: string;
  dldPermitUrl: string;
  onDldPermitNumberChange: (value: string) => void;
  onDldPermitUrlChange: (value: string) => void;
  showMonthlyRent?: boolean;
  monthlyRent: string;
  onMonthlyRentChange: (value: string) => void;
  maintenanceFees: string;
  onMaintenanceFeesChange: (value: string) => void;
  serviceCharges: string;
  onServiceChargesChange: (value: string) => void;
};

const OtherDetails = ({
  dldPermitNumber,
  dldPermitUrl,
  onDldPermitNumberChange,
  onDldPermitUrlChange,
  showMonthlyRent = false,
  monthlyRent,
  onMonthlyRentChange,
  maintenanceFees,
  onMaintenanceFeesChange,
  serviceCharges,
  onServiceChargesChange,
}: OtherDetailsProps) => (
  <div className="rounded-[15px] bg-white md:p-[20px] p-[16px] border border-[#EAEAEA]">
    <h3 className="text-[20px] font-[Bold] text-[#222] mb-[20px]">Other details</h3>
    <div className="flex flex-col gap-[14px]">
      <div>
        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
          DLD Permit number
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-[8px]">
          <input
            type="text"
            placeholder="Enter DLD permit number"
            value={dldPermitNumber}
            onChange={(e) => onDldPermitNumberChange(e.target.value)}
            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
          />
          <input
            type="text"
            placeholder="Paste the DLD permit url"
            value={dldPermitUrl}
            onChange={(e) => onDldPermitUrlChange(e.target.value)}
            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
          />
        </div>
      </div>

      {showMonthlyRent && (
        <div>
          <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
            Monthly rental price
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="Enter the monthly rental price"
              value={monthlyRent}
              onChange={(e) => onMonthlyRentChange(e.target.value)}
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[52px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
            />
            <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#222]">
              AED
            </span>
          </div>
        </div>
      )}

      <div>
        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
          Maintenance fees
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Enter maintenance fees"
            value={maintenanceFees}
            onChange={(e) => onMaintenanceFeesChange(e.target.value)}
            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[42px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
          />
          <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#222]">
            %
          </span>
        </div>
      </div>

      <div>
        <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">
          Service charges
        </label>
        <div className="relative">
          <input
            type="text"
            placeholder="Enter service charges"
            value={serviceCharges}
            onChange={(e) => onServiceChargesChange(e.target.value)}
            className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] pr-[52px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
          />
          <span className="absolute right-[12px] top-1/2 -translate-y-1/2 text-[13px] text-[#222]">
            AED
          </span>
        </div>
      </div>
    </div>
  </div>
);

export default OtherDetails;
