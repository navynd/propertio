import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import profileimg from "../../../assets/img/profileless.png";
import { DownArrowIcon, SearchIcon, VerifiedIcon, PdfIcon, DownloadIcon } from "../../../assets/icons";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage, isAbortError } from "../../../services/apiClient";
import { agenciesService } from "../../../services/agenciesService";
import type { AdminAgencyDetail, CountryOption, UpdateAgencyPayload } from "../../../types/api";

type FormState = {
  agencyName: string; email: string; orn: string; website: string; foundedYear: string; phoneNumber: string;
  countryId: string; address: string; aboutUs: string; isActive: boolean; emailNotifications: boolean; pushNotifications: boolean;
};
const initialState: FormState = { agencyName: "", email: "", orn: "", website: "", foundedYear: "", phoneNumber: "", countryId: "", address: "", aboutUs: "", isActive: true, emailNotifications: true, pushNotifications: true };

const splitPhoneNumber = (value: string, countries: CountryOption[]) => {
  const normalized = String(value || "").trim();
  if (!normalized) return { dialCode: "", local: "" };
  const sorted = [...countries]
    .map((c) => c.dialCode)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);
  const matched = sorted.find((code) => normalized.startsWith(code));
  if (!matched) return { dialCode: "", local: normalized };
  const local = normalized.slice(matched.length).replace(/^\s+/, "");
  return { dialCode: matched, local };
};

const isVerifiedFlag = (value: unknown): boolean =>
  value === true || (typeof value === "string" && value.toLowerCase() === "true");

