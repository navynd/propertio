import { useState } from "react";
import {
  Box,
  Button,
  Link,
  TextField,
  Typography,
  IconButton,
} from "@mui/material";
import {
  PfOrangeLogoIcon,
  RightArrowRoundFillIcon,
  PasswordEyeIcon,
} from "../parts/icon";
import { useLocation, useNavigate } from "react-router-dom";
import PasswordSuccessModal from "./PasswordSuccessModal";
import LoginImageSection from "./LoginImageSection";
import { userResetPassword } from "../../services/apiService";

const MIN_PASSWORD_LENGTH = 6;

type PasswordFieldErrors = {
  password?: string;
  rePassword?: string;
};

function validatePasswordForm(
  password: string,
  rePassword: string
): PasswordFieldErrors {
  const errors: PasswordFieldErrors = {};

  if (!password.trim()) {
    errors.password = "Please enter a password";
  } else if (password.length < MIN_PASSWORD_LENGTH) {
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters`;
  }

  if (!rePassword.trim()) {
    errors.rePassword = "Please re-enter your password";
  } else if (password !== rePassword) {
    errors.rePassword = "Passwords do not match";
  }

  return errors;
}

function ChangePassword() {
  const navigate = useNavigate();
  const location = useLocation();
  const emailFromQuery =
    new URLSearchParams(location.search).get("email") || "";
  const [passwordSuccModalOpen, setPasswordSuccModalOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRePassword, setShowRePassword] = useState(false);
  const [password, setPassword] = useState("");
  const [rePassword, setRePassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<PasswordFieldErrors>({});
  const [showValidation, setShowValidation] = useState(false);

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleToggleRePassword = () => {
    setShowRePassword((prev) => !prev);
  };

  const handleBack = () => {
    navigate("/login");
  };

  const handleNavigateToLogin = () => {
    navigate("/login");
  };

  const clearFieldError = (field: keyof PasswordFieldErrors) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPassword(e.target.value);
    clearFieldError("password");
  };

  const handleRePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRePassword(e.target.value);
    clearFieldError("rePassword");
  };

  const livePasswordError =
    showValidation || password.length > 0
      ? validatePasswordForm(password, rePassword).password
      : undefined;
  const liveRePasswordError =
    showValidation || rePassword.length > 0
      ? validatePasswordForm(password, rePassword).rePassword
      : undefined;

  const displayPasswordError = fieldErrors.password || livePasswordError;
  const displayRePasswordError = fieldErrors.rePassword || liveRePasswordError;

  const handleConfirmPassword = async (e?: React.FormEvent) => {
    e?.preventDefault();

    const validationErrors = validatePasswordForm(password, rePassword);
    if (Object.keys(validationErrors).length > 0) {
      setShowValidation(true);
      setFieldErrors(validationErrors);
      return;
    }

    if (!emailFromQuery) {
      setErrorMessage("Missing email for password reset.");
      return;
    }

    setIsResetting(true);
    setErrorMessage(null);
    setFieldErrors({});
    try {
      await userResetPassword({
        email: emailFromQuery,
        newPassword: password,
      });

      setPasswordSuccModalOpen(true);
      setTimeout(() => {
        handleClosePasswordSuccModal();
        navigate("/login");
      }, 2000);
    } catch (err: unknown) {
      const maybeError = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const apiMessage =
        maybeError.response?.data?.message ||
        maybeError.response?.data?.error ||
        maybeError.message;
      setErrorMessage(apiMessage || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  const handleClosePasswordSuccModal = () => {
    setPasswordSuccModalOpen(false);
  };

  return (
    <Box className="pf-login">
      <LoginImageSection />

      <Box className="pf-login__right">
        <button
          type="button"
          className="pf-login__back"
          onClick={handleBack}
          aria-label="Go back"
        >
          <RightArrowRoundFillIcon height={50} width={123} />
          <span>Back</span>
        </button>

        <Box className="pf-login__scroll">
          <Box className="pf-login__card card_center" component="section">
            <Box className="pf-login__logo" aria-label="Propertio">
              <PfOrangeLogoIcon />
            </Box>

            <Typography component="h1" className="pf-login__title">
              Change password
            </Typography>

            <Box
              component="form"
              noValidate
              autoComplete="off"
              className="pf-login__form"
              onSubmit={handleConfirmPassword}
            >
              <TextField
                fullWidth
                placeholder="Enter password"
                variant="outlined"
                type={showPassword ? "text" : "password"}
                className="pf-login__field"
                InputLabelProps={{ shrink: true }}
                value={password}
                onChange={handlePasswordChange}
                error={Boolean(displayPasswordError)}
                helperText={
                  displayPasswordError ||
                  (password.length === 0 ? "Use at least 6 characters" : "")
                }
                FormHelperTextProps={{
                  sx: displayPasswordError
                    ? undefined
                    : { color: "rgba(34, 34, 34, 0.55)" },
                }}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      edge="end"
                      onClick={handleTogglePassword}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                      className="pf-login__passwordToggle"
                    >
                      <PasswordEyeIcon closed={!showPassword} />
                    </IconButton>
                  ),
                }}
              />

              <TextField
                fullWidth
                placeholder="Re-enter password"
                variant="outlined"
                type={showRePassword ? "text" : "password"}
                className="pf-login__field"
                InputLabelProps={{ shrink: true }}
                value={rePassword}
                onChange={handleRePasswordChange}
                error={Boolean(displayRePasswordError)}
                helperText={displayRePasswordError || ""}
                InputProps={{
                  endAdornment: (
                    <IconButton
                      edge="end"
                      onClick={handleToggleRePassword}
                      aria-label={
                        showRePassword ? "Hide password" : "Show password"
                      }
                      className="pf-login__passwordToggle"
                    >
                      <PasswordEyeIcon closed={!showRePassword} />
                    </IconButton>
                  ),
                }}
              />

              {errorMessage && (
                <Typography color="error" sx={{ mt: 1, textAlign: "center" }}>
                  {errorMessage}
                </Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                color="primary"
                className="pf-login__submit"
                type="submit"
                disabled={isResetting}
              >
                {isResetting ? "Updating..." : "Confirm password"}
              </Button>
            </Box>

            <Typography className="pf-login__signup">
              Did you remember your password?{" "}
              <Link onClick={handleNavigateToLogin} underline="none">
                Login now
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>

      <PasswordSuccessModal
        open={passwordSuccModalOpen}
        onClose={handleClosePasswordSuccModal}
      />
    </Box>
  );
}

export default ChangePassword;
