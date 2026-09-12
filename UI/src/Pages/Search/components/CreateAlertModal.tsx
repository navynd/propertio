import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
} from "@mui/material";
import { DownArrowIconBlack, ModalCloseIcon } from "../../../Components/parts/icon";

type AlertFrequencyOption = { name: string; value: string };

interface CreateAlertModalProps {
  open: boolean;
  onClose: () => void;
  defaultAlertName?: string;
  frequencyOptions?: AlertFrequencyOption[];
  onCreate?: (payload: {
    alertName: string;
    frequency: string;
  }) => void | Promise<void>;
}

function CreateAlertModal({
  open,
  onClose,
  defaultAlertName,
  frequencyOptions,
  onCreate,
}: CreateAlertModalProps) {
  const [alertName, setAlertName] = useState(defaultAlertName || "Properties for Rent Worldwide");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const options = useMemo(() => {
    const list = Array.isArray(frequencyOptions) ? frequencyOptions : [];
    return list
      .map((o) => ({
        name: String(o?.name ?? "").trim(),
        value: String(o?.value ?? "").trim(),
      }))
      .filter((o) => o.name && o.value);
  }, [frequencyOptions]);

  const [frequency, setFrequency] = useState<string>(() => options[0]?.value || "daily");
  const [showFrequencyDropdown, setShowFrequencyDropdown] = useState(false);

  const frequencyDropdownRef = useRef<HTMLDivElement>(null);

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


  /* 🔄 RESET VALUES WHEN OPEN */
  useEffect(() => {
    if (open) {
      setAlertName(defaultAlertName || "Properties for Rent Worldwide");
      setFrequency(options[0]?.value || "daily");
      setShowFrequencyDropdown(false);
    }
  }, [defaultAlertName, open, options]);

  /* 🖱 DROPDOWN OUTSIDE CLICK CLOSE */
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        frequencyDropdownRef.current &&
        !frequencyDropdownRef.current.contains(e.target as Node)
      ) {
        setShowFrequencyDropdown(false);
      }
    };

    // Use `click` (not `mousedown`) so selecting a list item applies first.
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleCreate = () => {
    const maybePromise = onCreate?.({ alertName, frequency });
    if (maybePromise && typeof (maybePromise as Promise<void>).then === "function") {
      setIsSubmitting(true);
      (maybePromise as Promise<void>)
        .then(() => onClose())
        .finally(() => setIsSubmitting(false));
      return;
    }
    onClose();
  };

  const selectedFrequencyLabel =
    options.find((o) => o.value === frequency)?.name || "Select";

  if (!open) return null;
  return (
    open && (
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
              Create alert
            </Typography>
            <div className="alert-modal-body-content">
              <Box className="pf-modal__formField">
                <Typography component="label" className="pf-modal__fieldLabel">
                  Alert name
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Enter alert name"
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  className="pf-modal__textInput"
                />
              </Box>

              <Box className="pf-modal__formField">
                <Typography component="label" className="pf-modal__fieldLabel">
                  Receive updates
                </Typography>
                {/* Frequency Dropdown */}
                <div
                  ref={frequencyDropdownRef}
                  onClick={() => setShowFrequencyDropdown(!showFrequencyDropdown)}
                  className="alert-frequency-dropdown"
                >

                  <h4 className="alert-frequency-dropdown-value">
                    {selectedFrequencyLabel}
                  </h4>


                  <DownArrowIconBlack
                    className="pf-field-flex-section-item-icon"
                    width={12}
                    height={8}
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      setShowFrequencyDropdown(!showFrequencyDropdown);
                    }}
                  />
                </div>
                {showFrequencyDropdown && (
                  <ul className="alert-frequency-dropdown-list">
                    {options.map((opt) => (
                      <li
                        key={opt.value}
                        onClick={() => {
                          setFrequency(opt.value);
                          setShowFrequencyDropdown(false);
                        }}
                        className="alert-frequency-dropdown-list-item"
                      >
                        {opt.name}
                      </li>
                    ))}
                  </ul>
                )}
              </Box>
            </div>
          </div>

          {/* FOOTER */}
          <div className="newcommon-modal-footer">
            <Button
              fullWidth
              variant="contained"
              className="alert-modal-next-btn"
              onClick={handleCreate}
              disabled={isSubmitting || !alertName.trim() || !frequency}
            >
              {isSubmitting ? "Creating..." : "Next"}
            </Button>
          </div>
        </div>
      </div>
    )
  );
}

