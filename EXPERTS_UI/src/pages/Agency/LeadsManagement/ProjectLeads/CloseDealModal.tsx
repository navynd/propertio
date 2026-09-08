import { useEffect, useRef, useState } from "react";
import { CancelIcon, DownArrowIcon, PdfIcon, SearchIcon, TrashIcon, UploadIcon } from "../../../../components/CustomFile/icons";
import type { Country } from "../../../../data/countries";
import { countries } from "../../../../data/countries";
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const formatUploadedOn = (d: Date) => {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

interface CloseDealModalProps {
    isOpen: boolean;
    onClose: () => void;
    /** Called when user confirms in the second-step dialog */
    onConfirmClose?: () => void;
}

const CloseDealModal = ({ isOpen, onClose, onConfirmClose }: CloseDealModalProps) => {
    const documentInputRef = useRef<HTMLInputElement>(null);
    const [documentFile, setDocumentFile] = useState<{ file: File; uploadedAt: Date } | null>(null);
    const [documentError, setDocumentError] = useState<string | null>(null);
    const [showConfirmClose, setShowConfirmClose] = useState(false);
    const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedCountry, setSelectedCountry] = useState<Country>(countries.find(c => c.code === "AE") || countries[0]);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const filteredCountries = countries.filter(country =>
        country.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        country.dialCode.includes(searchQuery)
    );

    useEffect(() => {
        if (!isOpen) {
            setDocumentFile(null);
            setDocumentError(null);
            setShowConfirmClose(false);
        }
    }, [isOpen]);

    const validateAndSetDocument = (file: File | undefined) => {
        if (!file) return;
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
            setDocumentError("Please upload a PDF file only.");
            return;
        }
        if (file.size > MAX_DOCUMENT_BYTES) {
            setDocumentError("File size must not exceed 10MB.");
            return;
        }
        setDocumentError(null);
        setDocumentFile({ file, uploadedAt: new Date() });
    };

    const handleDocumentInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        validateAndSetDocument(e.target.files?.[0]);
        e.target.value = "";
    };

    const removeDocument = () => {
        setDocumentFile(null);
        setDocumentError(null);
        if (documentInputRef.current) documentInputRef.current.value = "";
    };

    if (!isOpen) return null;

    return (
        <div
            className={`fixed inset-0 z-[9999] flex bg-black/40 ${showConfirmClose ? "items-center justify-center p-5" : "justify-center md:items-center items-end"}`}
            onMouseDown={(event) => {
                if (event.target !== event.currentTarget) return;
                if (showConfirmClose) setShowConfirmClose(false);
                else onClose();
            }}
        >
            {!showConfirmClose ? (
                <div
                    className="relative bg-white w-full md:max-w-[723px] h-auto transform transition-all duration-300 rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-hidden"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="shrink-0 flex justify-end  p-[20px_20px_0px_20px] ">
                        <button
                            type="button"
                            onClick={onClose}
                            className="cursor-pointer h-[40px] w-[40px] rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white flex items-center justify-center"
                        >
                            <CancelIcon width={14} height={14} />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-[0px_20px] md:p-[0px_50px]">
                        <h2 className="text-center text-[20px] font-[Bold] text-[#222] leading-[1]">
                            Close the deal
                        </h2>
                        <div className="flex flex-col gap-[24px] mt-[35px]">
                            {/* Customer name */}
                            <div>
                                <label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">
                                    Customer name
                                </label>
                                <input
                                    type="text"
                                    placeholder="Enter customer name"
                                    className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] text-[#222] placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] focus:outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px]">
                                {/*Email*/}
                                <div className="flex-1">
                                    <label className="text-[14px] font-[Bold] text-[#222] block mb-[8px]">
                                        Email
                                    </label>
                                    <input
                                        type="text"
                                        placeholder="Enter email"
                                        className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] text-[#222] placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] focus:outline-none"
                                    />
                                </div>
                                {/*Phone number */}
                                <div className="flex-1">
                                    <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                        Phone number <span className="text-[#D4A373]">*</span>
                                    </label>
                                    <div className="flex items-center gap-[10px]">
                                        {/* Country Code */}
                                        <div className="relative" ref={dropdownRef}>
                                            <div
                                                className="flex items-center gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] bg-white cursor-pointer select-none"
                                                onClick={() => {
                                                    setIsCountryDropdownOpen(!isCountryDropdownOpen);
                                                    if (!isCountryDropdownOpen) setSearchQuery("");
                                                }}
                                            >
                                                <img src={selectedCountry.flag} alt={selectedCountry.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                                                <DownArrowIcon className={`mt-[2px] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
                                            </div>

                                            {isCountryDropdownOpen && (
                                                <div className="absolute top-[50px] left-0 w-[260px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
                                                    {/* Search Box */}
                                                    <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                                                        <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                                                            <SearchIcon className="text-[#707070] shrink-0" />
                                                            <input
                                                                type="text"
                                                                placeholder="Search country..."
                                                                className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                                                                value={searchQuery}
                                                                onChange={(e) => setSearchQuery(e.target.value)}
                                                            />
                                                        </div>
                                                    </div>
                                                    <div className="overflow-y-auto overflow-x-hidden flex-1 py-[8px]">
                                                        {filteredCountries.length > 0 ? filteredCountries.map((country) => (
                                                            <div
                                                                key={country.id}
                                                                className={`flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5] ${selectedCountry.id === country.id ? "bg-[#F5F5F5]" : ""}`}
                                                                onClick={() => {
                                                                    setSelectedCountry(country);
                                                                    setIsCountryDropdownOpen(false);
                                                                    setSearchQuery("");
                                                                }}
                                                            >
                                                                <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0" />
                                                                <span className="text-[13px] font-[Medium] text-[#222] truncate">{country.name} ({country.dialCode})</span>
                                                            </div>
                                                        )) : (
                                                            <div className="p-[14px] text-[13px] text-[#707070] text-center">No countries found</div>
                                                        )}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        {/* Phone Number */}
                                        <div className="relative flex-1">
                                            <input
                                                type="text"
                                                defaultValue="1234 5678 5885"
                                                className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none"
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">
                                    Deal amount
                                </label>
                                <div className="relative flex-1">
                                    <input
                                        type="text"
                                        placeholder="Enter deal amount"
                                        className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular]"
                                    />
                                    <div className="px-[10px] h-[34px] flex items-center absolute right-[7px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#222] text-[14px] font-[Regular]">
                                        AED
                                    </div>
                                </div>
                            </div>
                            {/* Upload the document */}
                            <div>
                                <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                                    Upload the document
                                </label>
                                <input
                                    ref={documentInputRef}
                                    type="file"
                                    accept=".pdf,application/pdf"
                                    className="hidden"
                                    onChange={handleDocumentInputChange}
                                />
                                {!documentFile ? (
                                    <div
                                        role="button"
                                        tabIndex={0}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                documentInputRef.current?.click();
                                            }
                                        }}
                                        onDragOver={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                        }}
                                        onDrop={(e) => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            validateAndSetDocument(e.dataTransfer.files?.[0]);
                                        }}
                                        onClick={() => documentInputRef.current?.click()}
                                        className="rounded-[15px] border border-dashed border-[rgba(34,34,34,0.30)] min-h-[200px] flex flex-col items-center justify-center text-center md:p-[40px] p-[24px] cursor-pointer bg-white"
                                    >
                                        <UploadIcon width={52} height={52} />
                                        <p className="text-[13px] font-[Medium] text-[#222] mt-[16px]">
                                            Select a file or drag and drop here
                                        </p>
                                        <p className="text-[12px] font-[Regular] text-[#707070] mt-[8px]">
                                            PDF file only. size no more than 10MB
                                        </p>
                                        <button
                                            type="button"
                                            onClick={(ev) => {
                                                ev.stopPropagation();
                                                documentInputRef.current?.click();
                                            }}
                                            className="mt-[20px] h-[34px] px-[16px] rounded-[10px] bg-[#0832AE] text-white text-[12px] font-[SemiBold]"
                                        >
                                            Select File
                                        </button>
                                        {documentError && (
                                            <p className="mt-[12px] text-[12px] font-[Regular] text-[#D4A373]">{documentError}</p>
                                        )}
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex items-center gap-[12px] rounded-[12px] border border-[rgba(34,34,34,0.08)] bg-white px-[14px] py-[12px] shadow-[0_2px_12px_rgba(0,0,0,0.06)]">
                                            <span className="shrink-0 inline-flex">
                                                <PdfIcon width={28} height={28} />
                                            </span>
                                            <div className="min-w-0 flex-1">
                                                <p className="text-[15px] font-[Bold] text-[#222] truncate">{documentFile.file.name}</p>
                                                <p className="text-[12px] font-[Regular] text-[#707070] mt-[4px]">
                                                    Uploaded on {formatUploadedOn(documentFile.uploadedAt)}
                                                </p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={removeDocument}
                                                className="cursor-pointer shrink-0 h-[36px] w-[36px] rounded-[10px] bg-[rgba(34,34,34,0.08)] flex items-center justify-center hover:bg-[rgba(34,34,34,0.12)] transition-colors"
                                                aria-label="Remove document"
                                            >
                                                <TrashIcon width={18} height={18} />
                                            </button>
                                        </div>
                                        {documentError && (
                                            <p className="mt-[8px] text-[12px] font-[Regular] text-[#D4A373]">{documentError}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="shrink-0  p-[20px_20px_20px_20px] md:p-[30px_50px_60px_50px]">
                        <button
                            type="button"
                            onClick={() => setShowConfirmClose(true)}
                            className="h-[44px] w-full rounded-[10px] bg-[#D4A373] text-white text-[14px] font-[Bold] transition-opacity hover:opacity-90"
                        >
                            Close the deal
                        </button>
                    </div>
                </div>
            ) : (
                <div
                    className="relative w-full max-w-[550px] rounded-t-[15px] md:rounded-[15px] bg-white"
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="flex justify-end p-[20px_20px_0px_20px]">
                        <button
                            type="button"
                            onClick={() => setShowConfirmClose(false)}
                            className="cursor-pointer h-[36px] w-[36px] rounded-[10px] border border-[rgba(34,34,34,0.15)] bg-white flex items-center justify-center shrink-0"
                            aria-label="Close"
                        >
                            <CancelIcon width={12} height={12} />
                        </button>
                    </div>
                    <div className="p-[0px_20px_20px_20px] md:p-[0px_50px_50px_50px]">
                        <p className="text-center text-[15px] md:text-[20px] font-[Bold] text-[#222] leading-[150%] px-1">
                            Are you sure you want to close the inquiry?
                        </p>
                        <div className="mt-8 flex items-center justify-center gap-3">
                            <button
                                type="button"
                                onClick={() => setShowConfirmClose(false)}
                                className="h-[44px] px-[20px] w-auto rounded-[10px] border border-[#222] bg-white text-[14px] font-[Bold] text-[#222] cursor-pointer"
                            >
                                No
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    onConfirmClose?.();
                                    setShowConfirmClose(false);
                                    onClose();
                                }}
                                className="h-[44px] px-[20px] w-auto rounded-[10px] bg-[#D4A373] text-[14px] font-[Bold] text-white cursor-pointer"
                            >
                                Yes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CloseDealModal;
