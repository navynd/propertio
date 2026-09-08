import { type ReactNode } from "react";
import { Modal, Box, Button, Backdrop, Fade } from "@mui/material";
import closeIcon from "../../assets/img/closeicon.svg";
import { ModalCloseIcon } from "./icon";

interface CommonModalProps {
  children: ReactNode;
  open: boolean;
  handleClose: () => void;
  className?: string;
  title?: ReactNode;
  closeButtonClassName?: string;
  boxclassName?: string;
  fill?: string;
}

export const CommonModal = ({ children, ...props }: CommonModalProps) => {
  const style = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",

  };
  return (
    <Modal
      className={props.className}
      keepMounted
      open={props.open}
      onClose={props.handleClose}
      aria-labelledby="modal-modal-title"
      aria-describedby="modal-modal-description"
      closeAfterTransition
      BackdropComponent={Backdrop}
      BackdropProps={{
        timeout: 1000,
      }}
    >
      <Fade
        in={props.open}
        {...(props.open ? { timeout: 1000 } : { timeout: 1000 })}
      >
        <Box
          className={
            "modal-box " + (props.boxclassName ? props.boxclassName : "dark")
          }
          sx={style}
        >
          <div className="pb-2">
            <div className="d-flex align-items-center justify-content-between">
              <div className="px-3 f24x">{props.title}</div>
              {/* close icon */}
              {props.closeButtonClassName !== "closeButtonHide" && (
                <div className={props.closeButtonClassName || ""}>
                  <Button
                    className="pf-modal__close"
                    onClick={props.handleClose}
                  >
                    <img
                      src={closeIcon}
                      alt="close"
                    />
                  </Button>
                </div>
              )}
            </div>
          </div>
          {children}
        </Box>
      </Fade>
    </Modal>
  );
};
