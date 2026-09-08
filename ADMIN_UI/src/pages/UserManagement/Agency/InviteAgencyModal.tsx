import { useEffect, useState } from "react";
import { CancelIcon } from "../../../assets/icons";
import Loader from "../../../components/Loader/loader";
import { useToast } from "../../../context/ToastContext";
import { getApiErrorMessage } from "../../../services/apiClient";
import { agenciesService } from "../../../services/agenciesService";

interface InviteAgencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInviteSuccess?: () => void;
}

const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;

export default function InviteAgencyModal({ isOpen, onClose, onInviteSuccess }: InviteAgencyModalProps) {
  const { push } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setEmail("");
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInvite = async () => {
    const trimmedName = name.trim();
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedName || !trimmedEmail) {
      push({ type: "error", title: "Missing details", description: "Please enter agency name and email." });
      return;
    }
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      push({ type: "error", title: "Invalid email", description: "Please enter a valid email address." });
      return;
    }
    try {
      setIsSubmitting(true);
      await agenciesService.inviteAgency({ agencyName: trimmedName, email: trimmedEmail });
      push({ type: "success", title: "Invitation sent", description: "Agency invitation sent successfully." });
      onClose();
      onInviteSuccess?.();
    } catch (error) {
      push({ type: "error", title: "Could not send invitation", description: getApiErrorMessage(error, "Invitation could not be sent.") });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center md:items-center items-end z-[9999]" onMouseDown={(event) => { if (!isSubmitting && event.target === event.currentTarget) onClose(); }}>
      {isSubmitting && <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/50"><Loader size={56} margin={0} /></div>}
      <div className="relative bg-white w-full md:max-w-[480px] rounded-t-[15px] md:rounded-[15px] max-h-[90vh] flex flex-col overflow-hidden">
        <div className="shrink-0 flex justify-end p-[20px_20px_0px_20px]">
          <button type="button" onClick={onClose} disabled={isSubmitting} className="cursor-pointer h-[40px] w-[40px] rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white flex items-center justify-center disabled:opacity-50"><CancelIcon width={14} height={14} /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-[0px_20px] md:p-[0px_50px]">
          <h2 className="text-center text-[20px] font-[Bold] text-[#222] leading-[1]">Invite Agency</h2>
          <div className="flex flex-col gap-[24px] mt-[35px]">
            <div><label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">Agency name</label><input type="text" value={name} onChange={(event) => setName(event.target.value)} disabled={isSubmitting} placeholder="Enter agency name" className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px]"/></div>
            <div><label className="text-[14px] font-[Bold] text-[#222] block mb-[6px]">Agency email address</label><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} disabled={isSubmitting} placeholder="Enter agency email address" className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px]"/></div>
          </div>
        </div>
        <div className="shrink-0 p-[20px_20px_20px_20px] md:p-[30px_50px_60px_50px]">
          <button type="button" onClick={handleInvite} disabled={isSubmitting} className="h-[44px] w-full rounded-[10px] bg-[#6A3CA8] text-white text-[14px] font-[Bold] disabled:opacity-50">{isSubmitting ? "Sending..." : "Send"}</button>
        </div>
      </div>
    </div>
  );
}