export default function AgencyAccountDetail() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [searchParams] = useSearchParams();
  const agencyId = searchParams.get("id")?.trim() || "";
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [agency, setAgency] = useState<AdminAgencyDetail | null>(null);
  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [form, setForm] = useState<FormState>(initialState);
  const [isPhoneDropdownOpen, setIsPhoneDropdownOpen] = useState(false);
  const [isCountryDropdownOpen, setIsCountryDropdownOpen] = useState(false);
  const [phoneSearchQuery, setPhoneSearchQuery] = useState("");
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [selectedPhoneCountry, setSelectedPhoneCountry] = useState<CountryOption | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(null);
  const [agencyDocBaseUrl, setAgencyDocBaseUrl] = useState("");
  const phoneDropdownRef = useRef<HTMLDivElement>(null);
  const countryDropdownRef = useRef<HTMLDivElement>(null);

  const avatarSrc = useMemo(() => {
    const raw = (agency?.profilePicture || "").trim();
    if (!raw || raw.toLowerCase().includes("profileless.png")) return profileimg;
    if (/^https?:\/\//i.test(raw)) return raw;
    return agency?.profilePictureUrl || profileimg;
  }, [agency?.profilePicture, agency?.profilePictureUrl]);

  const isEmailVerified = useMemo(
    () => isVerifiedFlag((agency as unknown as Record<string, unknown> | null)?.isEmailVerified),
    [agency]
  );
  const isPhoneVerified = useMemo(() => {
    const source = agency as unknown as Record<string, unknown> | null;
    return isVerifiedFlag(source?.isPhoneVerified) || isVerifiedFlag(source?.isPhoneNumberVerified);
  }, [agency]);

  const isAgencyVerified = useMemo(() => Boolean(agency?.isVerified), [agency?.isVerified]);

  const isApprovalPending = useMemo(
    () =>
      String(agency?.invitationStatus || "").toLowerCase() === "accepted" &&
      !Boolean(agency?.isVerified),
    [agency?.invitationStatus, agency?.isVerified]
  );

  const filteredPhoneCountries = useMemo(
    () =>
      countries.filter(
        (country) =>
          country.name.toLowerCase().includes(phoneSearchQuery.toLowerCase()) ||
          country.dialCode.includes(phoneSearchQuery)
      ),
    [countries, phoneSearchQuery]
  );

  const filteredCountries = useMemo(
    () =>
      countries.filter((country) =>
        country.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
      ),
    [countries, countrySearchQuery]
  );

  const formatDateTime = (value?: string | null) => {
    if (!value) return "—";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const registrationDocument = useMemo(() => {
    const firstDoc = agency?.registrationDocuments?.[0] || "";
    const hasDocument = Boolean(firstDoc);
    const name = firstDoc.split("/").pop() || "—";
    const url = !hasDocument
      ? null
      : /^https?:\/\//i.test(firstDoc)
        ? firstDoc
        : `${(agencyDocBaseUrl || "").replace(/\/+$/, "")}/${encodeURIComponent(firstDoc)}`;
    return {
      hasDocument,
      name,
      url,
      uploadedOn: hasDocument ? formatDateTime(agency?.createdAt) : "",
    };
  }, [agency, agencyDocBaseUrl]);

  useEffect(() => {
    let mounted = true;
    const controller = new AbortController();
    const load = async () => {
      if (!agencyId) { setLoading(false); return; }
      setLoading(true);
      try {
        const [details, countryList, urls] = await Promise.all([
          agenciesService.getAgencyById(agencyId, controller.signal),
          agenciesService.listMasterCountries(controller.signal),
          agenciesService.getSupportedUrls(controller.signal),
        ]);
        if (!mounted) return;
        const nextAgency = details.agency;
        const phoneSplit = splitPhoneNumber(
          nextAgency?.phoneNumber || "",
          countryList
        );
        const nationalityId = nextAgency?.nationality?._id || "";
        const matchedCountry =
          countryList.find((c) => (c._id || "") === nationalityId) ||
          countryList.find((c) => c.dialCode === phoneSplit.dialCode) ||
          countryList.find((c) => c.code === "AE") ||
          countryList[0] ||
          null;
        setAgency(nextAgency);
        setCountries(countryList);
        setAgencyDocBaseUrl((urls.supportedUrls?.agencyUrl?.doc || "").trim());
        setSelectedCountry(matchedCountry);
        setSelectedPhoneCountry(matchedCountry);
        setForm({
          agencyName: nextAgency?.agencyName || "",
          email: nextAgency?.email || "",
          orn: nextAgency?.orn || "",
          website: nextAgency?.website || "",
          foundedYear: nextAgency?.foundedYear ? String(nextAgency.foundedYear) : "",
          phoneNumber:
            nextAgency?.phoneNumberWithoutCode || phoneSplit.local || nextAgency?.phoneNumber || "",
          countryId: nationalityId,
          address: nextAgency?.address?.fullAddress || "",
          aboutUs: nextAgency?.aboutUs || nextAgency?.description || "",
          isActive: Boolean(nextAgency?.isActive),
          emailNotifications: Boolean(nextAgency?.preferences?.notificationSettings?.email),
          pushNotifications: Boolean(nextAgency?.preferences?.notificationSettings?.push),
        });
      } catch (err) {
        if (isAbortError(err)) return;
        push({ type: "error", title: "Failed to load agency", description: getApiErrorMessage(err, "Unable to load agency details.") });
      } finally {
        if (mounted) setLoading(false);
      }
    };
    void load();
    return () => { mounted = false; controller.abort(); };
  }, [agencyId, push]);

  useEffect(() => {
    if (!countries.length) return;
    if (!selectedPhoneCountry) {
      setSelectedPhoneCountry(countries.find((c) => c.code === "AE") || countries[0]);
    }
    if (!selectedCountry) {
      setSelectedCountry(countries.find((c) => c.code === "AE") || countries[0]);
    }
  }, [countries, selectedCountry, selectedPhoneCountry]);

  useEffect(() => {
    if (!countries.length) return;
    const byId = countries.find((c) => (c._id || "") === form.countryId);
    if (byId) {
      setSelectedCountry(byId);
      if (!selectedPhoneCountry) setSelectedPhoneCountry(byId);
    }
  }, [countries, form.countryId, selectedPhoneCountry]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (phoneDropdownRef.current && !phoneDropdownRef.current.contains(event.target as Node)) {
        setIsPhoneDropdownOpen(false);
      }
      if (countryDropdownRef.current && !countryDropdownRef.current.contains(event.target as Node)) {
        setIsCountryDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const updateForm = (key: keyof FormState, value: string | boolean) => setForm((prev) => ({ ...prev, [key]: value }));

  const onSave = async () => {
    if (!agencyId) return;
    try {
      setSaving(true);
      const payload: UpdateAgencyPayload = {
        agencyName: form.agencyName.trim(),
        email: form.email.trim(),
        orn: form.orn.trim(),
        website: form.website.trim(),
        phoneNumber: form.phoneNumber.trim(),
        phoneCode: selectedPhoneCountry?.dialCode || undefined,
        nationality: form.countryId || undefined,
        address: { fullAddress: form.address.trim() },
        aboutUs: form.aboutUs.trim(),
        foundedYear: form.foundedYear ? Number(form.foundedYear) : undefined,
        isActive: form.isActive,
        preferences: { notificationSettings: { email: form.emailNotifications, push: form.pushNotifications } },
      };
      const data = await agenciesService.updateAgencyById(agencyId, payload);
      setAgency(data.agency);
      push({ type: "success", title: "Agency updated", description: "Agency account updated successfully." });
      navigate("/agencyaccount");
    } catch (err) {
      push({ type: "error", title: "Save failed", description: getApiErrorMessage(err, "Unable to update agency.") });
    } finally { setSaving(false); }
  };

  const onUploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !agencyId) return;
    try {
      setAvatarLoading(true);
      const data = await agenciesService.updateAgencyProfilePicture(agencyId, file);
      if (data.agency) setAgency((prev) => ({ ...(prev || {}), ...data.agency }));
      push({ type: "success", title: "Logo updated", description: "Agency logo updated successfully." });
    } catch (err) {
      push({ type: "error", title: "Upload failed", description: getApiErrorMessage(err, "Unable to update agency logo.") });
    } finally { setAvatarLoading(false); }
  };

  const onDeleteAvatar = async () => {
    if (!agencyId) return;
    const result = await Swal.fire({ title: "Delete logo?", text: "This will remove the current agency logo.", icon: "warning", showCancelButton: true, confirmButtonText: "Delete", cancelButtonText: "Cancel", confirmButtonColor: "#EA3934" });
    if (!result.isConfirmed) return;
    try {
      setAvatarLoading(true);
      const data = await agenciesService.removeAgencyProfilePicture(agencyId);
      if (data.agency) setAgency((prev) => ({ ...(prev || {}), ...data.agency }));
      push({ type: "success", title: "Logo removed", description: "Agency logo removed successfully." });
    } catch (err) {
      push({ type: "error", title: "Delete failed", description: getApiErrorMessage(err, "Unable to delete agency logo.") });
    } finally { setAvatarLoading(false); }
  };

  if (loading) {
    return <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8"><Header title="Agency Detail" showBack={true} onBackClick={() => navigate(-1)} /><div className="rounded-[15px] bg-white min-h-[65vh] mt-[20px] flex items-center justify-center"><Loader size={80} /></div></div>;
  }

  return (
    <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
      <Header title="Agency Detail" showBack={true} onBackClick={() => navigate(-1)} />
      <div className="p-[20px] bg-[#fff] mt-[20px] rounded-[12px]">
        <div className="bg-[#fff] p-[20px] rounded-[12px] shadow-[0px_1px_0px_rgba(17,17,26,0.05),0px_0px_8px_rgba(17,17,26,0.10)] mb-[20px]">
          <div className="flex items-center justify-between flex-wrap gap-[20px]">
            <div className="flex items-center gap-[16px]">
              <div className="w-[90px] h-[90px] rounded-full overflow-hidden border border-[rgba(34,34,34,0.10)] shrink-0">{avatarLoading ? <div className="h-full w-full flex items-center justify-center"><Loader size={34} margin={0} /></div> : <img src={avatarSrc} alt="Agency" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.src = profileimg; }} />}</div>
              <div><h3 className="text-[18px] font-[Bold] text-[#222]">{form.agencyName?.trim() || agency?.agencyName?.trim() || "Agency"}</h3><p className="text-[13px] font-[Regular] text-[#707070] mt-[4px]">Upload and manage agency logo</p></div>
            </div>
            <div className="flex items-center gap-[12px] flex-wrap">
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onUploadAvatar} />
              <button type="button" className="h-[42px] px-[18px] rounded-[10px] bg-[#222] text-[#fff] text-[14px] font-[Medium]" onClick={() => fileInputRef.current?.click()} disabled={avatarLoading}>Change Logo</button>
              <button type="button" className="h-[42px] px-[18px] rounded-[10px] border border-[rgba(34,34,34,0.10)] text-[#EA3934] text-[14px] font-[Medium]" onClick={() => void onDeleteAvatar()} disabled={avatarLoading}>Delete</button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-[20px]">
          <div><label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Agency Name</label><input value={form.agencyName} onChange={(e) => updateForm("agencyName", e.target.value)} type="text" className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none" /></div>
          <div><label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Email Address</label><div className="relative"><input value={form.email} onChange={(e) => updateForm("email", e.target.value)} type="email" className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Medium] text-[#222] focus:outline-none" />{isEmailVerified && <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[13px] font-[Bold]"><VerifiedIcon className="w-[14px] h-[14px]" />Verified</div>}</div></div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Phone Number</label>
            <div className="flex items-center gap-[10px]">
              <div className="relative" ref={phoneDropdownRef}>
                <div
                  className="flex items-center gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] bg-white cursor-pointer select-none"
                  onClick={() => {
                    setIsPhoneDropdownOpen((prev) => !prev);
                    if (!isPhoneDropdownOpen) setPhoneSearchQuery("");
                  }}
                >
                  {selectedPhoneCountry?.flag ? (
                    <img src={selectedPhoneCountry.flag} alt={selectedPhoneCountry.code} className="w-[20px] h-[14px] rounded-[2px] object-cover" />
                  ) : (
                    <span className="text-[12px] text-[#707070] font-[Medium]">
                      {selectedPhoneCountry?.dialCode || "+--"}
                    </span>
                  )}
                  <DownArrowIcon className={`transition-transform ${isPhoneDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
                </div>
                {isPhoneDropdownOpen && (
                  <div className="absolute top-[50px] left-0 w-[260px] bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
                    <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                      <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                        <SearchIcon className="text-[#707070] shrink-0" />
                        <input
                          type="text"
                          placeholder="Search country..."
                          className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                          value={phoneSearchQuery}
                          onChange={(e) => setPhoneSearchQuery(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="overflow-y-auto overflow-x-hidden flex-1 py-[8px]">
                      {filteredPhoneCountries.map((country) => (
                        <div
                          key={country.id}
                          className="flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5]"
                          onClick={() => {
                            setSelectedPhoneCountry(country);
                            setIsPhoneDropdownOpen(false);
                          }}
                        >
                          <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0" />
                          <span className="text-[13px] font-[Medium] text-[#222] truncate">
                            {country.name} ({country.dialCode})
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              <div className="relative flex-1">
                <input
                  type="text"
                  value={form.phoneNumber}
                  onChange={(e) => updateForm("phoneNumber", e.target.value)}
                  className="w-full border border-[rgba(34,34,34,0.10)] rounded-[10px] pl-[14px] pr-[90px] h-[44px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
                />
                {isPhoneVerified && (
                  <div className="absolute right-[10px] top-1/2 -translate-y-1/2 flex items-center gap-[4px] text-[#00A663] text-[13px] font-[Bold]">
                    <VerifiedIcon className="w-[14px] h-[14px]" />
                    Verified
                  </div>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Country</label>
            <div className="relative w-full" ref={countryDropdownRef}>
              <div
                className="flex items-center justify-between gap-[6px] border border-[#EAEAEA] rounded-[10px] px-[12px] h-[44px] w-full bg-white cursor-pointer select-none"
                onClick={() => {
                  setIsCountryDropdownOpen((prev) => !prev);
                  if (!isCountryDropdownOpen) setCountrySearchQuery("");
                }}
              >
                <div className="flex items-center gap-[10px] min-w-0">
                  {selectedCountry?.flag ? (
                    <img src={selectedCountry.flag} alt={selectedCountry.code} className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0" />
                  ) : null}
                  <h4 className="text-[13px] font-[Medium] text-[#222] truncate">
                    {selectedCountry?.name || "Select Country"}
                  </h4>
                </div>
                <DownArrowIcon className={`mt-[2px] transition-transform ${isCountryDropdownOpen ? "rotate-180" : ""}`} width={14} height={14} />
              </div>
              {isCountryDropdownOpen && (
                <div className="absolute top-[50px] left-0 w-full bg-white border border-[#EAEAEA] rounded-[10px] shadow-[0_4px_15px_rgba(0,0,0,0.1)] z-10 max-h-[280px] overflow-hidden flex flex-col">
                  <div className="p-[10px] border-b border-[#EAEAEA] sticky top-0 bg-white z-20 shrink-0">
                    <div className="flex items-center gap-[10px] bg-[#F5F5F5] rounded-[8px] px-[12px] h-[44px] shrink-0">
                      <SearchIcon className="text-[#707070] shrink-0" />
                      <input
                        type="text"
                        placeholder="Search country..."
                        className="w-full bg-transparent text-[13px] font-[Regular] text-[#222] focus:outline-none placeholder:text-[#707070]"
                        value={countrySearchQuery}
                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="overflow-y-auto overflow-x-hidden flex-1 py-[8px]">
                    {filteredCountries.map((country) => (
                      <div
                        key={country.id}
                        className="flex items-center gap-[10px] px-[14px] py-[8px] cursor-pointer hover:bg-[#F5F5F5]"
                        onClick={() => {
                          setSelectedCountry(country);
                          updateForm("countryId", country._id || "");
                          setIsCountryDropdownOpen(false);
                        }}
                      >
                        <img src={country.flag} alt={country.code} className="w-[20px] h-[14px] rounded-[2px] object-cover shrink-0" />
                        <span className="text-[13px] font-[Medium] text-[#222] truncate">{country.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Agency Verified</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Agency Verified</span>
              <button
                type="button"
                disabled
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${isAgencyVerified ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"} opacity-50 cursor-not-allowed`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${isAgencyVerified ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Agency Status</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Agency Active</span>
              <button
                type="button"
                onClick={() => updateForm("isActive", !form.isActive)}
                disabled={isApprovalPending}
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${form.isActive ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"} ${isApprovalPending ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${form.isActive ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Email Notification</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Email Notification</span>
              <button
                type="button"
                onClick={() => updateForm("emailNotifications", !form.emailNotifications)}
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${form.emailNotifications ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"}`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${form.emailNotifications ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Push Notification</label>
            <div className="flex items-center justify-between border border-[rgba(34,34,34,0.10)] rounded-[10px] px-[14px] h-[44px]">
              <span className="text-[13px] font-[Medium] text-[#222]">Push Notification</span>
              <button
                type="button"
                onClick={() => updateForm("pushNotifications", !form.pushNotifications)}
                className={`relative w-[44px] h-[24px] rounded-full transition-all duration-300 ${form.pushNotifications ? "bg-[#6A3CA8]" : "bg-[#D1D5DB]"}`}
              >
                <span className={`absolute top-[2px] w-[20px] h-[20px] bg-white rounded-full transition-all duration-300 ${form.pushNotifications ? "left-[22px]" : "left-[2px]"}`} />
              </button>
            </div>
          </div>

          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">ORN Number</label>
            <input
              value={form.orn}
              onChange={(e) => updateForm("orn", e.target.value)}
              type="text"
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
            />
          </div>

          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Website</label>
            <input
              value={form.website}
              onChange={(e) => updateForm("website", e.target.value)}
              type="text"
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Address</label>
            <textarea
              value={form.address}
              onChange={(e) => updateForm("address", e.target.value)}
              className="w-full h-[120px] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none resize-none"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">About Agency</label>
            <textarea
              value={form.aboutUs}
              onChange={(e) => updateForm("aboutUs", e.target.value)}
              className="w-full h-[140px] rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[14px] py-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none resize-none"
            />
          </div>

          <div className="md:col-span-2 xl:col-span-3">
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Registration Document</label>
            <div className="flex min-w-0 w-full items-center gap-4 rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white px-4 py-3">
              <PdfIcon width={34} height={42} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] font-[SemiBold] text-[#222] break-all">
                  {registrationDocument.hasDocument
                    ? registrationDocument.name
                    : "Registration document not uploaded yet"}
                </p>
                {registrationDocument.hasDocument && (
                  <p className="text-[12px] text-[#707070] mt-1">
                    Uploaded on {registrationDocument.uploadedOn}
                  </p>
                )}
              </div>
              {registrationDocument.url ? (
                <a
                  href={registrationDocument.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(34,34,34,0.08)] bg-[#F5F5F5] transition hover:bg-[#ECECEC]"
                  aria-label="Open registration document in new tab"
                >
                  <DownloadIcon width={14} height={14} />
                </a>
              ) : (
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[8px] border border-[rgba(34,34,34,0.06)] bg-[#FAFAFA] opacity-40" aria-hidden>
                  <DownloadIcon width={14} height={14} />
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Total Active Listings</label>
            <input
              type="number"
              value={agency?.statistics?.totalActiveListings ?? 0}
              disabled
              readOnly
              className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none bg-[#F5F5F5]"
            />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Total Inactive Listings</label>
            <input
              type="number"
              value={agency?.statistics?.totalInactiveListings ?? 0}
              disabled
              readOnly
              className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none bg-[#F5F5F5]"
            />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Total Agents</label>
            <input
              type="number"
              value={agency?.statistics?.totalAgents ?? 0}
              disabled
              readOnly
              className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none bg-[#F5F5F5]"
            />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Total Super Agents</label>
            <input
              type="number"
              value={agency?.statistics?.totalSuperAgents ?? 0}
              disabled
              readOnly
              className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none bg-[#F5F5F5]"
            />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">Total Leads</label>
            <input
              type="number"
              value={agency?.statistics?.totalLeads ?? 0}
              disabled
              readOnly
              className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none bg-[#F5F5F5]"
            />
          </div>
          <div>
            <label className="text-[14px] font-[SemiBold] text-[#222] block mb-[6px]">This Month Leads</label>
            <input
              type="number"
              value={agency?.statistics?.thisMonthLeads ?? 0}
              disabled
              readOnly
              className="cursor-not-allowed h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] focus:outline-none bg-[#F5F5F5]"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-[20px] mt-[20px]">
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Last Login</label>
            <input
              type="text"
              value={formatDateTime(agency?.lastLogin)}
              readOnly
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Last Active At</label>
            <input
              type="text"
              value={formatDateTime(agency?.lastActiveAt)}
              readOnly
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Created At</label>
            <input
              type="text"
              value={formatDateTime(agency?.createdAt)}
              readOnly
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[14px] font-[SemiBold] text-[#222] mb-[8px]">Login Attempts</label>
            <input
              type="text"
              value={String(agency?.loginAttempts ?? 0)}
              readOnly
              className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[13px] font-[Medium] text-[#222] bg-[#F5F5F5] focus:outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end gap-[10px] mt-[24px]">
          <button type="button" className="h-[42px] px-[18px] rounded-[10px] border border-[rgba(34,34,34,0.10)] text-[#222] text-[14px] font-[Medium]" onClick={() => navigate("/agencyaccount")} disabled={saving}>Cancel</button>
          <button type="button" className="h-[42px] px-[18px] rounded-[10px] bg-[#6A3CA8] text-[#fff] text-[14px] font-[Medium]" onClick={() => void onSave()} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
