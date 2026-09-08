import { useState, useEffect, type MouseEvent, type ChangeEvent } from "react";
import { Box, Button, TextField, Typography } from "@mui/material";
import { ModalCloseIcon } from "../../../Components/parts/icon";
import Loader from "../../../Components/loader/loader";
import {
  getReportApiErrorMessage,
  submitPropertyReport,
} from "../../../services/apiService";

interface ReportsModalProps {
  open: boolean;
  onClose: () => void;
  reportedItemId: string;
  isLoggedIn?: boolean;
  initialEmail?: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

interface UploadedFile {
  file: File;
  preview?: string;
}

function ReportsModal({
  open,
  onClose,
  reportedItemId,
  initialEmail = "",
  onSuccess,
  onError,
}: ReportsModalProps) {
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<UploadedFile[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail);
    setDescription("");
    setSubmitError("");
    setAttachments((prev) => {
      prev.forEach((item) => {
        if (item.preview) URL.revokeObjectURL(item.preview);
      });
      return [];
    });
  }, [open, initialEmail]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleFileUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newItems = files.map((file) => ({
      file,
      preview: file.type.startsWith("image/")
        ? URL.createObjectURL(file)
        : undefined,
    }));
    setAttachments((prev) => [...prev, ...newItems]);
    e.target.value = "";
  };

  const handleDeleteFile = (index: number) => {
    setAttachments((prev) => {
      const updated = [...prev];
      if (updated[index]?.preview) {
        URL.revokeObjectURL(updated[index].preview!);
      }
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleSubmit = async () => {
    const trimmedDescription = description.trim();
    const trimmedEmail = email.trim();

    if (!trimmedDescription) {
      setSubmitError("Description is required.");
      return;
    }

    if (!trimmedEmail) {
      setSubmitError("Email is required.");
      return;
    }

    setSubmitError("");
    setIsSubmitting(true);

    try {
      await submitPropertyReport({
        propertyId: reportedItemId,
        description: trimmedDescription,
        email: trimmedEmail,
        files: attachments.map((item) => item.file),
      });

      onSuccess?.("Report submitted successfully");
      handleClose();
    } catch (err) {
      const message = getReportApiErrorMessage(err, "Failed to submit report");
      setSubmitError(message);
      onError?.(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div>
      <div className="newcommon-modal-overlay">
        <div
          className="newcommon-modal reports-modal"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="newcommon-modal-header">
            <button
              type="button"
              className="newcommon-modal-close-icon"
              onClick={(e: MouseEvent) => {
                e.stopPropagation();
                handleClose();
              }}
              disabled={isSubmitting}
            >
              <ModalCloseIcon width="16" height="16" />
            </button>
          </div>

          <div className="newcommon-modal-body">
            <Typography component="h2" className="alert-modal-title">
              Report us
            </Typography>
            <Typography component="p" className="reports-modal-subtitle">
              Be as detailed as you can
            </Typography>

            <div className="alert-modal-body-content reports-modal-body-content">
              <Box className="pf-modal__formFields">
                <Box className="pf-modal__formField">
                  <Typography
                    component="label"
                    className="pf-modal__fieldLabel"
                  >
                    Email
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Enter Email"
                    className="pf-modal__textInput"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    disabled={isSubmitting}
                  />
                </Box>

                <Box className="pf-modal__formField">
                  <Typography
                    component="label"
                    className="pf-modal__fieldLabel"
                  >
                    Description
                  </Typography>
                  <TextField
                    fullWidth
                    multiline
                    minRows={4}
                    placeholder="Enter Description"
                    className="pf-modal__textArea"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    disabled={isSubmitting}
                  />
                </Box>

                <Box className="pf-modal__formField">
                  <Typography
                    component="label"
                    className="pf-modal__fieldLabel"
                  >
                    Attach files{" "}
                    <span style={{ color: "#707070" }}>(Optional)</span>
                  </Typography>

                  <Box
                    sx={{
                      border: "1px dashed rgba(34,34,34,0.20)",
                      borderRadius: "10px",
                      padding: "20px",
                      textAlign: "center",
                      cursor: isSubmitting ? "not-allowed" : "pointer",
                      background: "#FAFAFA",
                      position: "relative",
                      opacity: isSubmitting ? 0.6 : 1,
                    }}
                  >
                    <input
                      type="file"
                      multiple
                      accept="image/*,application/pdf,.doc,.docx,video/*,audio/*"
                      onChange={handleFileUpload}
                      disabled={isSubmitting}
                      style={{
                        position: "absolute",
                        inset: 0,
                        opacity: 0,
                        cursor: isSubmitting ? "not-allowed" : "pointer",
                      }}
                    />
                    <Typography
                      sx={{
                        fontSize: "14px",
                        fontFamily: "Regular",
                        color: "#707070",
                      }}
                    >
                      Click or drag files to upload
                    </Typography>
                  </Box>

                  {attachments.length > 0 && (
                    <Box
                      sx={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "12px",
                        marginTop: "16px",
                      }}
                    >
                      {attachments.map((item, index) => (
                        <Box
                          key={`${item.file.name}-${index}`}
                          sx={{
                            width: "100px",
                            height: "100px",
                            borderRadius: "10px",
                            overflow: "hidden",
                            position: "relative",
                            border: "1px solid #E0E0E0",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            background: "#FAFAFA",
                          }}
                        >
                          {item.preview ? (
                            <img
                              src={item.preview}
                              alt={item.file.name}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                              }}
                            />
                          ) : (
                            <Typography sx={{ fontSize: "11px", px: 1 }}>
                              {item.file.name}
                            </Typography>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(index)}
                            disabled={isSubmitting}
                            style={{
                              position: "absolute",
                              top: "6px",
                              right: "6px",
                              width: "24px",
                              height: "24px",
                              borderRadius: "50%",
                              border: "none",
                              background: "#fff",
                              cursor: "pointer",
                              fontSize: "14px",
                              fontWeight: 600,
                              boxShadow: "0px 2px 6px rgba(0,0,0,0.15)",
                            }}
                          >
                            ✕
                          </button>
                        </Box>
                      ))}
                    </Box>
                  )}
                </Box>

                {submitError ? (
                  <Typography sx={{ color: "#D4A373", fontSize: "13px", mt: 1 }}>
                    {submitError}
                  </Typography>
                ) : null}
              </Box>
            </div>
          </div>

          <div className="newcommon-modal-footer">
            <Button
              fullWidth
              variant="contained"
              className="alert-modal-next-btn"
              onClick={() => void handleSubmit()}
              disabled={isSubmitting}
            >
              {isSubmitting ? <Loader size={22} margin={0} /> : "Submit"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ReportsModal;
