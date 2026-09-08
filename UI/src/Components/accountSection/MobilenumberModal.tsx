import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Box,
  Button,
  Typography,
} from "@mui/material";
import Loader from "../loader/loader";
import { SearchIcon, DownArrowIconBlack, ModalCloseIcon } from "../parts/icon";
import {
  getCountriesMasterData,
  type MasterCountry,
  userGetProfile,
  userUpdateProfile,
  type UserProfile,
} from "../../services/apiService";
import {
  dialCodesMatch,
  extractLocalPhoneDigits,
  normalizeDialCode,
} from "../../utils/phoneWhatsapp";

interface MobilenumberModalProps {
  open: boolean;
  onClose: () => void;
  onNext?: () => void;
  onSkip?: () => void;
}

type CountryOption = {
  countryId: string;
  name: string;
  code: string;
  dialCode: string;
  phoneCode: string;
  flag: string;
};

function normalizeCountryToOption(c: MasterCountry): CountryOption | null {
  const countryId = (c._id ?? c.id ?? "").toString();
  const code = (c.code ?? "").toString();
  const name = (c.name ?? "").toString();
  const dialCodeRaw = (c.dialCode ?? c.phoneCode ?? "").toString();
  const phoneCodeRaw = (c.phoneCode ?? c.dialCode ?? dialCodeRaw ?? "").toString();

  if (!countryId || !name || !dialCodeRaw) return null;

  return {
    countryId,
    name,
    code,
    dialCode: dialCodeRaw,
    phoneCode: phoneCodeRaw,
    flag: (c.flag ?? "").toString(),
  };
}

function resolveModalPhoneFields(
  user: UserProfile | null | undefined,
  countries: CountryOption[]
): {
  country: CountryOption | null;
  countryCode: CountryOption | null;
  localNumber: string;
} {
  const userCountry =
    user?.country && typeof user.country === "object"
      ? (user.country as { _id?: string; id?: string; code?: string })
      : null;
  const userCountryId = String(userCountry?._id ?? userCountry?.id ?? "").trim();
  const matchById =
    userCountryId &&
    countries.find((c) => c.countryId === userCountryId);
  const matchByCode =
    !matchById &&
    userCountry?.code &&
    countries.find(
      (c) => c.code.toUpperCase() === String(userCountry.code).toUpperCase()
    );

  const userPhoneCode = String(user?.phoneCode ?? "").trim();
  const matchByPhoneCode =
    userPhoneCode &&
    countries.find((c) =>
      dialCodesMatch(c.phoneCode || c.dialCode, userPhoneCode)
    );

  const country = matchById || matchByCode || null;
  const uae = countries.find((c) => c.code === "AE") || null;
  const countryCode = matchByPhoneCode || country || uae || countries[0] || null;
  const localNumber = extractLocalPhoneDigits(
    user?.phoneNumberWithoutCode,
    user?.phoneNumber,
    userPhoneCode || countryCode?.phoneCode || countryCode?.dialCode
  );

  return { country, countryCode, localNumber };
}

