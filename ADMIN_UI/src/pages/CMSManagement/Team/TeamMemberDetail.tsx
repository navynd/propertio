import { useEffect, useRef, useState } from "react";
import Header from "../../../components/Header/Header";
import Loader from "../../../components/Loader/loader";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { teamService } from "../../../services/teamService";
import { apiClient } from "../../../services/apiClient";
import type { SupportedUrlsResponse } from "../../../types/api";
import profileimg from "../../../assets/img/profileless.png";
import { SaveBar, TextField, Toggle, sectionClass, sectionTitleClass } from "../shared/CmsFormShared";

function TeamMemberDetail() {
    const navigate = useNavigate();
    const { push } = useToast();
    const [searchParams] = useSearchParams();
    const memberId = searchParams.get("id") || "";

    const fileInputRef = useRef<HTMLInputElement>(null);
    const objectUrlRef = useRef<string | null>(null);

    const [loading, setLoading] = useState(Boolean(memberId));
    const [teamImgBaseUrl, setTeamImgBaseUrl] = useState("");

    const [fullName, setFullName] = useState("");
    const [jobTitle, setJobTitle] = useState("");
    const [email, setEmail] = useState("");
    const [phone, setPhone] = useState("");
    const [displayOrder, setDisplayOrder] = useState(1);
    const [isActive, setIsActive] = useState(true);
    const [profileImage, setProfileImage] = useState("");
    const [preview, setPreview] = useState<string | null>(null);
    const [profileImageFile, setProfileImageFile] = useState<File | null>(null);

    const resolveImageSrc = (filename: string, baseUrl = teamImgBaseUrl) => {
        const raw = (filename || "").trim();
        if (!raw) return "";
        if (/^https?:\/\//i.test(raw) || raw.startsWith("blob:")) return raw;
        const base = baseUrl.replace(/\/+$/, "");
        return base ? `${base}/${encodeURIComponent(raw)}` : raw;
    };

    useEffect(() => {
        let mounted = true;
        const controller = new AbortController();

        const load = async () => {
            try {
                const [teamData, urls] = await Promise.all([
                    teamService.getTeam(
                        memberId ? { memberId } : {},
                        controller.signal
                    ),
                    apiClient.get<SupportedUrlsResponse>(
                        "/master-data?types=supportedurls",
                        { auth: true, signal: controller.signal }
                    ),
                ]);

                if (!mounted) return;

                const base =
                    (teamData.mediaBaseUrl?.img || urls.supportedUrls?.teamUrl?.img || "").trim();
                setTeamImgBaseUrl(base);

                const member = teamData.member || teamData.members?.[0];
                if (member) {
                    setFullName(member.fullName || "");
                    setJobTitle(member.jobTitle || "");
                    setEmail(member.email || "");
                    setPhone(member.phone || "");
                    setDisplayOrder(member.displayOrder || 1);
                    setIsActive(member.isActive !== false);
                    setProfileImage(member.profileImage || "");
                    const imagePreview = member.profileImage
                        ? resolveImageSrc(member.profileImage, base)
                        : null;
                    setPreview(imagePreview || null);
                }
            } catch (error) {
                if (!controller.signal.aborted) {
                    push({
                        type: "error",
                        title: "Failed to load team member",
                        description: getApiErrorMessage(error, "Unable to fetch team member."),
                    });
                }
            } finally {
                if (mounted) setLoading(false);
            }
        };

        load();

        return () => {
            mounted = false;
            controller.abort();
            if (objectUrlRef.current) {
                URL.revokeObjectURL(objectUrlRef.current);
                objectUrlRef.current = null;
            }
        };
    }, [memberId, push]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
        }
        const url = URL.createObjectURL(file);
        objectUrlRef.current = url;
        setPreview(url);
        setProfileImageFile(file);
    };

    const handleSave = async () => {
        if (!fullName.trim() || !jobTitle.trim()) {
            push({
                type: "error",
                title: "Validation",
                description: "Full name and job title are required.",
            });
            return;
        }

        try {
            await teamService.saveMember({
                memberId: memberId || undefined,
                fullName,
                jobTitle,
                email,
                phone,
                displayOrder,
                isActive,
                profileImage: profileImageFile ? undefined : profileImage,
                profileImageFile,
            });
            push({ type: "success", title: "Saved", description: "Team member saved." });
            navigate("/cmsteam");
        } catch (error) {
            push({
                type: "error",
                title: "Save failed",
                description: getApiErrorMessage(error, "Unable to save team member."),
            });
        }
    };

    if (loading) {
        return (
            <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
                <Header title="Team Member" showBack={true} onBackClick={() => navigate("/cmsteam")} />
                <Loader />
            </div>
        );
    }

    return (
        <div className="px-4 pb-6 pt-4 sm:px-6 lg:px-8">
            <Header title="Team Member" showBack={true} onBackClick={() => navigate("/cmsteam")} />

            <div className="mt-[20px]">
                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Member Details</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-[16px]">
                        <TextField label="Full Name" value={fullName} onChange={setFullName} required />
                        <TextField label="Job Title / Role" value={jobTitle} onChange={setJobTitle} required />
                        <TextField label="Email" value={email} onChange={setEmail} type="email" />
                        <TextField label="Contact Number" value={phone} onChange={setPhone} />
                        <TextField label="Display Order" value={String(displayOrder)} onChange={(v) => setDisplayOrder(Number(v) || 0)} type="number" />
                        <Toggle label="Status" checked={isActive} onChange={setIsActive} />
                    </div>
                </div>

                <div className={sectionClass}>
                    <h3 className={sectionTitleClass}>Profile Picture</h3>
                    <div className="flex items-center gap-[16px] flex-wrap">
                        <img src={preview || profileimg} alt="Profile" className="w-[80px] h-[80px] rounded-full object-cover border border-[#EAEAEA]" />
                        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} className="h-[42px] px-[18px] rounded-[10px] bg-[#222] text-[#fff] text-[14px] font-[Medium] cursor-pointer">
                            Upload Photo
                        </button>
                    </div>
                </div>

                <SaveBar onSave={handleSave} />
            </div>
        </div>
    );
}

export default TeamMemberDetail;
