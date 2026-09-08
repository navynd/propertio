import { useState, useEffect, type MouseEvent } from "react";
import { Box, Typography, Avatar, Button } from "@mui/material";
import { CommonModal } from "../../../Components/parts/Modal";
import { DownArrowIconBlack, ModalCloseIcon } from "../../../Components/parts/icon";
interface ContactusModalProps {
  open: boolean;
  onClose: () => void;
  agentName?: string;
  agentImage?: string;
  agentEmail?: string;
  languages?: string;
  referenceNumber?: string;
  contactNumber?: string;
  brokerLicenseNumber?: string;
}

function ContactusModal({
  open,
  onClose,
  agentName,
  agentImage,
  // agentEmail,
  languages,
  // referenceNumber,
  contactNumber,
  brokerLicenseNumber,
}: ContactusModalProps) {
  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onClose();
  };
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
              <div className="contactusnew-modal-body-content">
                <Typography component="h2" className="pf-modal__title">
                  Agent details to call
                </Typography>

                <Avatar
                  src={agentImage}
                  alt={agentName}
                  className="contactusnew-modal__avatar"
                  sx={{ width: 72, height: 72 }}
                />
                <h3 className="contactusnew-modal__name">{agentName || "—"}</h3>

                {languages?.trim() ? (
                  <div className="contactusnew-modal__section contactusnew-modal__line-bottom">
                    <p className="contactusnew-modal__label">Language</p>
                    <p className="contactusnew-modal__value">{languages}</p>
                  </div>
                ) : null}

                {/* {agentEmail?.trim() ? (
                  <div
                    className={`contactusnew-modal__section${languages?.trim() ? "" : " contactusnew-modal__line-bottom"}`}
                  >
                    <p className="contactusnew-modal__label">Email</p>
                    <p className="contactusnew-modal__value">{agentEmail}</p>
                  </div>
                ) : null} */}

                {/* {referenceNumber?.trim() ? (
                  <div className="contactusnew-modal__section">
                    <p className="contactusnew-modal__label">Reference number</p>
                    <h6 className="contactusnew-modal__value">{referenceNumber}</h6>
                  </div>
                ) : null} */}

                {brokerLicenseNumber?.trim() ? (
                  <div className="contactusnew-modal__section">
                    <p className="contactusnew-modal__label">Broker license</p>
                    <h6 className="contactusnew-modal__value">{brokerLicenseNumber}</h6>
                  </div>
                ) : null}
              </div>
            </div>
            {/* FOOTER */}
            <div className="contactusnew-modal__call">
              <p className="contactusnew-modal__call-label">
                Contact number
              </p>
              <h6 className="contactusnew-modal__call-number">
                {contactNumber?.trim() || "—"}
              </h6>
            </div>
            {/* <div className="newcommon-modal-footer">
              <Button fullWidth variant="contained" className="alert-modal-next-btn">
                Next
              </Button>
            </div> */}
          </div>
        </div>
        {/* <CommonModal
        open={open}
        handleClose={handleClose}
        className="pf-modal common_modal contactus-modal"
        closeButtonClassName="closeButtonClassName"

      >
        <Box className="pf-modal__content" onClick={(e) => e.stopPropagation()}>
          <Box className="pf-modal__body">
            <Typography component="h2" className="pf-modal__title">
              Agent details to call
            </Typography>

            <Avatar
              src={agentImage}
              alt={agentName}
              className="contactus-modal__avatar"
              sx={{ width: 72, height: 72 }}
            />

            <Typography component="h3" className="contactus-modal__name">
              {agentName}
            </Typography>

            <Box className="contactus-modal__section">
              <Typography className="contactus-modal__label">Language</Typography>
              <Typography className="contactus-modal__value">{languages}</Typography>
            </Box>

            <Box className="contactus-modal__section contactus-modal__ref">
              <Typography className="contactus-modal__label">
                Reference number
              </Typography>
              <Typography className="contactus-modal__value contactus-modal__ref-number">
                {referenceNumber}
              </Typography>
            </Box>

            <Box className="contactus-modal__call">
              <Typography className="contactus-modal__label contactus-modal__call-label">
                Contact number
              </Typography>
              <Typography className="contactus-modal__call-number">
                {contactNumber}
              </Typography>
            </Box>
          </Box>
        </Box>
      </CommonModal> */}
      </div >
    )

  );
}

export default ContactusModal;

