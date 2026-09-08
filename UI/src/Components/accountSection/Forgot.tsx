import { useState } from "react";
import {
  Box,
  Button,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import {
  PfOrangeLogoIcon,
  RightArrowRoundFillIcon,
} from "../parts/icon";
import { useNavigate } from "react-router-dom";
import OTPVerificationModal from "./OTPVerificationModal";
import LoginImageSection from "./LoginImageSection";
import Loader from "../loader/loader";
import { userSendOtp } from "../../services/apiService";

function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleBack = () => {
    navigate("/login");
  };

  const handleNavigateToLogin = () => {
    navigate("/login");
  };

  const handleGetOtp = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const emailTrimmed = email.trim();
    if (!emailTrimmed) return;

    setIsSendingOtp(true);
    setErrorMessage(null);

    try {
      await userSendOtp({ email: emailTrimmed });
      setOtpModalOpen(true);
    } catch (err: unknown) {
      const maybeError = err as {
        response?: { data?: { message?: string; error?: string } };
        message?: string;
      };
      const apiMessage =
        maybeError.response?.data?.message ||
        maybeError.response?.data?.error ||
        maybeError.message;
      setErrorMessage(apiMessage || "Failed to send OTP");
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleCloseOtpModal = () => {
    setOtpModalOpen(false);
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
            {isSendingOtp && (
              <Box className="pf-login__card-loader">
                <Loader size={80} margin={0} />
                <Typography className="pf-login__card-loader-text">
                  Sending OTP...
                </Typography>
              </Box>
            )}
            <Box className="pf-login__logo" aria-label="Molumulk">
              <PfOrangeLogoIcon />
            </Box>

            <Typography component="h1" className="pf-login__title">
              Forgot password
            </Typography>

            <Box
              component="form"
              noValidate
              autoComplete="off"
              className="pf-login__form"
              onSubmit={handleGetOtp}
            >
              <TextField
                fullWidth
                placeholder="Email address"
                variant="outlined"
                className="pf-login__field"
                InputLabelProps={{ shrink: true }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
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
                onClick={handleGetOtp}
                type="submit"
                disabled={!email.trim() || isSendingOtp}
              >
                {isSendingOtp ? "Sending..." : "Get OTP"}
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

      <OTPVerificationModal
        open={otpModalOpen}
        onClose={handleCloseOtpModal}
        email={email.trim()}
      />
    </Box>
  );
}

export default ForgotPassword;
