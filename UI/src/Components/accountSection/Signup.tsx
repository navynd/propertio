import { useState } from "react";
import { Box, Button, Divider, IconButton, Link, TextField, Typography } from "@mui/material";
import {
  PfOrangeLogoIcon,
  LoginGoogleIcon,
  PasswordEyeIcon,
  RightArrowRoundFillIcon,
  LoginAppleIcon,
} from "../parts/icon";
import { useLocation, useNavigate } from "react-router-dom";
import LoginImageSection from "./LoginImageSection";
import MobilenumberModal from "./MobilenumberModal";
import OTPVerificationModal from "./OTPVerificationModal";
import {
  setAuthSession,
  shouldCollectPhoneAndCountry,
  userLogin,
  userRegister,
  userSocialLogin,
} from "../../services/apiService";
import { getAppleSignInPayload } from "../../services/appleIdentity";
import { getGoogleIdToken } from "../../services/googleIdentity";

function Signup() {
  const navigate = useNavigate();
  const location = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [mobilenumberModalOpen, setMobilenumberModalOpen] = useState(false);
  const [otpModalOpen, setOtpModalOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deriveNameFromEmail = (rawEmail: string) => {
    const trimmed = rawEmail.trim();
    const localPart = trimmed.split("@")[0] ?? "";

    // Convert separators like `john.doe`, `john_doe`, `john-doe` to words
    const words = localPart
      .replace(/[._-]+/g, " ")
      .split(" ")
      .map((w) => w.trim())
      .filter(Boolean);

    const capitalize = (s: string) =>
      s.length ? s[0].toUpperCase() + s.slice(1) : s;

    const first = words[0] ? capitalize(words[0]) : "User";
    // Backend requires lastName; if we only have one word, fall back to `User`
    const last = words.length > 1 ? capitalize(words[words.length - 1]) : "User";

    return { firstName: first, lastName: last };
  };

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };
  const handleRegister = async () => {
    if (!email.trim() || !password) {
      return;
    }

    const { firstName, lastName } = deriveNameFromEmail(email);
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      await userRegister({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
      });
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
      setErrorMessage(apiMessage || "Registration failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSocialLogin = async (provider: "google" | "apple") => {
    setIsSubmitting(true);
    setErrorMessage(null);
    try {
      const socialPayload =
        provider === "google"
          ? { token: await getGoogleIdToken() }
          : await getAppleSignInPayload();

      const response = await userSocialLogin({
        provider,
        token: socialPayload.token,
        ...(provider === "apple"
          ? { user: socialPayload.user ?? {} }
          : {}),
      });
      setAuthSession(response.data.tokens, response.data.user);
      if (shouldCollectPhoneAndCountry(response.data.user)) {
        setMobilenumberModalOpen(true);
      } else {
        navigate("/?showLoginSuccess=true");
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
      setErrorMessage(apiMessage || "Social signup failed");
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleBack = () => {
    navigate("/login");
  };
  const handleCloseMobilenumberModal = () => {
    setMobilenumberModalOpen(false);
  };
  const handleNavigateToLogin = () => {
    navigate("/login");
  };

  return (
    <Box className="pf-login">
      <LoginImageSection key={location.pathname} />

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
          <Box className="pf-login__card" component="section">
            <Box className="pf-login__logo" aria-label="Estatehub">
              <PfOrangeLogoIcon />
            </Box>

            <Typography component="h1" className="pf-login__title">
              Create your Account
            </Typography>

            <Box
              component="form"
              noValidate
              autoComplete="off"
              className="pf-login__form"
            >
              <TextField
                fullWidth
                placeholder="Email address"
                variant="outlined"
                className="pf-login__field"
                InputLabelProps={{ shrink: true }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />

              <TextField
                fullWidth
                placeholder="Password"
                variant="outlined"
                type={showPassword ? "text" : "password"}
                className="pf-login__field"
                InputLabelProps={{ shrink: true }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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

              <Button
                fullWidth
                variant="contained"
                color="primary"
                className="pf-login__submit"
                onClick={handleRegister}
                disabled={
                  !email.trim() ||
                  !password ||
                  isSubmitting
                }
              >
                Continue
              </Button>
            </Box>

            {errorMessage && (
              <Typography color="error" sx={{ mt: 1, textAlign: "center" }}>
                {errorMessage}
              </Typography>
            )}

            <Typography className="pf-login__signup">
              Already have an account?{" "}
              <Link onClick={handleNavigateToLogin} underline="none">
                Sign in
              </Link>
            </Typography>

{/* 
            <Divider className="pf-login__divider">
              <span>OR</span>
            </Divider>

            <Box className="pf-login__social">
              <Button
                variant="outlined"
                className="pf-login__socialBtn"
                fullWidth
                startIcon={<LoginGoogleIcon />}
                onClick={() => handleSocialLogin("google")}
              >
                Continue with Google
              </Button>

              <Button
                variant="outlined"
                className="pf-login__socialBtn pf-login__socialBtn--facebook"
                fullWidth
                startIcon={<LoginAppleIcon />}
                onClick={() => handleSocialLogin("apple")}
              >
                Continue with Apple ID
              </Button>
            </Box>
            */}

            <Typography className="pf-login__terms">
              By continuing you accept Estatehub’s{" "}
              <Link href="#" underline="none">
                Terms of use
              </Link>{" "}
              and{" "}
              <Link href="#" underline="none">
                Privacy policy
              </Link>
            </Typography>
          </Box>
        </Box>
      </Box>
      <MobilenumberModal
        open={mobilenumberModalOpen}
        onClose={handleCloseMobilenumberModal}
      />

      <OTPVerificationModal
        open={otpModalOpen}
        onClose={() => setOtpModalOpen(false)}
        email={email}
        onVerified={async () => {
          setOtpModalOpen(false);
          setIsSubmitting(true);
          setErrorMessage(null);
          try {
            const loginResp = await userLogin({
              email: email.trim(),
              password,
              rememberMe: true,
            });
            setAuthSession(loginResp.data.tokens, loginResp.data.user);
            if (shouldCollectPhoneAndCountry(loginResp.data.user)) {
              setMobilenumberModalOpen(true);
            } else {
              navigate("/?showLoginSuccess=true");
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
            setErrorMessage(apiMessage || "Failed to sign in after OTP");
          } finally {
            setIsSubmitting(false);
          }
        }}
      />
    </Box>
  );
}

export default Signup;
