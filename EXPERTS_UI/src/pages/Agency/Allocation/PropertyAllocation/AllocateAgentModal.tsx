import { useEffect, useRef, useState } from "react";
import {
  CancelIcon,
  DownArrowIcon,
  PdfIcon,
  TrashIcon,
  UploadIcon,
} from "../../../../components/CustomFile/icons";
import mainbg from "../../../../assets/img/mainbg.png";
import {
  agencyService,
  type SortByProjectMasterItem,
} from "../../../../services/agencyService";
import { toast } from "../../../../services/toast";
import { API_BASE_URL, getApiErrorMessage } from "../../../../services/apiClient";
import Loader from "../../../../components/Loader/loader";
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

const formatUploadedOn = (d: Date) => {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
};
interface AgentType {
  _id: string;
  name: string;
  value?: string;
}

interface AllocateAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
  allocationId?: string | null;
  onSuccess?: () => void;
  /** Prefill agent dropdown (e.g. from Super Agent detail → Allocate Property). */
  initialAgentId?: string | null;
  initialAgentName?: string | null;
  /** Master-data display name for agent type (e.g. "Super agent"). */
  initialAgentTypeName?: string | null;
  /** DB value for agent type (e.g. `agent` | `superagent`). */
  initialAgentTypeValue?: string | null;
}

const resolveAgentTypeDisplayName = (
  options: AgentType[],
  value?: string | null,
  displayName?: string | null,
): string => {
  if (displayName?.trim()) {
    const byName = options.find(
      (o) => o.name.toLowerCase() === displayName.trim().toLowerCase(),
    );
    if (byName) return byName.name;
  }
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/-/g, "");
  if (!normalized) return "";
  const byValue = options.find(
    (o) =>
      String(o.value ?? "")
        .toLowerCase()
        .replace(/-/g, "") === normalized,
  );
  return byValue?.name ?? "";
};

const getAgentTypeFilterValue = (
  options: AgentType[],
  selectedName: string,
): string | undefined => {
  if (!selectedName.trim()) return undefined;
  const match = options.find((o) => o.name === selectedName);
  return match?.value ? String(match.value) : undefined;
};

