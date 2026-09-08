import { useState, useEffect } from "react";
import { Box } from "@mui/material";
import Login01Image from "../../assets/img/login01.png";
import Login02Image from "../../assets/img/login02.png";
import Login03Image from "../../assets/img/login03.png";
import loginlogo from "../../assets/img/loginlogo.png";

function LoginImageSection() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  const loginImages = [Login01Image, Login02Image, Login03Image];
  const duration = 5000; // 5 sec

  /** change image every 5 sec */
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % loginImages.length);
    }, duration);

    return () => clearInterval(interval);
  }, []);

  return (
    <Box className="pf-login__left">
      <img
        src={loginImages[currentImageIndex]}
        alt="Showcase property"
        className="pf-login__leftImage"
      />

      <Box className="pf-login__leftOverlay">
        <img src={loginlogo} alt="Propertio" className="login_logos" />
      </Box>

      {/* Progress bar */}
      <Box className="pf-login__progressContainer">
        <Box className="pf-login__progressBar">
          {/* key important → restart CSS animation */}
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

// import { useState, useEffect, useRef } from "react";
// import { Box } from "@mui/material";
// import Login01Image from "../../assets/img/login01.png";
// import Login02Image from "../../assets/img/login02.png";
// import Login03Image from "../../assets/img/login03.png";
// import loginlogo from '../../assets/img/loginlogo.png';

// function LoginImageSection() {
//   const [currentImageIndex, setCurrentImageIndex] = useState(0);
//   const [progress, setProgress] = useState(0);
//   const animationRef = useRef<number | null>(null);

//   const loginImages = [Login01Image, Login02Image, Login03Image];

//   useEffect(() => {
//     // Reset progress when image changes
//     setProgress(0);

//     const duration = 5000; // 3 seconds
//     const startTime = Date.now();

//     const animate = () => {
//       const elapsed = Date.now() - startTime;
//       const newProgress = Math.min(100, (elapsed / duration) * 100);
//       setProgress(newProgress);

//       if (newProgress < 100) {
//         animationRef.current = requestAnimationFrame(animate);
//       } else {
//         // Progress completed, change image after a brief delay
//         setTimeout(() => {
//           setCurrentImageIndex((prev) => (prev + 1) % loginImages.length);
//         }, 100);
//       }
//     };

//     animationRef.current = requestAnimationFrame(animate);

//     return () => {
//       if (animationRef.current !== null) {
//         cancelAnimationFrame(animationRef.current);
//       }
//     };
//   }, [currentImageIndex, loginImages.length]);

//   return (
//     <Box className="pf-login__left" role="img" aria-label="Property showcase">
//       <img
//         src={loginImages[currentImageIndex]}
//         alt="Showcase property"
//         className="pf-login__leftImage"
//       />
//       <Box
//         className="pf-login__leftOverlay"
//         component="section"
//         aria-label="Awesome Properties message"
//       >
//         <img src={loginlogo} alt="Propertio" className="login_logos" />

//       </Box>

//       {/*Progress Bar*/}
//       <Box className="pf-login__progressContainer">
//         <Box className="pf-login__progressBar">
//           <Box
//             className="pf-login__progressFill"
//             sx={{ width: `${progress}%` }}
//           />
//         </Box>
//       </Box>
//     </Box>
//   );
// }

// export default LoginImageSection;

{/* <Box className="pf-login__overlayLeft">
          <Typography component="span" className="pf-login__badge">
            Awesome
          </Typography>
          <Typography component="h2" className="pf-login__headline">
            Properties
          </Typography>
        </Box>

        <Box className="pf-login__overlayDivider" aria-hidden="true" />

        <Box className="pf-login__overlayRight">
          <Typography component="p" className="pf-login__overlayLine">
            Are
          </Typography>
          <Typography component="p" className="pf-login__overlayLine">
            Here To
          </Typography>
          <Typography component="p" className="pf-login__overlayLine02">
            Buy &
          </Typography>
          <Typography
            component="p"
            className="pf-login__overlayLine02 pf-login__overlayLine02--accent"
          >
            Rent
          </Typography>
        </Box> */}