import { useState, useEffect, type MouseEvent } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { CommonModal } from "../../../Components/parts/Modal";
import { DownArrowIconBlack, ModalCloseIcon } from "../../../Components/parts/icon";
import Loader from "../../../Components/loader/loader";
interface MailusModalProps {
  open: boolean;
  onClose: () => void;
  agentName?: string;
  /** Agent inbox from listing/search API (for display only). */
  agentEmail?: string;
  initialName?: string;
  initialEmail?: string;
  initialPhone?: string;
  title?: string;
  submitLabel?: string;
  showComments?: boolean;
  onSubmit?: (payload: {
    name: string;
    email: string;
    phoneNumber: string;
    comments: string;
  }) => Promise<void> | void;
}

function MailusModal({
  open,
  onClose,
  agentName,
  agentEmail,
  initialName,
  initialEmail,
  initialPhone,
  title,
  submitLabel = "Send",
  showComments = true,
  onSubmit,
}: MailusModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [comments, setComments] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  /* 🔒 BODY SCROLL LOCK */
  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [open]);
  useEffect(() => {
    if (!open) return;

    const scrollY = window.scrollY;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      const y = -parseInt(document.body.style.top || "0");

      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";

      window.scrollTo(0, y);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setName(initialName ?? "");
    setEmail(initialEmail ?? "");
    setPhone(initialPhone ?? "");
    setComments("");
    setSubmitError("");
    setIsSubmitting(false);
  }, [open, initialName, initialEmail, initialPhone]);
  const handleClose = (e?: MouseEvent) => {
    e?.stopPropagation();
    onClose();
  };

  const handleSend = async (e: MouseEvent) => {
    e.stopPropagation();
    if (isSubmitting) return;

    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    const normalizedPhone = phone.trim();
    const normalizedComments = comments.trim();

    if (!normalizedName || !normalizedEmail || !normalizedPhone) {
      setSubmitError("Name, email and phone number are required.");
      return;
    }

    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
    if (!emailOk) {
      setSubmitError("Please enter a valid email address.");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      await onSubmit?.({
        name: normalizedName,
        email: normalizedEmail,
        phoneNumber: normalizedPhone,
        comments: normalizedComments,
      });
      onClose();
    } catch (err) {
      setSubmitError(
        err instanceof Error && err.message
          ? err.message
          : "Failed to submit inquiry. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };
  if (!open) return null;
  return (
    open && (
      <div>
        <div className="newcommon-modal-overlay">
          <div className="newcommon-modal" onClick={(e) => e.stopPropagation()}>

            {/* HEADER */}
            <div className="newcommon-modal-header">
              <button
                type="button"
                className="newcommon-modal-close-icon"
                onClick={(e) => {
                  e.stopPropagation();
                  onClose();
                }}
              >
                <ModalCloseIcon width="16" height="16" />
              </button>
            </div>

            {/* BODY (scroll only here) */}
            <div className="newcommon-modal-body">
              <Typography component="h2" className="alert-modal-title">
                {title || (agentName ? `Mail to ${agentName}` : "Mail us")}
              </Typography>
              {/* {agentEmail?.trim() ? (
                <Typography
                  component="p"
                  variant="body2"
                  sx={{ mt: 0.5, mb: 1, color: "text.secondary" }}
                >
                  Agent email: {agentEmail.trim()}
                </Typography>
              ) : null} */}
              <div className="alert-modal-body-content">
                <Box className="pf-modal__formFields">
                  <Box className="pf-modal__formField">
                    <Typography component="label" className="pf-modal__fieldLabel">
                      Name
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="Enter Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pf-modal__textInput"
                    />
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    <Box className="pf-modal__formField" sx={{ flex: 1 }}>
                      <Typography
                        component="label"
                        className="pf-modal__fieldLabel"
                      >
                        Email Address
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="Enter email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pf-modal__textInput"
                        type="email"
                      />
                    </Box>
                    <Box className="pf-modal__formField" sx={{ flex: 1 }}>
                      <Typography
                        component="label"
                        className="pf-modal__fieldLabel"
                      >
                        Phone number
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="Enter phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pf-modal__textInput"
                        type="tel"
                      />
                    </Box>
                  </Box>

                  {showComments ? (
                    <Box className="pf-modal__formField">
                      <Typography component="label" className="pf-modal__fieldLabel">
                        Comments
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="Write your comments"
                        value={comments}
                        onChange={(e) => setComments(e.target.value)}
                        className="pf-modal__textArea"
                        multiline
                        minRows={4}
                      />
                    </Box>
                  ) : null}
                  {submitError ? (
                    <Typography component="p" color="error" sx={{ mt: 0.5 }}>
                      {submitError}
                    </Typography>
                  ) : null}
                </Box>
              </div>
            </div>

            {/* FOOTER */}
            <div className="newcommon-modal-footer">
              <Button
                fullWidth
                variant="contained"
                className="alert-modal-next-btn"
                onClick={handleSend}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader size={28} margin={0} /> : submitLabel}
              </Button>
            </div>
          </div>
        </div>
        {/* <CommonModal
          open={open}
          handleClose={handleClose}
          className="pf-modal common_modal mailus-modal"
          closeButtonClassName="closeButtonClassName"
          boxclassName="mailus-modal__box"
        >
          <Box className="pf-modal__content" onClick={(e) => e.stopPropagation()}>
            <Box className="pf-modal__body">
              <Typography component="h2" className="pf-modal__title">
                {agentName ? `Mail to ${agentName}` : "Mail us"}
              </Typography>

              <Box className="mailus-modal__form">
                <Box className="pf-modal__formFields">
                  <Box className="pf-modal__formField">
                    <Typography component="label" className="pf-modal__fieldLabel">
                      Name
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="Enter Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pf-modal__textInput"
                    />
                  </Box>

                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: { xs: "column", sm: "row" },
                      gap: 2,
                      width: "100%",
                    }}
                  >
                    <Box className="pf-modal__formField" sx={{ flex: 1 }}>
                      <Typography
                        component="label"
                        className="pf-modal__fieldLabel"
                      >
                        Email Address
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="Enter email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pf-modal__textInput"
                        type="email"
                      />
                    </Box>
                    <Box className="pf-modal__formField" sx={{ flex: 1 }}>
                      <Typography
                        component="label"
                        className="pf-modal__fieldLabel"
                      >
                        Phone number
                      </Typography>
                      <TextField
                        fullWidth
                        placeholder="Enter phone number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        className="pf-modal__textInput"
                        type="tel"
                      />
                    </Box>
                  </Box>

                  <Box className="pf-modal__formField">
                    <Typography component="label" className="pf-modal__fieldLabel">
                      Comments
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="Write your comments"
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      className="pf-modal__textArea"
                      multiline
                      minRows={4}
                    />
                  </Box>
                </Box>
              </Box>
              <Box className="mailus-modal__footer">
                <Button
                  fullWidth
                  variant="contained"
                  className="pf-modal__verifyBtn"
                  onClick={handleSend}
                >
                  Send
                </Button>
              </Box>
            </Box>
          </Box>
        </CommonModal> */}
      </div>
    )
  );
}

export default MailusModal;