const AllocateAgentModal = ({
  isOpen,
  onClose,
  allocationId,
  onSuccess,
  initialAgentId,
  initialAgentName,
  initialAgentTypeName,
  initialAgentTypeValue,
}: AllocateAgentModalProps) => {
  const [agentType, setAgentType] = useState("");
  const [availableAgent, setAvailableAgent] = useState("");
  const [isAgentTypeDropdownOpen, setIsAgentTypeDropdownOpen] = useState(false);
  const [isAvailableAgentDropdownOpen, setIsAvailableAgentDropdownOpen] =
    useState(false);
  const agentTypeDropdownRef = useRef<HTMLDivElement>(null);
  const availableAgentDropdownRef = useRef<HTMLDivElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [documentFile, setDocumentFile] = useState<{
    file: File;
    uploadedAt: Date;
  } | null>(null);
  const [documentError, setDocumentError] = useState<string | null>(null);
  const isEditMode = Boolean(allocationId);
  const [existingDocument, setExistingDocument] = useState("");
  const [agentTypeOptions, setAgentTypeOptions] = useState<AgentType[]>([]);

  const [propertyTitle, setPropertyTitle] = useState("");
  const [selectedAgentId, setSelectedAgentId] = useState("");
  const [allocating, setAllocating] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(false);
  const showModalLoader = allocating || loadingAgents;

  useEffect(() => {
    if (!allocationId || !isOpen) return;

    const fetchAllocationDetails = async () => {
      try {
        setAllocating(true);

        const res: any = await agencyService.getAllocationById(allocationId);

        const allocation =
          res?.data?.allocation || res?.allocation || res?.data;

        if (!allocation) {
          return;
        }

        setPropertyTitle(allocation.title || "");

        setAvailableAgent(allocation.agent?.name || "");

        setSelectedAgentId(allocation.agent?.id || allocation.agent?._id || "");

        setExistingDocument(allocation.document || "");

        // OPTIONAL
        // API may return agentType as a string (e.g. "agent" | "superagent")
        setAgentType(
          allocation.agent?.agentType?.name ||
            allocation.agent?.agentType ||
            "",
        );
      } catch (err) {
        console.error(err);
        toast.error(
          "Failed to load allocation details",
          getApiErrorMessage(err, "Please try again."),
        );
      } finally {
        setAllocating(false);
      }
    };

    fetchAllocationDetails();
  }, [allocationId, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setDocumentFile(null);
      setDocumentError(null);

      setPropertyTitle("");
      setAgentType("");
      setAvailableAgent("");
      setSelectedAgentId("");
      setExistingDocument("");
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || isEditMode) return;
    if (!initialAgentId) return;

    const typeName = resolveAgentTypeDisplayName(
      agentTypeOptions,
      initialAgentTypeValue,
      initialAgentTypeName,
    );
    if (typeName) {
      setAgentType(typeName);
    }
    if (initialAgentName?.trim()) {
      setAvailableAgent(initialAgentName.trim());
    }
    setSelectedAgentId(String(initialAgentId));
  }, [
    isOpen,
    isEditMode,
    initialAgentId,
    initialAgentName,
    initialAgentTypeName,
    initialAgentTypeValue,
    agentTypeOptions,
  ]);

  useEffect(() => {
    if (!isOpen) return;

    const typeFilter =
      getAgentTypeFilterValue(agentTypeOptions, agentType) ||
      (initialAgentTypeValue
        ? String(initialAgentTypeValue).trim() || undefined
        : undefined);

    const fetchAgents = async () => {
      try {
        setLoadingAgents(true);

        const res: any = await agencyService.getAgents({
          isDropdown: true,
          tab: "all",
          page: 1,
          limit: 100,
          ...(typeFilter ? { agentType: typeFilter } : {}),
        });

        setAgents(res?.agents || []);
      } catch (err) {
        console.error("Failed to load agents", err);
        toast.error(
          "Failed to load agents",
          getApiErrorMessage(err, "Please refresh and try again."),
        );
      } finally {
        setLoadingAgents(false);
      }
    };

    void fetchAgents();
  }, [isOpen, agentType, agentTypeOptions, initialAgentTypeValue]);

  useEffect(() => {
    let isMounted = true;

    const loadMasterData = async () => {
      try {
        const res = await agencyService.getMasterData([
          "listingtypes",
          "sortbyproject",
          "supportedurls",
          "jobtitles",
          "agenttypes",
          "languages",
          "countries",
          "agentexperience",
        ]);

        if (!isMounted) return;

        /** ---------------- Agent Types ---------------- */
        const agentTypes = res?.agentTypes || [];
        setAgentTypeOptions(agentTypes);
      } catch (err) {
        console.error("Master data error:", err);
      }
    };

    loadMasterData();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleAllocate = async () => {
    try {
      if (!propertyTitle.trim()) {
        toast.error("Property title required", "Enter a title for this property.");
        return;
      }

      if (!selectedAgentId) {
        toast.error("Please select an agent", "Choose an agent before saving changes.");
        return;
      }

      if (!documentFile?.file && !existingDocument) {
        toast.error("Document required", "Upload a document or keep the existing one.");
        return;
      }

      setAllocating(true);

      let res;

      if (isEditMode) {
        res = await agencyService.updateAllocation(allocationId!, {
          agentId: selectedAgentId,
          title: propertyTitle,
        });
      } else {
        res = await agencyService.allocateProperty({
          agentId: selectedAgentId,
          title: propertyTitle,
          document: documentFile?.file,
        });
      }
      const detail =
        res?.message ||
        (isEditMode
          ? "Allocation updated successfully."
          : "Property allocated successfully.");
      toast.success(isEditMode ? "Allocation updated" : "Property allocated", detail);

      onSuccess?.();

      onClose();
    } catch (err: any) {
      console.error(err);

      toast.error(
        isEditMode ? "Update failed" : "Allocation failed",
        err?.message ||
          (isEditMode
            ? "Could not update this allocation."
            : "Could not allocate this property."),
      );
    } finally {
      setAllocating(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        agentTypeDropdownRef.current &&
        !agentTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAgentTypeDropdownOpen(false);
      }
      if (
        availableAgentDropdownRef.current &&
        !availableAgentDropdownRef.current.contains(event.target as Node)
      ) {
        setIsAvailableAgentDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setDocumentFile(null);
      setDocumentError(null);
    }
  }, [isOpen]);

  const validateAndSetDocument = (file: File | undefined) => {
    if (!file) return;
    const isPdf =
      file.type === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
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

  const handleDocumentInputChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    validateAndSetDocument(e.target.files?.[0]);
    e.target.value = "";
  };

  const removeDocument = () => {
    setDocumentFile(null);
    setExistingDocument("");
    setDocumentError(null);

    if (documentInputRef.current) {
      documentInputRef.current.value = "";
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 flex justify-center md:items-center items-end z-[9999]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="relative bg-white w-full md:max-w-[480px] h-auto transform transition-all duration-300 rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="shrink-0 flex justify-end  p-[20px_20px_0px_20px] ">
          <button
            type="button"
            onClick={onClose}
            disabled={showModalLoader}
            className="cursor-pointer h-[40px] w-[40px] rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white flex items-center justify-center"
          >
            <CancelIcon width={14} height={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[0px_20px] md:p-[0px_50px_10px_50px]">
          <h2 className="text-center text-[20px] font-[Bold] text-[#222] leading-[1]">
            Allocate to agent/superagent
          </h2>
          <div className="flex flex-col gap-[24px] mt-[35px]">
            {/* Property */}
            <div>
              <label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">
                Property
              </label>
              <input
                type="text"
                value={propertyTitle}
                onChange={(e) => setPropertyTitle(e.target.value)}
                placeholder="Enter property name"
                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] text-[#222] placeholder:text-[#707070] placeholder:text-[13px] placeholder:font-[Regular] focus:outline-none"
              />
            </div>
            {/* Agent type */}
            <div ref={agentTypeDropdownRef} className="relative">
              <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                Agent type
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAgentTypeDropdownOpen((prev) => !prev);
                  setIsAvailableAgentDropdownOpen(false);
                }}
                className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between text-left"
              >
                <span
                  className={`text-[14px] font-[Regular] ${agentType ? "text-[#222]" : "text-[#707070]"}`}
                >
                  {agentType || "Select agent type"}
                </span>
                <DownArrowIcon
                  width={11}
                  height={7}
                  className={`transition-transform ${isAgentTypeDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isAgentTypeDropdownOpen && (
                <div className="absolute top-[80px] left-0 w-full z-20 max-h-[160px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                  {agentTypeOptions.map((option) => (
                    <button
                      key={option._id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();
                        setAgentType(option.name);
                        setAvailableAgent("");
                        setSelectedAgentId("");
                        setIsAgentTypeDropdownOpen(false);
                      }}
                      className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${agentType === option.name ? "text-[#EA3934] bg-[#FDF2F2]" : "text-[#222]"}`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {/* Available agent */}
            <div ref={availableAgentDropdownRef} className="relative">
              <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">
                Available agent
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsAvailableAgentDropdownOpen((prev) => !prev);
                  setIsAgentTypeDropdownOpen(false);
                }}
                className="cursor-pointer h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] flex items-center justify-between text-left"
              >
                <span
                  className={`text-[14px] font-[Regular] ${availableAgent ? "text-[#222]" : "text-[#707070]"}`}
                >
                  {availableAgent || "Select available agent"}
                </span>
                <DownArrowIcon
                  width={11}
                  height={7}
                  className={`transition-transform ${isAvailableAgentDropdownOpen ? "rotate-180" : ""}`}
                />
              </button>
              {isAvailableAgentDropdownOpen && (
                <div className="absolute top-[80px] left-0 w-full z-20 max-h-[160px] overflow-y-auto bg-white border border-[rgba(34,34,34,0.10)] rounded-[10px] shadow-[0_6px_16px_rgba(0,0,0,0.12)] py-[6px]">
                  {agents.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onMouseDown={(event) => {
                        event.preventDefault();

                        setAvailableAgent(option.name);
                        setSelectedAgentId(option._id || option.id);

                        setIsAvailableAgentDropdownOpen(false);
                      }}
                      className={`w-full text-left px-[14px] py-[9px] text-[14px] font-[Medium] hover:bg-[#F5F5F5] ${availableAgent === option.name ? "text-[#EA3934] bg-[#FDF2F2]" : "text-[#222]"}`}
                    >
                      {option.name}
                    </button>
                  ))}
                </div>
              )}
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
              {!documentFile && !existingDocument ? (
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
                    <p className="mt-[12px] text-[12px] font-[Regular] text-[#EA3934]">
                      {documentError}
                    </p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-[12px] rounded-[12px] bg-white px-[14px] py-[12px] shadow-[0_-1px_18px_0px_rgba(0,0,0,0.10)]">
                    <span className="shrink-0 inline-flex">
                      <PdfIcon width={28} height={28} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15px] font-[Bold] text-[#222] truncate">
                        {" "}
                        {documentFile?.file?.name ||
                          existingDocument?.split("/").pop()}
                      </p>
                      {documentFile && (
                        <p className="text-[12px] font-[Regular] text-[#707070] mt-[4px]">
                          Uploaded on{" "}
                          {formatUploadedOn(documentFile.uploadedAt)}
                        </p>
                      )}
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
                    <p className="mt-[8px] text-[12px] font-[Regular] text-[#EA3934]">
                      {documentError}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {showModalLoader && (
          <div
            className="absolute inset-0 z-[100] bg-white/70 flex items-center justify-center"
            onMouseDown={(e) => {
              // Prevent closing dropdowns / interacting while loading.
              e.stopPropagation();
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <Loader size={72} margin={0} />
              <p className="text-[13px] font-[Regular] text-[#707070]">
                {loadingAgents
                  ? "Loading agents…"
                  : isEditMode
                    ? "Loading allocation…"
                    : "Loading…"}
              </p>
            </div>
          </div>
        )}

        <div className="shrink-0  p-[20px_20px_20px_20px] md:p-[30px_50px_60px_50px]">
          <button
            type="button"
            onClick={handleAllocate}
            disabled={allocating}
            className="h-[44px] w-full rounded-[10px] bg-[#EA3934] text-white text-[14px] font-[Bold]"
          >
            save changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default AllocateAgentModal;
