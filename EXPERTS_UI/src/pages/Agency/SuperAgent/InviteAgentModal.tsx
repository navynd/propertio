import { useState, useEffect } from "react";
import { CancelIcon } from "../../../components/CustomFile/icons";
import { agencyService } from "../../../services/agencyService";
import { toast } from "../../../services/toast";
import { getApiErrorMessage } from "../../../services/apiClient";
import Loader from "../../../components/Loader/loader";

interface InviteAgentModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const InviteAgentModal = ({ isOpen, onClose }: InviteAgentModalProps) => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!isOpen) {
      setName("");
      setEmail("");
    }
  }, [isOpen]);
  if (!isOpen) return null;

  const handleInvite = async () => {
    if (!name?.trim() || !email?.trim()) {
      toast.error("Missing details", "Please enter agent name and email.");
      return;
    }
    const emailRegex =
      /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9-]+\.[a-zA-Z]{2,}$/;

    if (!emailRegex.test(email.trim())) {
      toast.error(
        "Invalid email",
        "Please enter a valid email address.",
      );
      return;
    }

    try {
      setLoading(true);

      await agencyService.inviteAgent({
        fullName: name.trim(),
        email: email.trim(),
      });

      toast.success("Invitation sent", "Invitation sent successfully.");
      onClose();
      setName("");
      setEmail("");
    } catch (error) {
      console.error(error);
      toast.error(
        "Could not send invitation",
        getApiErrorMessage(error, "Invitation could not be sent."),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999] flex justify-center md:items-center items-end bg-black/40"
      onMouseDown={(event) => {
        if (loading) return;
        if (event.target === event.currentTarget) onClose();
      }}
    >
      {loading && (
        <div
          className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/50"
          aria-busy="true"
          aria-label="Sending invitation"
        >
          <Loader size={56} margin={0} />
        </div>
      )}

      <div className="relative z-[1] flex h-auto max-h-[90vh] w-full transform flex-col overflow-hidden rounded-t-[15px] bg-white transition-all duration-300 md:max-w-[480px] md:rounded-[15px]">
        <div className="shrink-0 flex justify-end p-[20px_20px_0px_20px]">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="flex h-[40px] w-[40px] cursor-pointer items-center justify-center rounded-[12px] border border-[rgba(34,34,34,0.10)] bg-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <CancelIcon width={14} height={14} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[0px_20px] md:p-[0px_50px]">
          <h2 className="text-center text-[20px] font-[Bold] leading-[1] text-[#222]">
            Invite Agent / Superagent
          </h2>
          <div className="mt-[35px] flex flex-col gap-[24px]">
            <div>
              <label className="mb-[6px] block text-[14px] font-[Bold] text-[#222]">
                Agent name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                disabled={loading}
                placeholder="Enter agent name"
                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] text-[#222] placeholder:text-[13px] placeholder:font-[Regular] placeholder:text-[#707070] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F5F5]"
              />
            </div>
            <div>
              <label className="mb-[6px] block text-[14px] font-[Bold] text-[#222]">
                Agent Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                placeholder="Enter email address"
                className="h-[44px] w-full rounded-[10px] border border-[rgba(34,34,34,0.10)] px-[12px] text-[14px] text-[#222] placeholder:text-[13px] placeholder:font-[Regular] placeholder:text-[#707070] focus:outline-none disabled:cursor-not-allowed disabled:bg-[#F5F5F5]"
              />
            </div>
          </div>
        </div>

        <div className="shrink-0 p-[20px_20px_20px_20px] md:p-[30px_50px_60px_50px]">
          <button
            type="button"
            onClick={handleInvite}
            disabled={loading}
            className="h-[44px] w-full rounded-[10px] bg-[#EA3934] text-[14px] font-[Bold] text-white transition disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteAgentModal;
