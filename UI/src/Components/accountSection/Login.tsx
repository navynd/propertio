import { useState } from "react";
import { CheckmarkIcon, LoginAppleIcon } from "../parts/icon";
import {
  Box,
  Button,
  Checkbox,
  Divider,
  FormControlLabel,
  IconButton,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import {
  HeaderLogoIcon,
  LoginGoogleIcon,
  PasswordEyeIcon,
  RightArrowRoundFillIcon,
} from "../parts/icon";
import { useLocation, useNavigate } from "react-router-dom";
import MobilenumberModal from "./MobilenumberModal";
import LoginImageSection from "./LoginImageSection";
import { getAppleSignInPayload } from "../../services/appleIdentity";
import {
  setAuthSession,
  shouldCollectPhoneAndCountry,
  userLogin,
  userSocialLogin,
} from "../../services/apiService";
import { getGoogleIdToken } from "../../services/googleIdentity";

function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [showPassword, setShowPassword] = useState(false);
  const [mobilenumberModalOpen, setMobilenumberModalOpen] = useState(false);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleTogglePassword = () => {
    setShowPassword((prev) => !prev);
  };

  const handleNavigateToSignup = () => {
    navigate("/signup");
  };

  const handleNavigateToForgot = () => {
    navigate("/forgot");
  };

  const handleBack = () => {
    navigate("/");
  };

  const handleLogin = async () => {
    const id = identifier.trim();
    if (!id || !password) {
      return;
    }

    setIsLoggingIn(true);
    setErrorMessage(null);

    try {
      const isEmail = id.includes("@");
      const response = await userLogin({
        ...(isEmail ? { email: id } : { phoneNumber: id }),
        password,
        rememberMe,
      });

      const tokens = response.data.tokens;
      setAuthSession(tokens, response.data.user);

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

      setErrorMessage(apiMessage || "Login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleSocialApiLogin = async (provider: "google" | "apple") => {
    setIsLoggingIn(true);
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
          ? { user: (socialPayload as { user?: unknown }).user ?? {} }
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

      setErrorMessage(apiMessage || "Social login failed");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleCloseMobilenumberModal = () => {
    setMobilenumberModalOpen(false);
  };

  return (
    <Box className="pf-login">
      <LoginImageSection key={location.pathname} />

      <Box className="pf-login__right">
        <button
          type="button"
          className="pf-login__back"
          onClick={handleBack}
          aria-label="Go back to home"
        >
          <RightArrowRoundFillIcon height={18} width={18} />
          <span>Back</span>
        </button>

        <Box className="pf-login__scroll">
          <Box className="pf-login__card" component="section">
            <Box className="pf-login__logo" aria-label="Estatehub">
              <HeaderLogoIcon width={140} height={42} />
            </Box>

            <div className="pf-login__headerWrap">
              <Typography component="h1" className="pf-login__title">
                Login to your account
              </Typography>
              <Typography className="pf-login__subtitle">
                Welcome back. Enter your credentials to continue.
              </Typography>
            </div>

            <Box
              component="form"
              noValidate
              autoComplete="off"
              className="pf-login__form"
            >
              <TextField
                fullWidth
                placeholder="Email address or phone number"
                variant="outlined"
                className="pf-login__field"
                InputLabelProps={{ shrink: true }}
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
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

              <Box className="pf-login__options">
                <FormControlLabel
                  label="Remember me"
                  className="pf-login__remember"
                  control={
                    <Checkbox
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      icon={
                        <Box
                          sx={{
                            width: 17,
                            height: 17,
                            borderRadius: "5px",
                            border: "1px solid rgba(201, 169, 110, 0.4)",
                            backgroundColor: "rgba(255, 255, 255, 0.04)",
                          }}
                        />
                      }
                      checkedIcon={
                        <Box
                          sx={{
                            width: 17,
                            height: 17,
                            borderRadius: "5px",
                            backgroundColor: "#C9A96E",
                            border: "1px solid #C9A96E",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          <CheckmarkIcon sx={{ fontSize: 12, color: "#0A0A0A" }} width={12} height={12} />
                        </Box>
                      }
                    />
                  }
                />
                <Typography
                  className="pf-login__forgot"
                  onClick={handleNavigateToForgot}
                >
                  Forgot password?
                </Typography>
              </Box>

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
                onClick={handleLogin}
                disabled={!identifier.trim() || !password || isLoggingIn}
              >
                Login
              </Button>
            </Box>

            <Typography className="pf-login__signup">
              Don’t have an account?{" "}
              <Link onClick={handleNavigateToSignup} underline="none">
                Sign up
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
                onClick={() => handleSocialApiLogin("google")}
              >
                Continue with Google
              </Button>

              <Button
                variant="outlined"
                className="pf-login__socialBtn pf-login__socialBtn--facebook"
                fullWidth
                startIcon={<LoginAppleIcon />}
                onClick={() => handleSocialApiLogin("apple")}
              >
                Continue with Apple ID
              </Button>
            </Box>
            */}

            <Typography className="pf-login__terms">
              By continuing you accept Estatehub’s
              <br />
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
    </Box>
  );
}

export default Login;
