import { useState, useEffect } from "react";
import "../../../assets/styles/components/ReportModal.scss";
import { Button, Typography } from "@mui/material";
import { ModalCloseIcon } from "../../../Components/parts/icon";
import {
  getReportApiErrorMessage,
  submitPropertyReport,
} from "../../../services/apiService";

interface ReportModalProps {
  open: boolean;
  onClose: () => void;
  reportedItemId: string;
  isLoggedIn?: boolean;
  initialEmail?: string;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
}

function ReportModal({
  open,
  onClose,
  reportedItemId,
  initialEmail = "",
  onSuccess,
  onError,
}: ReportModalProps) {
  const [email, setEmail] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState<
    { id: number; file: File; previewUrl?: string }[]
  >([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    if (!open) return;
    setEmail(initialEmail);
    setDescription("");
    setSubmitError("");
    setAttachments((prev) => {
      prev.forEach((att) => {
        if (att.previewUrl) URL.revokeObjectURL(att.previewUrl);
      });
      return [];
    });
  }, [open, initialEmail]);

  const handleClose = () => {
    if (isSubmitting) return;
    onClose();
  };

  const handleFilesSelected = (files: FileList | null) => {
    if (!files) return;

    const newItems = Array.from(files).map((file, index) => {
      const isImage = file.type.startsWith("image/");
      return {
        id: Date.now() + index,
        file,
        previewUrl: isImage ? URL.createObjectURL(file) : undefined,
      };
    });

    setAttachments((prev) => [...prev, ...newItems]);
  };

  const handleRemoveAttachment = (id: number) => {
    setAttachments((prev) => {
      const item = prev.find((att) => att.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((att) => att.id !== id);
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

  const renderAttachmentThumb = (item: {
    id: number;
    file: File;
    previewUrl?: string;
  }) => {
    const type = item.file.type;
    const isImage = type.startsWith("image/");
    const isPdf = type === "application/pdf";
    const isVideo = type.startsWith("video/");
    const isAudio = type.startsWith("audio/");

    let label = "";
    if (isPdf) label = "PDF";
    else if (isVideo) label = "Video";
    else if (isAudio) label = "Audio";

    return (
      <div key={item.id} className="report-attachment">
        <button
          type="button"
          className="report-attachment-remove"
          onClick={() => handleRemoveAttachment(item.id)}
          disabled={isSubmitting}
        >
          ✕
        </button>
        <div className="report-attachment-inner">
          {isImage && item.previewUrl ? (
            <img
              src={item.previewUrl}
              alt={item.file.name}
              className="report-attachment-image"
            />
          ) : (
            <span className="report-attachment-icon">{label || "File"}</span>
          )}
        </div>
      </div>
    );
  };

  if (!open) return null;

  return (
    <div className="report-modal-overlay" onClick={handleClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div className="report-modal-header">
          <div className="report-modal-close-icon" onClick={handleClose}>
            <ModalCloseIcon width="16" height="16" />
          </div>
        </div>
        <div className="report-modal-content">
          <Typography component="h2" className="report-modal-title">
            Report
          </Typography>

          <div className="report-form-section">
            <label className="report-label">
              Email address
              <input
                type="email"
                className="report-input"
                placeholder="Enter email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isSubmitting}
              />
            </label>

            <label className="report-label">
              Description
              <textarea
                className="report-textarea"
                placeholder="Be as detailed as you can"
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={isSubmitting}
              />
            </label>

            <div className="report-attachments-section">
              <div className="report-attachments-header">
                <span className="report-attachments-title">Attach files</span>
                <span className="report-attachments-optional">(optional)</span>
              </div>

              <div className="report-attachments-row">
                {attachments.map(renderAttachmentThumb)}

                <label className="report-attachment-add">
                  <input
                    type="file"
                    multiple
                    accept="image/*,application/pdf,.doc,.docx,video/*,audio/*"
                    onChange={(e) => {
                      handleFilesSelected(e.target.files);
                      e.target.value = "";
                    }}
                    className="report-attachment-input"
                    disabled={isSubmitting}
                  />
                  <span className="report-attachment-add-plus">+</span>
                </label>
              </div>
            </div>

            {submitError ? (
              <Typography sx={{ color: "#EA3934", fontSize: "13px", mt: 1 }}>
                {submitError}
              </Typography>
            ) : null}
          </div>
        </div>
        <div className="report-footer">
          <Button
            variant="contained"
            className="report-result-btn"
            onClick={() => void handleSubmit()}
            disabled={isSubmitting}
          >
            {isSubmitting ? "Submitting…" : "Submit Report"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ReportModal;
