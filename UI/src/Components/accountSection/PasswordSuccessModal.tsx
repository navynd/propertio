import { CommonModal } from "../parts/Modal";
import { Box, Typography } from "@mui/material";
import { ModalSuccessIcon } from "../parts/icon";

interface PasswordSuccessModalProps {
  open: boolean;
  onClose: () => void;
}

function PasswordSuccessModal({ open, onClose }: PasswordSuccessModalProps) {
  if (!open) return null;

  return (
    <div className="common-modal-top" onClick={onClose}>
      <div className="common-modal-top1" onClick={(e) => e.stopPropagation()}>

        <div className="password-success-modal-content">
          <Box className="">
            <ModalSuccessIcon />
          </Box>
          <Typography component="h2" className="pf-modal__title password-success-modal__title">
            Your password is successfully changed
          </Typography>
          <Typography component="h6" className="pf-modal__subtitle">
            Redirecting to the login page...
          </Typography>
        </div>
      </div>
    </div >
  );
}
export default PasswordSuccessModal;

// <CommonModal
//   open={open}
//   handleClose={onClose}
//   className="pf-modal common_modal"
// >
//   <Box className="pf-modal__content">
//     <Box className="pf-modal__body password-success-modal__body">
//       <Box className="">
//         <ModalSuccessIcon />
//       </Box>
//       <Typography component="h2" className="pf-modal__title password-success-modal__title">
//         Your password is successfully changed
//       </Typography>
//       <Typography component="h6" className="pf-modal__subtitle">
//         Redirecting to the login page...
//       </Typography>
//     </Box>

//     <Box className="pf-modal__footer"></Box>
//   </Box>
// </CommonModal>