export default CreateAlertModal;

{/* <CommonModal
        open={open}
        handleClose={onClose}
        className="pf-modal common_modal"
        closeButtonClassName="closeButtonClassName"
      >
        <Box className="pf-modal__content">
          <Box className="pf-modal__body">
            <Typography component="h2" className="pf-modal__title">
              Create alert
            </Typography>

            <Box className="pf-modal__formFields">
              <Box className="pf-modal__formField">
                <Typography component="label" className="pf-modal__fieldLabel">
                  Alert name
                </Typography>
                <TextField
                  fullWidth
                  placeholder="Enter alert name"
                  value={alertName}
                  onChange={(e) => setAlertName(e.target.value)}
                  className="pf-modal__textInput"
                />
              </Box>

              <Box className="pf-modal__formField">
                <Typography component="label" className="pf-modal__fieldLabel">
                  Receive updates
                </Typography>
                <FormControl fullWidth className="pf-modal__countryCodeSelect">
                  <Select
                    value={frequency}
                    onChange={handleFrequencyChange}
                    open={isFrequencyOpen}
                    onOpen={() => setIsFrequencyOpen(true)}
                    onClose={() => setIsFrequencyOpen(false)}
                    IconComponent={() => (
                      <DownArrowIconBlack
                        className={`pf-modal__selectIcon ${isFrequencyOpen ? "pf-modal__selectIcon--open" : ""
                          }`}
                      />
                    )}
                    displayEmpty
                    renderValue={(selected) =>
                      selected || <span style={{ color: "#9ca3af" }}>Select</span>
                    }
                    MenuProps={{
                      PaperProps: {
                        className: "pf-modal__dropdownMenu",
                      },
                      anchorOrigin: {
                        vertical: "bottom",
                        horizontal: "left",
                      },
                      transformOrigin: {
                        vertical: "top",
                        horizontal: "left",
                      },
                    }}
                  >
                    {UPDATE_FREQUENCIES.map((option) => (
                      <MenuItem
                        key={option}
                        value={option}
                        className="pf-modal__dropdownItem"
                      >
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Box>

            <Button
              fullWidth
              variant="contained"
              className="pf-modal__verifyBtn"
              onClick={handleCreate}
              disabled={!alertName.trim()}
            >
              Create
            </Button>
          </Box>
        </Box>
      </CommonModal> */}




{/* <FormControl fullWidth className="pf-modal__countryCodeSelect">
                  <Select
                    value={frequency}
                    onChange={handleFrequencyChange}
                    open={isFrequencyOpen}
                    onOpen={() => setIsFrequencyOpen(true)}
                    onClose={() => setIsFrequencyOpen(false)}
                    IconComponent={() => (
                      <DownArrowIconBlack
                        className={`pf-modal__selectIcon ${isFrequencyOpen ? "pf-modal__selectIcon--open" : ""
                          }`}
                      />
                    )}
                    displayEmpty
                    renderValue={(selected) =>
                      selected || <span style={{ color: "#9ca3af" }}>Select</span>
                    }
                    MenuProps={{
                      PaperProps: {
                        className: "pf-modal__dropdownMenu",
                      },
                      anchorOrigin: {
                        vertical: "bottom",
                        horizontal: "left",
                      },
                      transformOrigin: {
                        vertical: "top",
                        horizontal: "left",
                      },
                    }}
                  >
                    {UPDATE_FREQUENCIES.map((option) => (
                      <MenuItem
                        key={option}
                        value={option}
                        className="pf-modal__dropdownItem"
                      >
                        {option}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl> */}

