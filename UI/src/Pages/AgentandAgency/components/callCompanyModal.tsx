import { type MouseEvent } from "react";
import { Box, Typography } from "@mui/material";
import { CommonModal } from "../../../Components/parts/Modal";

interface CallCompanyModalProps {
  open: boolean;
  onClose: () => void;
  phoneNumber: string;
}

function CallCompanyModal({
  open,
  onClose,
  phoneNumber,
}: CallCompanyModalProps) {
  const handleClose = (e?: MouseEvent) => {
    e?.stopPropagation();
    onClose();
  };

  return (
    <CommonModal
      open={open}
      handleClose={handleClose}
      className="pf-modal common_modal call-company-modal"
      closeButtonClassName="closeButtonClassName"
      boxclassName="call-company-modal__box"
    >
      <Box className="pf-modal__content" onClick={(e) => e.stopPropagation()}>
        <Box className="pf-modal__body call-company-modal__body">
          <Typography
            component="h2"
            className="call-company-modal__title"
          >
            Want to call?
          </Typography>
          <Typography className="call-company-modal__subtitle">
            Here is the contact number
          </Typography>
          <Typography className="call-company-modal__phone">
            {phoneNumber}
          </Typography>
        </Box>
      </Box>
    </CommonModal>
  );
}

export default CallCompanyModal;

