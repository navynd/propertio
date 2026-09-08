import { CommonModal } from "../parts/Modal";
import { Box, Typography } from "@mui/material";
import { ModalSuccessIcon } from "../parts/icon";
import { getAuthUser } from "../../services/apiService";

type AuthUser = {
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

interface LoginSuccessModalProps {
  open: boolean;
  onClose: () => void;
}

function LoginSuccessModal({ open, onClose }: LoginSuccessModalProps) {
  const user = getAuthUser<AuthUser>();
  const displayName =
    user?.fullName ||
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.email ||
    "there";

  return (
    <CommonModal
      open={open}
      handleClose={onClose}
      className="pf-modal common_modal"
      closeButtonClassName="closeButtonHide"
    >
      <Box className="pf-modal__content">
        <Box className="pf-modal__body">
          <Box className="">
            <ModalSuccessIcon />
          </Box>
          <Typography component="h2" className="pf-modal__title">
            Loggedin successfully
          </Typography>
          <Typography component="h6" className="pf-modal__subtitle">
            Welcome {displayName}
          </Typography>
        </Box>

        <Box className="pf-modal__footer"></Box>
      </Box>
    </CommonModal>
  );
}
export default LoginSuccessModal;
