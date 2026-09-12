import { useState, useEffect } from "react";
import { Box, Typography } from "@mui/material";
import Login01Image from "../../assets/img/login01.png";
import Login02Image from "../../assets/img/login02.png";
import Login03Image from "../../assets/img/login03.png";

function LoginImageSection() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const loginImages = [Login01Image, Login02Image, Login03Image];
  const duration = 5000; // 5 sec

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % loginImages.length);
    }, duration);

    return () => clearInterval(interval);
  }, [loginImages.length]);

  return (
    <Box className="pf-login__left">
      <img
        src={loginImages[currentImageIndex]}
        alt="Estatehub Luxury Showcase"
        className="pf-login__leftImage"
      />

      <Box className="pf-login__leftOverlay">
        <Box className="pf-login__heroContent">
          <div className="pf-login__brandBadge">
            <span className="pf-login__brandDot" />
            <span>ESTATEHUB LUXURY COLLECTION</span>
          </div>

          <Typography variant="h2" className="pf-login__brandHeadline">
            Where Exceptional <br />
            <em>Living Begins</em>
          </Typography>

          <Typography className="pf-login__brandDesc">
            Access the world's finest private residences, off-plan penthouses, and premier investment portfolios across top global destinations.
          </Typography>

          <div className="pf-login__stats">
            <div className="pf-login__stat">
              <span className="pf-login__statNum">2,800+</span>
              <span className="pf-login__statLabel">Prime Listings</span>
            </div>
            <div className="pf-login__statDivider" />
            <div className="pf-login__stat">
              <span className="pf-login__statNum">100%</span>
              <span className="pf-login__statLabel">Verified Agents</span>
            </div>
            <div className="pf-login__statDivider" />
            <div className="pf-login__stat">
              <span className="pf-login__statNum">AED 14B+</span>
              <span className="pf-login__statLabel">Market Volume</span>
            </div>
          </div>
        </Box>
      </Box>

      {/* Progress bar */}
      <Box className="pf-login__progressContainer">
        <Box className="pf-login__progressBar">
          <Box
            key={currentImageIndex}
            className="pf-login__progressFill"
            style={{ animationDuration: `${duration}ms` }}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default LoginImageSection;