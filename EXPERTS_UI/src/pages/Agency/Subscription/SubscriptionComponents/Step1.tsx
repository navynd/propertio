import { useEffect, useRef, useState } from "react";
import { DownArrowIcon, SearchIcon } from "../../../../components/CustomFile/icons";
import { countries } from "../../../../data/countries";

type Step1Props = {
    onNext: () => void;
    onCancel: () => void;
};
const labelClassName = "mb-[6px] text-[14px] font-[SemiBold] text-[#222]";
const inputClassName = "h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] bg-white px-[12px] text-[13px] font-[Regular] text-[#222] placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] focus:outline-none";
const Step1 = ({ onNext, onCancel }: Step1Props) => {
    const countryDropdownRef = useRef<HTMLDivElement>(null);
    const mobileCountryDropdownRef = useRef<HTMLDivElement>(null);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [isMobileCountryDropdownOpen, setIsMobileCountryDropdownOpen] = useState(false);
    const [countrySearchQuery, setCountrySearchQuery] = useState("");
    const [mobileCountrySearchQuery, setMobileCountrySearchQuery] = useState("");
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [email, setEmail] = useState("");
    const [mobileNumber, setMobileNumber] = useState("");
    const [street, setStreet] = useState("");
    const [countryCode, setCountryCode] = useState("AE");
    const [mobileCountryCode, setMobileCountryCode] = useState("AE");
    const [pincode, setPincode] = useState("");
    const [saveForFuture, setSaveForFuture] = useState(false);
    const selectedCountry = countries.find((country) => country.code === countryCode) ?? countries[0];
    const selectedMobileCountry = countries.find((country) => country.code === mobileCountryCode) ?? countries[0];
    const filteredCountries = countries.filter((country) =>
        country.name.toLowerCase().includes(countrySearchQuery.toLowerCase()),
    );
    const filteredMobileCountries = countries.filter((country) =>
        country.name.toLowerCase().includes(mobileCountrySearchQuery.toLowerCase()) ||
        country.dialCode.includes(mobileCountrySearchQuery),
    );

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
                setIsCountryDropdownOpen(false);
            }
            if (mobileCountryDropdownRef.current && !mobileCountryDropdownRef.current.contains(event.target as Node)) {
                setIsMobileCountryDropdownOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    return (
        <div className="mx-auto w-full max-w-[1220px]">
            <div className="mx-auto w-full max-w-[520px] ">
                <h2 className="mb-[30px] text-center text-[20px] font-[Bold] text-[#222]">Basic information</h2>
                <div className="flex flex-col gap-[30px] rounded-[15px] bg-white p-[18px] md:p-[30px]">
                    <div className="grid grid-cols-1 gap-[30px] sm:grid-cols-2 ">
                        {/* first name */}
                        <div>
                            <p className={labelClassName}>First name</p>
                            <input
                                type="text"
                                placeholder="Enter first name"
                                value={firstName}
                                onChange={(event) => setFirstName(event.target.value)}
                                className={inputClassName}
                            />
                        </div>
                        {/* last name */}
                        <div>
                            <p className={labelClassName}>Last name</p>
                            <input
                                type="text"
                                placeholder="Enter last name"
                                value={lastName}
                                onChange={(event) => setLastName(event.target.value)}
                                className={inputClassName}
                            />
                        </div>
                    </div>
                    {/* email address */}
                    <div className="">
                        <p className={labelClassName}>Email Address</p>
                        <input
                            type="email"
                            placeholder="Enter email address"
                            value={email}
                            onChange={(event) => setEmail(event.target.value)}
                            className={inputClassName}
                        />
                    </div>
                    {/*Mobile number */}
                    <div className="">
                        <p className={labelClassName}>Mobile No.</p>
                        <div className="flex gap-[10px] bg-white rounded-[10px] h-[44px] items-center">
                            <div className="relative h-full" ref={mobileCountryDropdownRef}>
                                <div
                                    className="flex items-center gap-[6px] p-[0px_30px_0px_10px] cursor-pointer h-full border border-[#EAEAEA] rounded-[10px]"
                                    onClick={() => setIsMobileCountryDropdownOpen(!isMobileCountryDropdownOpen)}
                                >
                                    <img src={selectedMobileCountry.flag} alt={selectedMobileCountry.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                    <DownArrowIcon className={`flex-shrink-0 mt-[2px] transition-transform ${isMobileCountryDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
                                </div>

                                {isMobileCountryDropdownOpen && (
                                    <div className="absolute top-[50px] left-0 w-[260px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
                                        <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                                            <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                                                <SearchIcon className="text-[#707070] shrink-0" />
                                                <input
                                                    type="text"
                                                    placeholder="Search country..."
                                                    className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                                                    value={mobileCountrySearchQuery}
                                                    onChange={(event) => setMobileCountrySearchQuery(event.target.value)}
                                                />
                                            </div>
                                        </div>
                                        <div className="overflow-y-auto flex-1 p-[6px] scrollbar-hide">
                                            {filteredMobileCountries.length > 0 ? filteredMobileCountries.map((country) => (
                                                <div
                                                    key={country.id}
                                                    className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] rounded-[8px] ${selectedMobileCountry.id === country.id ? "bg-[#F5F5F5]" : ""}`}
                                                    onClick={() => {
                                                        setMobileCountryCode(country.code);
                                                        setIsMobileCountryDropdownOpen(false);
                                                        setMobileCountrySearchQuery("");
                                                    }}
                                                >
                                                    <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                                    <span className="text-[13px] font-[Regular] text-[#222]">{country.name}</span>
                                                    <span className="text-[13px] font-[Medium] text-[#707070] ml-auto">{country.dialCode}</span>
                                                </div>
                                            )) : (
                                                <div className="px-[14px] py-[12px] text-center text-[13px] text-[#707070]">No countries found</div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <input
                                type="text"
                                placeholder="Enter mobile number"
                                value={mobileNumber}
                                onChange={(event) => setMobileNumber(event.target.value)}
                                className={inputClassName}
                            />
                        </div>
                    </div>
                    {/* street */}
                    <div className="">
                        <p className={labelClassName}>Street</p>
                        <input
                            type="text"
                            placeholder="Enter Street name"
                            value={street}
                            onChange={(event) => setStreet(event.target.value)}
                            className={inputClassName}
                        />
                    </div>
                    {/* country */}
                    <div className="">
                        <p className={labelClassName}>Country</p>
                        <div className="relative" ref={countryDropdownRef}>
                            <div
                                className={inputClassName + " flex items-center justify-between cursor-pointer"}
                                onClick={() => setIsCountryDropdownOpen(!isCountryDropdownOpen)}
                            >
                                <span className="text-[#222]">{selectedCountry.name}</span>
                                <DownArrowIcon
                                    className={`transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`}
                                    width={12}
                                    height={12}
                                    fill="#707070"
                                />
                            </div>
                            {isCountryDropdownOpen && (
                                <div className="absolute top-[46px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[260px] overflow-hidden flex flex-col">
                                    <div className="p-[8px] border-b border-[#EAEAEA]">
                                        <div className="flex items-center gap-[8px] bg-[#F5F5F5] rounded-[8px] px-[10px] h-[38px]">
                                            <SearchIcon className="text-[#707070] shrink-0" />
                                            <input
                                                type="text"
                                                placeholder="Search country..."
                                                value={countrySearchQuery}
                                                onChange={(event) => setCountrySearchQuery(event.target.value)}
                                                className="w-full bg-transparent text-[12px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                                            />
                                        </div>
                                    </div>
                                    <div className="overflow-y-auto p-[6px] scrollbar-hide">
                                        {filteredCountries.length > 0 ? (
                                            filteredCountries.map((country) => (
                                                <div
                                                    key={country.id}
                                                    className={`px-[14px] py-[10px] cursor-pointer rounded-[8px] hover:bg-[#F5F5F5] ${countryCode === country.code ? "bg-[#F5F5F5]" : ""}`}
                                                    onClick={() => {
                                                        setCountryCode(country.code);
                                                        setIsCountryDropdownOpen(false);
                                                        setCountrySearchQuery("");
                                                    }}
                                                >
                                                    <span className="text-[13px] font-[Regular] text-[#222]">{country.name}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="px-[14px] py-[12px] text-center text-[13px] text-[#707070]">
                                                No countries found
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    {/* pincode */}
                    <div className="">
                        <p className={labelClassName}>Pincode</p>
                        <input
                            type="text"
                            placeholder="Enter Pincode"
                            value={pincode}
                            onChange={(event) => setPincode(event.target.value)}
                            className={inputClassName}
                        />
                    </div>

                    {/* save for future */}
                    <label className=" inline-flex cursor-pointer items-center gap-[8px]">
                        <input
                            type="checkbox"
                            checked={saveForFuture}
                            onChange={(event) => setSaveForFuture(event.target.checked)}
                            className="h-[13px] w-[13px] rounded border border-[rgba(34,34,34,0.20)]"
                        />
                        <span className="text-[12px] font-[Regular] text-[#707070]">Save this address for future use</span>
                    </label>
                    {/* cancel and next button */}
                    <div className="mt-[10px] grid grid-cols-2 gap-[10px]">
                        <button
                            type="button"
                            onClick={onCancel}
                            className="h-[43px] rounded-[10px] border border-[#222] text-[13px] font-[SemiBold] text-[#222] cursor-pointer"
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            onClick={onNext}
                            className="h-[43px] rounded-[10px] bg-[#D4A373] text-[13px] font-[SemiBold] text-white cursor-pointer"
                        >
                            Next
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Step1;