function MobilenumberModal({
  open,
  onClose,
  onNext,
}: MobilenumberModalProps) {
  const navigate = useNavigate();
  const countryRef = useRef<HTMLDivElement | null>(null);
  const mobileRef = useRef<HTMLDivElement | null>(null);

  const [countriesList, setCountriesList] = useState<CountryOption[]>([]);
  const [isLoadingCountries, setIsLoadingCountries] = useState(false);
  const [countriesLoadError, setCountriesLoadError] = useState<string | null>(
    null
  );

  const [selectedCountryCode, setSelectedCountryCode] =
    useState<CountryOption | null>(null);
  const [selectedCountry, setSelectedCountry] = useState<CountryOption | null>(
    null
  );
  const [mobileNumber, setMobileNumber] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileUpdateError, setProfileUpdateError] = useState<string | null>(
    null
  );
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [countryCodeSearchQuery, setCountryCodeSearchQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        countryRef.current &&
        !countryRef.current.contains(target)
      ) {
        setCountryOpen(false);
      }

      if (
        mobileRef.current &&
        !mobileRef.current.contains(target)
      ) {
        setCountryCodeOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    let mounted = true;

    setCountriesLoadError(null);
    setProfileUpdateError(null);
    setIsUpdatingProfile(false);
    setCountryOpen(false);
    setCountryCodeOpen(false);
    setCountrySearchQuery("");
    setCountryCodeSearchQuery("");

    const load = async () => {
      setIsLoadingCountries(true);
      try {
        const [countriesResp, profileResp] = await Promise.all([
          getCountriesMasterData(),
          userGetProfile().catch(() => null),
        ]);
        const options = (countriesResp.data.items ?? [])
          .map((c) => normalizeCountryToOption(c))
          .filter(Boolean) as CountryOption[];

        if (!mounted) return;
        setCountriesList(options);

        const user = profileResp?.data?.user ?? null;
        const phoneFields = resolveModalPhoneFields(user, options);
        const defaultOption =
          options.find((c) => c.code === "AE") ?? options[0] ?? null;

        setSelectedCountry(phoneFields.country ?? defaultOption);
        setSelectedCountryCode(phoneFields.countryCode ?? defaultOption);
        setMobileNumber(phoneFields.localNumber);
      } catch {
        if (!mounted) return;
        setCountriesLoadError("Failed to load countries");
        setMobileNumber("");
      } finally {
        if (mounted) {
          setIsLoadingCountries(false);
        }
      }
    };

    load();

    return () => {
      mounted = false;
    };
  }, [open]);

  const filteredCountryCodes = useMemo(() => {
    const query = countryCodeSearchQuery.toLowerCase();
    return countriesList.filter((country) => {
      const dial = (country.dialCode ?? "").toLowerCase();
      const phone = (country.phoneCode ?? "").toLowerCase();
      return (
        country.name.toLowerCase().includes(query) ||
        dial.includes(query) ||
        phone.includes(query) ||
        dial.replace(/\+/g, "").includes(query.replace(/\+/g, ""))
      );
    });
  }, [countriesList, countryCodeSearchQuery]);

  const filteredCountries = useMemo(() => {
    const query = countrySearchQuery.toLowerCase();
    return countriesList.filter((country) =>
      country.name.toLowerCase().includes(query)
    );
  }, [countriesList, countrySearchQuery]);

  const handleNext = async () => {
    if (isUpdatingProfile) return;
    const country = selectedCountry;
    const phoneCountry = selectedCountryCode;
    const localDigits = mobileNumber.replace(/\D/g, "");

    if (!country || !phoneCountry) {
      setProfileUpdateError("Please select a country");
      return;
    }
    if (!localDigits) {
      setProfileUpdateError("Please enter your mobile number");
      return;
    }

    const phoneCodeNormalized = normalizeDialCode(
      phoneCountry.dialCode || phoneCountry.phoneCode
    );
    if (!phoneCodeNormalized) {
      setProfileUpdateError("Please select a valid country dial code");
      return;
    }

    setProfileUpdateError(null);
    setIsUpdatingProfile(true);

    try {
      await userUpdateProfile({
        countryId: country.countryId,
        phoneNumber: localDigits,
        phoneCode: phoneCodeNormalized,
      });

      if (onNext) {
        onNext();
      } else {
        onClose();
        navigate("/?showAccountCreated=true");
      }
    } catch (err: unknown) {
      const maybeError = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const apiMessage =
        maybeError.response?.data?.message ||
        maybeError.response?.data?.error ||
        maybeError.message;
      setProfileUpdateError(apiMessage || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // `onSkip` exists for future UX; currently not rendered in UI.

  const showLoader = isLoadingCountries || isUpdatingProfile;

  return (
    open && (
      <div className="mobile-modal-overlay" onClick={() => { onClose(); setCountryOpen(false); setCountryCodeOpen(false); }}>
        <div className="mobile-modal" onClick={(e) => e.stopPropagation()}>
          {showLoader && (
            <Box className="mobile-modal__loader">
              <Loader size={80} margin={0} />
              {isUpdatingProfile && (
                <Typography className="mobile-modal__loader-text">
                  Saving...
                </Typography>
              )}
            </Box>
          )}
          <div className="mobile-modal-header">
            <div className="mobile-modal-close-icon" onClick={onClose}>
              <ModalCloseIcon width="16" height="16" />
            </div>
          </div>
          <div className="mobile-modal-content">
            <Typography component="h2" className="mobile-modal-title">
              For greater experience, please add the following details
            </Typography>

            <div className="mobile-modal-form-fields">
              <div ref={countryRef}>
                <div
                  className="mobile-modal-form-field"
                  onClick={() => {
                    setCountryOpen(!countryOpen);
                    setCountryCodeOpen(false);
                  }}
                >
                  <h6 className="mobile-modal-form-field-label">Country</h6>
                  <div className="mobile-modal-form-field-select">
                    <h6 className="mobile-modal-form-field-select-text">
                      {selectedCountry ? selectedCountry.name : "Select country"}
                    </h6>
                    <DownArrowIconBlack width="12" height="8" />
                  </div>
                </div>

                {countryOpen && (
                  <div className="mobile-country-dropdown">
                    <div className="mobile-country-search-wrapper">
                      <SearchIcon width="24" height="24" />
                      <input
                        type="text"
                        placeholder="Search country..."
                        className="mobile-country-search"
                        value={countrySearchQuery}
                        onChange={(e) => setCountrySearchQuery(e.target.value)}
                      />
                    </div>

                    <div className="mobile-country-list">
                      {filteredCountries.map((country) => (
                        <div
                          key={country.countryId}
                          className="mobile-country-item"
                          onClick={() => {
                            setSelectedCountry(country);
                            setCountryOpen(false);
                          }}
                        >
                          <div className="mobile-country-item-flag-image-wrapper">
                            <img src={country.flag} className="mobile-flag-small" />
                          </div>
                          <span className="mobile-country-item-name">
                            {country.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/*Mobilenumber dropdown*/}
              <div className="mobile-modal-form-field">
                <h6 className="mobile-modal-form-field-label">Mobile No.</h6>
                <div className="mobile-modal-form-field-mobile-number-wrapper">
                  <div ref={mobileRef}>
                    <div
                      onClick={() => {
                        setCountryCodeOpen(!countryCodeOpen);
                        setCountryOpen(false);
                      }}
                      className="mobile-modal-form-field-flag-image-wrapper"
                    >
                      <div className="mobile-modal-form-field-flag-image">
                        <img
                          src={selectedCountryCode?.flag ?? ""}
                          className="mobile-modal-form-field-flag-image-image"
                        />
                      </div>
                      <DownArrowIconBlack width="12" height="8" />
                    </div>

                    {countryCodeOpen && (
                      <div className="mobile-countrycode-dropdown">
                        <div className="mobile-country-search-wrapper">
                          <SearchIcon width="24" height="24" />
                          <input
                            type="text"
                            placeholder="Search country..."
                            className="mobile-country-search"
                            value={countryCodeSearchQuery}
                            onChange={(e) =>
                              setCountryCodeSearchQuery(e.target.value)
                            }
                          />
                        </div>

                        <div className="mobile-country-list">
                          {filteredCountryCodes.map((country) => (
                            <div
                              key={country.countryId}
                              className="mobile-country-item"
                              onClick={() => {
                                setSelectedCountryCode(country);
                                setCountryCodeOpen(false);
                              }}
                            >
                              <div className="mobile-country-item-flag-image-wrapper">
                                <img
                                  src={country.flag}
                                  className="mobile-flag-small"
                                />
                              </div>
                              <span className="mobile-country-item-name">
                                {country.name} {country.dialCode}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <input
                    type="text"
                    placeholder="Enter mobile number"
                    className="mobile-modal-form-field-mobile-number-input"
                    value={mobileNumber}
                    onChange={(e) =>
                      setMobileNumber(e.target.value.replace(/\D/g, ""))
                    }
                  />
                </div>
              </div>
            </div>

            {countriesLoadError && (
              <Typography color="error" sx={{ mt: 1, textAlign: "center" }}>
                {countriesLoadError}
              </Typography>
            )}

            {profileUpdateError && (
              <Typography color="error" sx={{ mt: 1, textAlign: "center" }}>
                {profileUpdateError}
              </Typography>
            )}

            <Button
              fullWidth
              variant="contained"
              className="mobile-modal-next-btn"
              onClick={handleNext}
              disabled={
                isLoadingCountries ||
                isUpdatingProfile ||
                !selectedCountry ||
                !selectedCountryCode ||
                !mobileNumber.trim()
              }
            >
              Next
            </Button>
            {/* <Typography className="pf-modal__resendText" style={{ marginTop: "16px" }}>
              <span onClick={handleSkip} className="pf-modal__resendLink">
                Skip
              </span>
            </Typography> */}
          </div>
        </div>
      </div>
    )

  );
}

export default MobilenumberModal;
// return (
//   open && (
//     <div className="mobile-modal-overlay" onClick={onClose}>
//       <div className="mobile-modal" onClick={(e) => e.stopPropagation()}>
//         <div className="mobile-modal-header">
//           <div className="mobile-modal-close-icon" onClick={onClose}>
//             <ModalCloseIcon width="16" height="16" />
//           </div>
//         </div>
//         <div className="mobile-modal-content">
//           <Typography component="h2" className="mobile-modal-title">
//             For greater experience, please add the following details
//           </Typography>

//           <Box className="pf-modal__formFields">
//             <Box className="pf-modal__formField">
//               <Typography component="label" className="pf-modal__fieldLabel">
//                 Country
//               </Typography>
//               <FormControl className="pf-modal__countryCodeSelect" fullWidth>
//                 <Select
//                   value={selectedCountry?.code || ""}
//                   onChange={(e) => {
//                     const country = countries.find(
//                       (c) => c.code === e.target.value
//                     );
//                     if (country) {
//                       setSelectedCountry(country);
//                       setCountrySearchQuery("");
//                     }
//                   }}
//                   open={countryOpen}
//                   onOpen={() => {
//                     setCountryOpen(true);
//                     setCountrySearchQuery("");
//                   }}
//                   onClose={() => {
//                     setCountryOpen(false);
//                     setCountrySearchQuery("");
//                   }}
//                   displayEmpty
//                   renderValue={() => {
//                     if (selectedCountry) {
//                       return (
//                         <Box className="pf-modal__countryCodeDisplay">
//                           <Box className="pf-modal__countryCodeDisplay-inner">
//                             <img
//                               src={selectedCountry.flag}
//                               alt={selectedCountry.name}
//                               className="pf-modal__flagImage"
//                             />
//                             <span>{selectedCountry.name}</span>
//                           </Box>
//                         </Box>
//                       );
//                     }
//                     return <span style={{ color: "#9ca3af" }}>Select country</span>;
//                   }}
//                   IconComponent={() => (
//                     <DownArrowIconBlack className="pf-modal__selectIcon" />
//                   )}
//                   MenuProps={{
//                     PaperProps: {
//                       className: "pf-modal__dropdownMenu",
//                       onKeyDown: (e: React.KeyboardEvent) => {
//                         // Prevent Select from handling keyboard when typing in search
//                         const target = e.target as HTMLElement;
//                         if (
//                           target.tagName === "INPUT" ||
//                           target.closest(".pf-modal__searchWrapper")
//                         ) {
//                           e.stopPropagation();
//                         }
//                       },
//                     },
//                     anchorOrigin: {
//                       vertical: "bottom",
//                       horizontal: "left",
//                     },
//                     transformOrigin: {
//                       vertical: "top",
//                       horizontal: "left",
//                     },
//                     disableAutoFocusItem: true,
//                   }}
//                 >
//                   <Box
//                     className="pf-modal__searchWrapper"
//                     onClick={(e) => e.stopPropagation()}
//                     onMouseDown={(e) => {
//                       e.stopPropagation();
//                     }}
//                   >
//                     <TextField
//                       placeholder="Search country"
//                       variant="outlined"
//                       size="small"
//                       value={countrySearchQuery}
//                       onChange={(e) => {
//                         e.stopPropagation();
//                         setCountrySearchQuery(e.target.value);
//                       }}
//                       onClick={(e) => {
//                         e.stopPropagation();
//                         e.preventDefault();
//                       }}
//                       onFocus={(e) => {
//                         e.stopPropagation();
//                       }}
//                       onKeyDown={(e) => {
//                         e.stopPropagation();
//                         // Prevent arrow keys from navigating Select options
//                         if (
//                           e.key === "ArrowUp" ||
//                           e.key === "ArrowDown" ||
//                           e.key === "Home" ||
//                           e.key === "End"
//                         ) {
//                           e.preventDefault();
//                         }
//                       }}
//                       onKeyUp={(e) => {
//                         e.stopPropagation();
//                       }}
//                       InputProps={{
//                         startAdornment: (
//                           <InputAdornment position="start">
//                             <SearchIcon />
//                           </InputAdornment>
//                         ),
//                       }}
//                       className="pf-modal__searchField"
//                       autoFocus
//                     />
//                   </Box>
//                   {/* <Box className="pf-modal__dropdownWrapper"> */}
//                   {filteredCountries.length > 0 ? (
//                     filteredCountries.map((country) => (
//                       <MenuItem
//                         key={country.code}
//                         value={country.code}
//                         className="pf-modal__dropdownItem"
//                       >
//                         <img
//                           src={country.flag}
//                           alt={country.name}
//                           className="pf-modal__flagImage"
//                         />
//                         <ListItemText
//                           primary={country.name}
//                           className="pf-modal__countryName"
//                         />
//                       </MenuItem>
//                     ))
//                   ) : (
//                     <MenuItem disabled className="pf-modal__dropdownItem">
//                       No countries found
//                     </MenuItem>
//                   )}
//                   {/* </Box> */}
//                 </Select>
//               </FormControl>
//             </Box>

//             <Box className="pf-modal__formField">
//               <Typography component="label" className="pf-modal__fieldLabel">
//                 Mobile No.
//               </Typography>
//               <Box className="pf-modal__mobileInputWrapper">
//                 <FormControl className="pf-modal__countryCodeSelect">
//                   <Select
//                     value={selectedCountryCode.code}
//                     onChange={(e) => {
//                       const country = countries.find(
//                         (c) => c.code === e.target.value
//                       );
//                       if (country) {
//                         setSelectedCountryCode(country);
//                         setCountryCodeSearchQuery("");
//                       }
//                     }}
//                     open={countryCodeOpen}
//                     onOpen={() => {
//                       setCountryCodeOpen(true);
//                       setCountryCodeSearchQuery("");
//                     }}
//                     onClose={() => {
//                       setCountryCodeOpen(false);
//                       setCountryCodeSearchQuery("");
//                     }}
//                     renderValue={() => (
//                       <Box className="pf-modal__countryCodeDisplay">
//                         <img
//                           src={selectedCountryCode.flag}
//                           alt={selectedCountryCode.name}
//                           className="pf-modal__flagImage"
//                         />
//                         {/* <span className="pf-modal__dialCode">({selectedCountryCode.dialCode})</span> */}
//                       </Box>
//                     )}
//                     IconComponent={() => (
//                       <DownArrowIconBlack className="pf-modal__selectIcon" />
//                     )}
//                     MenuProps={{
//                       PaperProps: {
//                         className: "pf-modal__dropdownMenu",
//                         onKeyDown: (e: React.KeyboardEvent) => {
//                           // Prevent Select from handling keyboard when typing in search
//                           const target = e.target as HTMLElement;
//                           if (
//                             target.tagName === "INPUT" ||
//                             target.closest(".pf-modal__searchWrapper")
//                           ) {
//                             e.stopPropagation();
//                           }
//                         },
//                       },
//                       anchorOrigin: {
//                         vertical: "bottom",
//                         horizontal: "left",
//                       },
//                       transformOrigin: {
//                         vertical: "bottom",
//                         horizontal: "left",
//                       },
//                       disableAutoFocusItem: true,
//                     }}
//                   >
//                     <Box
//                       className="pf-modal__searchWrapper"
//                       onClick={(e) => e.stopPropagation()}
//                       onMouseDown={(e) => {
//                         e.stopPropagation();
//                       }}
//                     >
//                       <TextField
//                         placeholder="Search country code"
//                         variant="outlined"
//                         size="small"
//                         value={countryCodeSearchQuery}
//                         onChange={(e) => {
//                           e.stopPropagation();
//                           setCountryCodeSearchQuery(e.target.value);
//                         }}
//                         onClick={(e) => {
//                           e.stopPropagation();
//                           e.preventDefault();
//                         }}
//                         onFocus={(e) => {
//                           e.stopPropagation();
//                         }}
//                         onKeyDown={(e) => {
//                           e.stopPropagation();
//                           // Prevent arrow keys from navigating Select options
//                           if (
//                             e.key === "ArrowUp" ||
//                             e.key === "ArrowDown" ||
//                             e.key === "Home" ||
//                             e.key === "End"
//                           ) {
//                             e.preventDefault();
//                           }
//                         }}
//                         onKeyUp={(e) => {
//                           e.stopPropagation();
//                         }}
//                         InputProps={{
//                           startAdornment: (
//                             <InputAdornment position="start">
//                               <SearchIcon />
//                             </InputAdornment>
//                           ),
//                         }}
//                         className="pf-modal__searchField"
//                         autoFocus
//                       />
//                     </Box>
//                     {/* <Box className="pf-modal__dropdownWrapper"> */}
//                     {filteredCountryCodes.length > 0 ? (
//                       filteredCountryCodes.map((country) => (
//                         <MenuItem
//                           key={country.code}
//                           value={country.code}
//                           className="pf-modal__dropdownItem"
//                         >
//                           <img
//                             src={country.flag}
//                             alt={country.name}
//                             className="pf-modal__flagImage"
//                           />
//                           <ListItemText
//                             primary={
//                               <span>
//                                 {country.name} <span className="pf-modal__dialCode">({country.dialCode})</span>
//                               </span>
//                             }
//                             className="pf-modal__countryName"
//                           />
//                         </MenuItem>
//                       ))
//                     ) : (
//                       <MenuItem disabled className="pf-modal__dropdownItem">
//                         No countries found
//                       </MenuItem>
//                     )}
//                     {/* </Box> */}
//                   </Select>
//                 </FormControl>
//                 <TextField
//                   fullWidth
//                   placeholder="Enter mobile number"
//                   variant="outlined"
//                   className="pf-modal__textInput"
//                   value={mobileNumber}
//                   onChange={(e) => setMobileNumber(e.target.value)}
//                   type="tel"
//                 />
//               </Box>
//             </Box>

//           </Box>

//           <Button
//             fullWidth
//             variant="contained"
//             className="pf-modal__verifyBtn mobile-modal-next-btn"
//             onClick={handleNext}
//           >
//             Next
//           </Button>
//           {/* <Typography className="pf-modal__resendText" style={{ marginTop: "16px" }}>
//             <span onClick={handleSkip} className="pf-modal__resendLink">
//               Skip
//             </span>
//           </Typography> */}
//         </div>
//       </div>
//     </div>
//   )

// );