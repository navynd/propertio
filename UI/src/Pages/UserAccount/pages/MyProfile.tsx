import { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  TextField,
  Typography,
  Snackbar,
  Alert,
} from "@mui/material";
import profileless from "../../../assets/img/profileless.png";
import {
  DownArrowIconBlack,
  SearchIcon,
  UploadArrowIcon,
  ToasterTickIcon,
} from "../../../Components/parts/icon";
import Loader from "../../../Components/loader/loader";

import {
  getCountriesMasterData,
  getSupportedUrlsMasterData,
  userGetProfile,
  userUpdateProfile,
  userUploadProfilePicture,
  userRemoveProfilePicture,
  syncAuthUserFromProfileApi,
  type MasterCountry,
  type UserProfile,
  type UserProfileCountry,
} from "../../../services/apiService";
import {
  dialCodesMatch,
  extractLocalPhoneDigits,
  normalizeDialCode,
} from "../../../utils/phoneWhatsapp";
import {
  buildUserProfilePictureUrl,
  hasUploadedProfilePicture,
} from "../../../utils/userProfileMedia";

type CountryOption = {
  _id?: string;
  id?: string;
  name: string;
  code?: string;
  phoneCode?: string;
  flag?: string;
};

function isHttpUrl(value: unknown): value is string {
  return typeof value === "string" && /^https?:\/\//i.test(value.trim());
}

function isProfileCountry(
  value: UserProfile["country"]
): value is UserProfileCountry {
  return Boolean(value && typeof value === "object" && !Array.isArray(value));
}

function resolveProfilePhoneFields(
  user: UserProfile | null | undefined,
  countries: CountryOption[]
): {
  country: CountryOption | null;
  countryCode: CountryOption | null;
  localNumber: string;
} {
  const userCountry = isProfileCountry(user?.country) ? user.country : null;
  const userCountryId = String(userCountry?._id ?? userCountry?.id ?? "").trim();
  const matchById =
    userCountryId &&
    countries.find((c) => String(c._id || c.id || "") === userCountryId);
  const matchByCode =
    !matchById &&
    userCountry?.code &&
    countries.find(
      (c) => (c.code || "").toUpperCase() === String(userCountry.code).toUpperCase()
    );

  const userPhoneCode = String(user?.phoneCode ?? userCountry?.phoneCode ?? "").trim();
  const matchByPhoneCode =
    userPhoneCode &&
    countries.find((c) => dialCodesMatch(String(c.phoneCode ?? ""), userPhoneCode));

  const country = matchById || matchByCode || null;
  const uae =
    countries.find((c) => (c.code || "").toUpperCase() === "AE") || null;
  const countryCode = matchByPhoneCode || country || uae || countries[0] || null;

  const localNumber = extractLocalPhoneDigits(
    user?.phoneNumberWithoutCode,
    user?.phoneNumber,
    userPhoneCode || countryCode?.phoneCode || country?.phoneCode
  );

  return { country, countryCode, localNumber };
}

function readProfilePictureFilename(profilePicture: unknown): string | null {
  if (typeof profilePicture !== "string") return null;
  const raw = profilePicture.trim();
  return raw || null;
}

type ProfileFormErrors = {
  firstName?: string;
  lastName?: string;
  country?: string;
  countryCode?: string;
  mobileNumber?: string;
};

function validateProfileForm(input: {
  firstName: string;
  lastName: string;
  selectedCountry: CountryOption | null;
  selectedCountryCode: CountryOption | null;
  mobileNumber: string;
}): ProfileFormErrors {
  const errors: ProfileFormErrors = {};

  if (!input.firstName.trim()) {
    errors.firstName = "Please enter your first name";
  }
  if (!input.lastName.trim()) {
    errors.lastName = "Please enter your last name";
  }
  if (!input.selectedCountry) {
    errors.country = "Please select a country";
  }

  const localDigits = input.mobileNumber.replace(/\D/g, "");
  if (!input.selectedCountryCode) {
    errors.countryCode = "Please select a country code";
  } else {
    const phoneCodeNormalized = normalizeDialCode(
      input.selectedCountryCode.phoneCode ?? ""
    );
    if (!phoneCodeNormalized) {
      errors.countryCode = "Please select a valid country code";
    }
  }
  if (!localDigits) {
    errors.mobileNumber = "Please enter your mobile number";
  }

  return errors;
}

