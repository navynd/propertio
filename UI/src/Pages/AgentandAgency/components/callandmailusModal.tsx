import { useEffect, useRef, useState, type MouseEvent } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
} from "@mui/material";
import { CommonModal } from "../../../Components/parts/Modal";
import {
  TelephoneIcon,
  VectorIcon,
  DownArrowIconBlack,
} from "../../../Components/parts/icon";
import { getAuthUser } from "../../../services/apiService";

interface CallAndMailUsModalProps {
  open: boolean;
  onClose: () => void;
  companyName: string;
  companyLogo: string;
  address: string;
  orn: string;
  phone?: string;
  onCallCompanyRequest: () => void;
}

function CallAndMailUsModal({
  open,
  onClose,
  companyName,
  companyLogo,
  address,
  orn,
  // phone,
  onCallCompanyRequest,
}: CallAndMailUsModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [enquiryType, setEnquiryType] = useState("Select");
  const [description, setDescription] = useState("");
  const [enquiryOpen, setEnquiryOpen] = useState(false);
  const enquiryDropdownRef = useRef<HTMLDivElement | null>(null);
  const authUser = getAuthUser<{
    fullName?: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    phoneNumber?: string;
  }>();
  const isLoggedIn =
    Boolean(localStorage.getItem("accessToken")) ||
    localStorage.getItem("isLoggedIn") === "true";

  const enquiryOptions = ["Sales", "Rent", "General"];

  const handleClose = (e?: MouseEvent) => {
    e?.stopPropagation();
    onClose();
  };

  const handleSend = (e: MouseEvent) => {
    e.stopPropagation();
    // TODO: wire to backend
    onClose();
  };

  const handleCallCompany = (e: MouseEvent<HTMLButtonElement>) => {
    handleClose(e);
    onCallCompanyRequest();
  };

  const handleEnquiryToggle = () => {
    setEnquiryOpen((prev) => !prev);
  };

  const handleEnquirySelect = (value: string) => {
    setEnquiryType(value);
    setEnquiryOpen(false);
  };

  useEffect(() => {
    if (!enquiryOpen) return;

    const handleClickOutside = (event: MouseEvent | globalThis.MouseEvent) => {
      if (
        enquiryDropdownRef.current &&
        !enquiryDropdownRef.current.contains(event.target as Node)
      ) {
        setEnquiryOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside as any);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside as any);
    };
  }, [enquiryOpen]);

  useEffect(() => {
    if (!open || !isLoggedIn) return;

    const authName = (
      authUser?.fullName ||
      authUser?.name ||
      [authUser?.firstName, authUser?.lastName].filter(Boolean).join(" ")
    ).trim();
    const authEmail = String(authUser?.email ?? "").trim();
    const authPhone = String(authUser?.phoneNumber ?? "").trim();

    if (authName) setName(authName);
    if (authEmail) setEmail(authEmail);
    if (authPhone) setPhoneNumber(authPhone);
  }, [open, isLoggedIn, authUser]);

  return (
    <CommonModal
      open={open}
      handleClose={handleClose}
      className="pf-modal common_modal call-mail-modal"
      closeButtonClassName="closeButtonClassName"
      boxclassName="call-mail-modal__box"
    >
      <Box className="pf-modal__content" onClick={(e) => e.stopPropagation()}>
        <Box className="pf-modal__body call-mail-modal__body">
          <Box className="call-mail-modal__layout">
            <Box className="call-mail-modal__company">
              <Box className="call-mail-modal__logo">
                <img src={companyLogo} alt={companyName} />
              </Box>
              <Typography
                component="h3"
                className="call-mail-modal__company-name"
              >
                {companyName}
              </Typography>

              <Box className="call-mail-modal__section">
                <Typography className="call-mail-modal__label">
                  Address :
                </Typography>
                <Typography className="call-mail-modal__value pf-company-details__info-text">
                  {address}
                </Typography>
              </Box>

              <Box className="call-mail-modal__orn">
                <Typography className="call-mail-modal__label">
                  ORN :
                </Typography>
                <Typography className="call-mail-modal__value">
                  {orn}
                </Typography>
                <VectorIcon width="14" height="14" />
              </Box>

              <Button
                className="call-mail-modal__call-btn"
                startIcon={<TelephoneIcon width="14" height="14" />}
                disableRipple
                onClick={handleCallCompany}
              >
                Call Company
              </Button>
            </Box>

            <Box className="call-mail-modal__form">
              <Typography component="h2" className="call-mail-modal__title pf-company-details__info-title">
                Mail {companyName}
              </Typography>

              <Box className="call-mail-modal__formFields">
                <Box className="pf-modal__formField">
                  <Typography
                    component="label"
                    className="pf-modal__fieldLabel"
                  >
                    Name
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Enter Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    // className="pf-modal__textInput"
                    className={`pf-modal__textInput ${name ? "has-value" : ""}`}
                  />
                </Box>

                <Box className="call-mail-modal__row call-mail-modal__row--split">
                  <Box className="pf-modal__formField">
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
                  <Box className="pf-modal__formField">
                    <Typography
                      component="label"
                      className="pf-modal__fieldLabel"
                    >
                      Phone number
                    </Typography>
                    <TextField
                      fullWidth
                      placeholder="Enter phone number"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      className={`pf-modal__textInput ${phoneNumber ? "has-value" : ""}`}
                      type="tel"
                    />
                  </Box>
                </Box>

                {/* <Box className="pf-modal__formField">
                  <Typography
                    component="label"
                    className="pf-modal__fieldLabel"
                  >
                    Enquiry type
                  </Typography>
                <Box
                  ref={enquiryDropdownRef}
                  className="pf-agent-Service__custom-select call-mail-modal__select"
                  style={{ position: "relative" }}
                >
                  <Box
                    className="pf-agent-Service__select-btn"
                    onClick={handleEnquiryToggle}
                  >
                    <Typography className="pf-agent-Service__name">
                      {enquiryType}
                    </Typography>
                    <DownArrowIconBlack width={13} height={13} />
                  </Box>

                  {enquiryOpen && (
                    <Box className="pf-agent-Service__dropdown">
                      {enquiryOptions.map((option) => {
                        const isActive = enquiryType === option;
                        return (
                          <Box
                            key={option}
                            className={`pf-agent-Service__dropdown-item${
                              isActive ? " active" : ""
                            }`}
                            onClick={() => handleEnquirySelect(option)}
                          >
                            {option}
                          </Box>
                        );
                      })}
                    </Box>
                  )}
                </Box>
                </Box> */}

                <Box className="pf-modal__formField">
                  <Typography
                    component="label"
                    className="pf-modal__fieldLabel"
                  >
                    Description
                  </Typography>
                  <TextField
                    fullWidth
                    placeholder="Write your comments"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="pf-modal__textArea emailtextarea"
                    multiline
                    minRows={4}
                  />
                </Box>
              </Box>

              <Box className="call-mail-modal__footer">
                <Button
                  fullWidth
                  variant="contained"
                  className="call-mail-modal__send-btn"
                  onClick={handleSend}
                >
                  Send
                </Button>
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>
    </CommonModal>
  );
}

export default CallAndMailUsModal;