function MyProfile() {
  const maxSizeBytes = 10 * 1024 * 1024;

  const [showUpload, setShowUpload] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("Your profile picture is added");
  const [avatarSrc, setAvatarSrc] = useState<string>(profileless);
  const [profilePictureFilename, setProfilePictureFilename] = useState<
    string | null
  >(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProfileLoading, setIsProfileLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [toast, setToast] = useState<{
    open: boolean;
    message: string;
    severity: "success" | "error";
  }>({ open: false, message: "", severity: "success" });

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const successTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loaderTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uploadedUrlRef = useRef<string | null>(null);
  const handleSelectFileClick = () => {
    fileInputRef.current?.click();
  };
  const countryRef = useRef<HTMLDivElement | null>(null);
  const mobileRef = useRef<HTMLDivElement | null>(null);

  const [countries, setCountries] = useState<CountryOption[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userImgBaseUrl, setUserImgBaseUrl] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  const [selectedCountryCode, setSelectedCountryCode] =
    useState<CountryOption | null>(null);
  const [selectedCountry, setSelectedCountry] =
    useState<CountryOption | null>(null);
  const [mobileNumber, setMobileNumber] = useState("");
  const [countryCodeOpen, setCountryCodeOpen] = useState(false);
  const [countryCodeSearchQuery, setCountryCodeSearchQuery] = useState("");
  const [countryOpen, setCountryOpen] = useState(false);
  const [countrySearchQuery, setCountrySearchQuery] = useState("");
  const [formErrors, setFormErrors] = useState<ProfileFormErrors>({});

  const clearFormError = (field: keyof ProfileFormErrors) => {
    setFormErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const applyProfilePictureFromUser = (
    user: UserProfile | null | undefined,
    imgBase: string | null
  ) => {
    const pic = readProfilePictureFilename(user?.profilePicture);
    setProfilePictureFilename(pic);
    if (hasUploadedProfilePicture(pic)) {
      setAvatarSrc(buildUserProfilePictureUrl(imgBase, pic) ?? profileless);
    } else {
      setAvatarSrc(profileless);
    }
  };

  const hasRealProfilePhoto = useMemo(
    () =>
      Boolean(avatarSrc.startsWith("blob:")) ||
      hasUploadedProfilePicture(profilePictureFilename),
    [avatarSrc, profilePictureFilename]
  );

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

    // Use `click` so option clicks apply before close.
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  useEffect(() => {
    let mounted = true;
    setIsProfileLoading(true);
    Promise.all([userGetProfile(), getCountriesMasterData(), getSupportedUrlsMasterData()])
      .then(([profileResp, countriesResp, supportedResp]) => {
        if (!mounted) return;
        const user = profileResp.data?.user ?? null;
        setProfile(user);
        setFirstName(String(user?.firstName ?? "").trim());
        setLastName(String(user?.lastName ?? "").trim());
        setEmail(String(user?.email ?? "").trim());

        const supportedItemsRaw = supportedResp.data?.items as any;
        const map = Array.isArray(supportedItemsRaw)
          ? supportedItemsRaw.reduce((acc: any, cur: any) => ({ ...acc, ...cur }), {})
          : supportedItemsRaw || {};
        const userBase = typeof map?.userUrl?.img === "string" ? map.userUrl.img : null;
        setUserImgBaseUrl(userBase);

        const countryItems = (countriesResp.data?.items ?? []) as MasterCountry[];
        const mapped: CountryOption[] = countryItems
          .map((c) => ({
            _id: c._id,
            id: c.id,
            name: String(c.name ?? "").trim(),
            code: c.code,
            phoneCode: c.phoneCode || c.dialCode,
            flag: c.flag,
          }))
          .filter((c) => c.name);
        setCountries(mapped);

        const { country, countryCode, localNumber } = resolveProfilePhoneFields(
          user,
          mapped
        );
        setSelectedCountry(country);
        setSelectedCountryCode(countryCode);
        setMobileNumber(localNumber);

        applyProfilePictureFromUser(user, userBase);
      })
      .catch((err) => {
        console.error("[profile] load failed", err);
        if (mounted) {
          setToast({
            open: true,
            severity: "error",
            message: "Failed to load profile",
          });
        }
      })
      .finally(() => {
        if (mounted) setIsProfileLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFileSelect(file);
  };

  const handleFileSelect = async (file: File) => {
    if (file.size > maxSizeBytes) {
      setFileError("File size must be under 10MB.");
      setSelectedFileName(null);
      return;
    }

    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
    }
    setIsLoading(true);
    setFileError(null);
    setSelectedFileName(file.name);
    setShowUpload(false);
    setUploadMessage("Your profile picture is added");

    if (uploadedUrlRef.current) {
      URL.revokeObjectURL(uploadedUrlRef.current);
    }
    const objectUrl = URL.createObjectURL(file);
    uploadedUrlRef.current = objectUrl;
    setAvatarSrc(objectUrl);

    try {
      const resp = await userUploadProfilePicture(file);
      const url =
        resp.data?.uploads?.images?.[0]?.url ||
        (resp.data?.baseUrls?.images && resp.data?.uploads?.images?.[0]?.filename
          ? `${resp.data.baseUrls.images}${resp.data.uploads.images[0].filename}`
          : null);
      const updatedUser = resp.data?.user ?? profile;
      setProfile(updatedUser);
      applyProfilePictureFromUser(updatedUser, userImgBaseUrl);
      if (url && hasUploadedProfilePicture(updatedUser?.profilePicture)) {
        setAvatarSrc(url);
      }
      setUploadMessage("Profile picture updated");
      setUploadSuccess(true);
      setToast({
        open: true,
        severity: "success",
        message: "Profile picture updated",
      });
      syncAuthUserFromProfileApi(
        updatedUser as Record<string, unknown> | null | undefined
      );
    } catch (err) {
      console.error("[profile] upload failed", err);
      setFileError("Failed to upload profile picture");
      setToast({
        open: true,
        severity: "error",
        message: "Failed to upload profile picture",
      });
    } finally {
      setIsLoading(false);
      if (successTimeoutRef.current) clearTimeout(successTimeoutRef.current);
      successTimeoutRef.current = setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);
    }
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    const file = event.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
  };

  const handleDeletePhoto = () => {
    if (!hasRealProfilePhoto || isLoading) return;

    if (uploadedUrlRef.current) {
      URL.revokeObjectURL(uploadedUrlRef.current);
      uploadedUrlRef.current = null;
    }
    if (loaderTimeoutRef.current) {
      clearTimeout(loaderTimeoutRef.current);
    }
    const previousAvatarSrc = avatarSrc;
    const previousFilename = profilePictureFilename;
    setIsLoading(true);
    setAvatarSrc(profileless);
    setProfilePictureFilename("profileless.png");
    setShowUpload(false);
    setUploadMessage("Your profile picture is deleted");
    setUploadSuccess(true);
    if (successTimeoutRef.current) {
      clearTimeout(successTimeoutRef.current);
    }
    successTimeoutRef.current = setTimeout(() => {
      setUploadSuccess(false);
    }, 3000);
    userRemoveProfilePicture()
      .then((resp) => {
        const updatedUser = resp.data?.user ?? profile;
        setProfile(updatedUser);
        applyProfilePictureFromUser(updatedUser, userImgBaseUrl);
        syncAuthUserFromProfileApi(
          updatedUser as Record<string, unknown> | null | undefined
        );
        setToast({
          open: true,
          severity: "success",
          message: "Profile picture removed",
        });
      })
      .catch(() => {
        setAvatarSrc(previousAvatarSrc);
        setProfilePictureFilename(previousFilename);
        setToast({
          open: true,
          severity: "error",
          message: "Failed to remove profile picture",
        });
      })
      .finally(() => {
        loaderTimeoutRef.current = setTimeout(() => {
          setIsLoading(false);
        }, 600);
      });
  };

  const filteredCountryCodes = useMemo(() => {
    return countries.filter((c) => {
      const query = countryCodeSearchQuery.toLowerCase().replace(/\+/g, "");
      const phoneCode = String(c.phoneCode ?? "").toLowerCase();
      return (
        c.name.toLowerCase().includes(query) ||
        phoneCode.includes(query) ||
        phoneCode.replace(/\+/g, "").includes(query)
      );
    });
  }, [countries, countryCodeSearchQuery]);

  useEffect(() => {
    return () => {
      if (successTimeoutRef.current) {
        clearTimeout(successTimeoutRef.current);
      }
      if (loaderTimeoutRef.current) {
        clearTimeout(loaderTimeoutRef.current);
      }
    };
  }, []);

  // const filteredCountryCodes = countries.filter((country) => {
  //   const query = countryCodeSearchQuery.toLowerCase();
  //   return (
  //     country.name.toLowerCase().includes(query) ||
  //     country.dialCode.toLowerCase().includes(query) ||
  //     country.dialCode.replace(/\+/g, "").includes(query.replace(/\+/g, ""))
  //   );
  // });

  const filteredCountries = useMemo(() => {
    return countries.filter((country) =>
      country.name.toLowerCase().includes(countrySearchQuery.toLowerCase())
    );
  }, [countries, countrySearchQuery]);

  const showProfileLoader = isProfileLoading || isSaving;

  return (
    <div className="pf-account__page">
      <div className="pf-account__profile-card">
        {showProfileLoader && (
          <Box className="pf-account__profile-loader">
            <Loader size={80} margin={0} />
            {isSaving && (
              <Typography className="pf-account__profile-loader-text">
                Saving...
              </Typography>
            )}
          </Box>
        )}
        <section
          className="pf-account__profile-form"
          aria-labelledby="my-profile-heading"
        >
          <h2 className="pf-account__card-title" id="my-profile-heading">
            My profile
          </h2>

          <form
            className="pf-account__form"
            onSubmit={(event) => {
              event.preventDefault();
              if (isProfileLoading || isSaving) return;

              const validationErrors = validateProfileForm({
                firstName,
                lastName,
                selectedCountry,
                selectedCountryCode,
                mobileNumber,
              });
              if (Object.keys(validationErrors).length > 0) {
                setFormErrors(validationErrors);
                return;
              }

              setFormErrors({});
              const doSave = async () => {
                setIsSaving(true);
                try {
                  const countryId = String(
                    selectedCountry?._id || selectedCountry?.id || ""
                  ).trim();
                  const phoneCodeNormalized = normalizeDialCode(
                    String(selectedCountryCode?.phoneCode ?? "").trim()
                  );
                  const localDigits = mobileNumber.replace(/\D/g, "");

                  const resp = await userUpdateProfile({
                    firstName: firstName.trim(),
                    lastName: lastName.trim(),
                    countryId,
                    phoneCode: phoneCodeNormalized,
                    phoneNumber: localDigits,
                  });
                  const updatedUser = resp.data?.user as UserProfile | undefined;
                  setProfile(updatedUser ?? null);
                  if (updatedUser) {
                    syncAuthUserFromProfileApi(
                      updatedUser as unknown as Record<string, unknown>
                    );
                    const phoneFields = resolveProfilePhoneFields(
                      updatedUser,
                      countries
                    );
                    setSelectedCountry(phoneFields.country);
                    setSelectedCountryCode(phoneFields.countryCode);
                    setMobileNumber(phoneFields.localNumber);
                  }
                  setToast({
                    open: true,
                    severity: "success",
                    message: "Profile updated successfully",
                  });
                } catch (err) {
                  console.error("[profile] update failed", err);
                  setToast({
                    open: true,
                    severity: "error",
                    message: "Failed to update profile",
                  });
                } finally {
                  setIsSaving(false);
                }
              };
              void doSave();
            }}
          >
            <div className="pf-account__field-group pf-account__field-group--two">
              <div className="pf-account__field">
                <Typography
                  component="label"
                  className="pf-account__field-label"
                  htmlFor="first-name"
                >
                  First name
                </Typography>
                <TextField
                  id="first-name"
                  name="firstName"
                  value={firstName}
                  onChange={(e) => {
                    setFirstName(e.target.value);
                    clearFormError("firstName");
                  }}
                  className="pf-account__text-field"
                  error={Boolean(formErrors.firstName)}
                  helperText={formErrors.firstName}
                  inputProps={{ "aria-label": "First name" }}
                />
              </div>
              <div className="pf-account__field">
                <Typography
                  component="label"
                  className="pf-account__field-label"
                  htmlFor="last-name"
                >
                  Last name
                </Typography>
                <TextField
                  id="last-name"
                  name="lastName"
                  value={lastName}
                  onChange={(e) => {
                    setLastName(e.target.value);
                    clearFormError("lastName");
                  }}
                  className="pf-account__text-field"
                  error={Boolean(formErrors.lastName)}
                  helperText={formErrors.lastName}
                  inputProps={{ "aria-label": "Last name" }}
                />
              </div>
            </div>

            <div className="pf-account__field">
              <Typography
                component="label"
                className="pf-account__field-label"
                htmlFor="email"
              >
                Email Address
              </Typography>
              <TextField
                id="email"
                name="email"
                value={email}
                className="pf-account__text-field pf-account__text-field--readonly"
                InputProps={{ readOnly: true }}
                inputProps={{ "aria-label": "Email address" }}
              />
            </div>

            {/* <div className="pf-account__field">
              <Typography
                component="label"
                className="pf-account__field-label"
                htmlFor="phone"
              >
                Mobile No.
              </Typography>
              <Box className="pf-modal__mobileInputWrapper">
                <FormControl className="pf-account__country_code_select pf-modal__countryCodeSelect">
                  <Select
                    value={selectedCountryCode.code}
                    onChange={(e) => {
                      const next = countries.find(
                        (c) => c.code === e.target.value
                      );
                      if (next) {
                        setSelectedCountryCode(next);
                        setCountryCodeSearchQuery("");
                      }
                    }}
                    open={countryCodeOpen}
                    onOpen={() => {
                      setCountryCodeOpen(true);
                      setCountryCodeSearchQuery("");
                    }}
                    onClose={() => {
                      setCountryCodeOpen(false);
                      setCountryCodeSearchQuery("");
                    }}
                    renderValue={() => (
                      <Box className="pf-modal__countryCodeDisplay">
                        <img
                          src={selectedCountryCode.flag}
                          alt={selectedCountryCode.name}
                          className="pf-account__country-flag"
                        />
                      </Box>
                    )}
                    IconComponent={() => (
                      <DownArrowIconBlack className="pf-modal__selectIcon" fill="#707070" />
                    )}
                    MenuProps={{
                      PaperProps: {
                        className: "pf-modal__dropdownMenu",
                        onKeyDown: (e: React.KeyboardEvent) => {
                          const target = e.target as HTMLElement;
                          if (
                            target.tagName === "INPUT" ||
                            target.closest(".pf-modal__searchWrapper")
                          ) {
                            e.stopPropagation();
                          }
                        },
                      },
                      anchorOrigin: { vertical: "bottom", horizontal: "left" },
                      transformOrigin: { vertical: "bottom", horizontal: "left" },
                      disableAutoFocusItem: true,
                    }}
                  >
                    <Box
                      className="pf-modal__searchWrapper"
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                    >
                      <TextField
                        placeholder="Search country code"
                        variant="outlined"
                        size="small"
                        value={countryCodeSearchQuery}
                        onChange={(e) => {
                          e.stopPropagation();
                          setCountryCodeSearchQuery(e.target.value);
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          e.preventDefault();
                        }}
                        onFocus={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (
                            e.key === "ArrowUp" ||
                            e.key === "ArrowDown" ||
                            e.key === "Home" ||
                            e.key === "End"
                          ) {
                            e.preventDefault();
                          }
                        }}
                        onKeyUp={(e) => e.stopPropagation()}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <SearchIcon />
                            </InputAdornment>
                          ),
                        }}
                        className="pf-modal__searchField"
                        autoFocus
                      />
                    </Box>
                    {filteredCountryCodes.length > 0 ? (
                      filteredCountryCodes.map((c) => (
                        <MenuItem
                          key={c.code}
                          value={c.code}
                          className="pf-modal__dropdownItem"
                        >
                          <img
                            src={c.flag}
                            alt={c.name}
                            className="pf-modal__flagImage"
                          />
                          <ListItemText
                            primary={
                              <span>
                                {c.name}{" "}
                                <span className="pf-modal__dialCode">
                                  ({c.dialCode})
                                </span>
                              </span>
                            }
                            className="pf-modal__countryName"
                          />
                        </MenuItem>
                      ))
                    ) : (
                      <MenuItem disabled className="pf-modal__dropdownItem">
                        No countries found
                      </MenuItem>
                    )}
                  </Select>
                </FormControl>
                <TextField
                  id="phone"
                  name="phone"
                  value={mobileNumber}
                  onChange={(e) => setMobileNumber(e.target.value)}
                  placeholder="Enter mobile number"
                  className="pf-modal__textInput pf-account__text-field"
                  inputProps={{ "aria-label": "Mobile number" }}
                  type="tel"
                />
              </Box>
            </div> */}

            {/*contry section*/}
            {/* <div className="pf-account__field">
              <Typography
                component="label"
                className="pf-account__field-label"
                htmlFor="country"
              >
                Country
              </Typography>
              <TextField
                select
                id="country"
                name="country"
                value={country}
                onChange={(event) => setCountry(event.target.value)}
                className="pf-account__select pf-modal__countryCodeSelect"
                inputProps={{ "aria-label": "Country" }}
                SelectProps={{
                  IconComponent: () => (
                    <DownArrowIconBlack className="pf-modal__selectIcon" fill="#707070" />
                  ),
                  MenuProps: {
                    PaperProps: {
                      className: "pf-dropdown__menu",
                    },
                  },
                }}
              >
                {countries.map((c) => (
                  <MenuItem
                    key={c.code}
                    value={c.name}
                    className="pf-dropdown__item"
                  >
                    {c.name}
                  </MenuItem>
                ))}
              </TextField>
            </div> */}
            <div className="mobile-modal-form-fields">
              <div ref={countryRef}>
                <div
                  className={`mobile-modal-form-field${formErrors.country ? " pf-account__field-control--error" : ""}`}
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
                  <div className="mobile-country-dropdown pf-account__dropdown-menu">
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
                          key={country._id || country.id || country.code || country.name}
                          className="mobile-country-item"
                          onClick={() => {
                            setSelectedCountry(country);
                            setCountryOpen(false);
                            clearFormError("country");
                          }}
                        >
                          <div className="mobile-country-item-flag-image-wrapper">
                            {isHttpUrl(country.flag) ? (
                              <img
                                src={country.flag}
                                className="mobile-flag-small"
                                alt={country.name}
                              />
                            ) : (
                              <span className="mobile-flag-small">🏳️</span>
                            )}
                          </div>
                          <span className="mobile-country-item-name">
                            {country.name}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {formErrors.country ? (
                  <Typography className="pf-account__field-error" component="p">
                    {formErrors.country}
                  </Typography>
                ) : null}
              </div>
              <div className={`mobile-modal-form-field${formErrors.mobileNumber || formErrors.countryCode ? " pf-account__field-control--error" : ""}`}>
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
                        {isHttpUrl(selectedCountryCode?.flag) ? (
                          <img
                            src={selectedCountryCode?.flag}
                            className="mobile-modal-form-field-flag-image-image"
                            alt={selectedCountryCode?.name || "Country"}
                          />
                        ) : (
                          <span className="mobile-modal-form-field-flag-image-image">
                            🏳️
                          </span>
                        )}
                      </div>
                      <DownArrowIconBlack width="12" height="8" />
                    </div>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter mobile number"
                    className="mobile-modal-form-field-mobile-number-input"
                    value={mobileNumber}
                    onChange={(e) => {
                      setMobileNumber(e.target.value.replace(/\D/g, ""));
                      clearFormError("mobileNumber");
                    }}
                  />
                </div>
                {countryCodeOpen && (
                  <div className="mobile-countrycode-dropdown pf-account__dropdown-menu">
                    <div className="mobile-country-search-wrapper">
                      <SearchIcon width="24" height="24" />
                      <input
                        type="text"
                        placeholder="Search country..."
                        className="mobile-country-search"
                        value={countryCodeSearchQuery}
                        onChange={(e) => setCountryCodeSearchQuery(e.target.value)}
                      />
                    </div>
                    {/* <input
                      type="text"
                      placeholder="Search..."
                      className="mobile-country-search"
                      value={countryCodeSearchQuery}
                      onChange={(e) => setCountryCodeSearchQuery(e.target.value)}
                    /> */}

                    <div className="mobile-country-list">
                      {filteredCountryCodes.map((country) => (
                        <div
                          key={country._id || country.id || country.code || country.name}
                          className="mobile-country-item"
                          onClick={() => {
                            setSelectedCountryCode(country);
                            setCountryCodeOpen(false);
                            clearFormError("countryCode");
                          }}
                        >
                          <div className="mobile-country-item-flag-image-wrapper">
                            {isHttpUrl(country.flag) ? (
                              <img
                                src={country.flag}
                                className="mobile-flag-small"
                                alt={country.name}
                              />
                            ) : (
                              <span className="mobile-flag-small">🏳️</span>
                            )}
                          </div>
                          <span className="mobile-country-item-name">
                            {country.name} {country.phoneCode || ""}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {formErrors.countryCode ? (
                  <Typography className="pf-account__field-error" component="p">
                    {formErrors.countryCode}
                  </Typography>
                ) : null}
                {formErrors.mobileNumber ? (
                  <Typography className="pf-account__field-error" component="p">
                    {formErrors.mobileNumber}
                  </Typography>
                ) : null}
              </div>
            </div>

            <Button
              type="submit"
              className="pf-account__save-button"
              disableElevation
              disabled={isProfileLoading || isSaving}
            >
              Save changes
            </Button>
          </form>
        </section>

        <aside
          className="pf-account__profile-photo"
          aria-labelledby="profile-photo-heading"
        >
          <h2
            className="pf-account__card-title pf-account__card-title--center"
            id="profile-photo-heading"
          >
            {showUpload
              ? <span>Upload <br></br> profile photo</span>
              : hasRealProfilePhoto
                ? "Your profile photo"
                : "Add your profile photo"}
          </h2>

          {showUpload ? (
            <Box className="pf-account__upload-card">
              <Box
                className="pf-account__upload-dropzone"
                onClick={handleSelectFileClick}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                role="button"
                tabIndex={0}
              >
                <UploadArrowIcon className="pf-account__upload-icon" />
                <p className="pf-account__upload-text-primary pf-account__upload-select-text">
                  Select a file or drag and drop here
                </p>
                <p className="pf-account__upload-text-secondary">
                  JPG, PNG or PDF, file size no more than 10MB
                </p>
                {selectedFileName && (
                  <p className="pf-account__upload-text-secondary">
                    Selected: {selectedFileName}
                  </p>
                )}
                {fileError && (
                  <p className="pf-account__upload-text-secondary" style={{ color: "#d3312f" }}>
                    {fileError}
                  </p>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".jpg,.jpeg,.png,.pdf"
                  style={{ display: "none" }}
                  onChange={handleFileChange}
                />
                <Button
                  type="button"
                  className="pf-account__upload-select"
                  disableElevation
                  onClick={(e) => {
                    e.stopPropagation();
                    handleSelectFileClick();
                  }}
                >
                  Select File
                </Button>
              </Box>
              <Button
                type="button"
                className="pf-account__upload-cancel"
                disableElevation
                onClick={() => setShowUpload(false)}
              >
                Cancel
              </Button>
            </Box>
          ) : (
            <>
              <div
                className={`pf-account__avatar-wrapper${isLoading ? " pf-account__avatar-wrapper--loading" : ""
                  }`}
              >
                <img
                  src={avatarSrc}
                  alt="Profile avatar"
                  className="pf-account__avatar"
                />
                {isLoading && (
                  <div className="pf-account__avatar-overlay">
                    <Loader />
                  </div>
                )}
              </div>

              <div className="pf-account__photo-actions">
                <Button
                  type="button"
                  className="pf-account__photo-button pf-account__photo-button--primary"
                  disableElevation
                  onClick={() => setShowUpload(true)}
                >
                  {hasRealProfilePhoto ? "Change photo" : "Add photo"}
                </Button>
                <Button
                  type="button"
                  className="pf-account__photo-button pf-account__photo-button--ghost"
                  disableElevation
                  onClick={handleDeletePhoto}
                  disabled={!hasRealProfilePhoto || isLoading}
                  aria-disabled={!hasRealProfilePhoto || isLoading}
                >
                  Delete photo
                </Button>
              </div>
              {uploadSuccess && (
                <div className="pf-account__upload-success">
                  <ToasterTickIcon width={14} height={14} style={{ fill: "#ffffff" }} />
                  <span>{uploadMessage}</span>
                </div>
              )}
            </>
          )}
        </aside>
      </div>
      <Snackbar
        open={toast.open}
        autoHideDuration={3500}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setToast((t) => ({ ...t, open: false }))}
          severity={toast.severity}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}

export default MyProfile;
