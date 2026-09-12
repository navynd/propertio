import React from "react";
import { Box } from "@mui/material";

export type LoaderProps = {
  size?: number;
  margin?: string | number;
  color?: string;
  showText?: boolean;
  text?: string;
};

const Loader: React.FC<LoaderProps> = ({
  size = 64,
  margin = "0 auto",
  color = "#C9A96E",
  showText = false,
  text = "Loading...",
}) => {
  const innerRingSize = Math.max(16, Math.round(size * 0.68));
  const emblemSize = Math.max(10, Math.round(size * 0.32));

  return (
    <Box
      sx={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        margin,
        gap: 1.5,
        userSelect: "none",
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: size,
          height: size,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* Ambient Subtle Glow */}
        <Box
          sx={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${color}25 0%, transparent 70%)`,
            animation: "luxuryPulse 2.4s ease-in-out infinite",
          }}
        />

        {/* Outer Champagne Gold Orbital Ring */}
        <Box
          sx={{
            position: "absolute",
            width: size,
            height: size,
            borderRadius: "50%",
            border: `2.5px solid transparent`,
            borderTopColor: color,
            borderRightColor: `${color}80`,
            animation: "luxurySpin 1.1s cubic-bezier(0.55, 0.15, 0.45, 0.85) infinite",
            filter: `drop-shadow(0 0 6px ${color}60)`,
          }}
        />

        {/* Inner Counter-Rotating Precision Ring */}
        <Box
          sx={{
            position: "absolute",
            width: innerRingSize,
            height: innerRingSize,
            borderRadius: "50%",
            border: `1.75px solid transparent`,
            borderBottomColor: "#E4C98B",
            borderLeftColor: `${color}40`,
            animation: "luxuryReverseSpin 1.6s cubic-bezier(0.4, 0.0, 0.2, 1) infinite",
          }}
        />

        {/* Center Estatehub Monogram Gem */}
        <Box
          sx={{
            position: "absolute",
            width: emblemSize,
            height: emblemSize,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <svg
            width={emblemSize}
            height={emblemSize}
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              animation: "luxuryBreathe 2s ease-in-out infinite",
            }}
          >
            {/* Architectural Diamond / Roof Monogram */}
            <path
              d="M12 2L21 8.5L18.5 10L12 5.5L5.5 10L3 8.5L12 2Z"
              fill={color}
            />
            {/* Center Gem / Location Accent */}
            <circle cx="12" cy="12" r="2" fill={color} />
            {/* Base Pillar */}
            <path
              d="M7 13.5H17V15H7V13.5ZM9 17.5H15V19H9V17.5Z"
              fill="#F5F0E8"
              opacity="0.85"
            />
          </svg>
        </Box>
      </Box>

      {showText && (
        <span
          style={{
            fontSize: "11px",
            fontFamily: "inherit",
            fontWeight: 600,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: color,
            opacity: 0.9,
          }}
        >
          {text}
        </span>
      )}

      {/* Global Embedded Keyframes for zero-config beauty */}
      <style>{`
        @keyframes luxurySpin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes luxuryReverseSpin {
          0% { transform: rotate(360deg); }
          100% { transform: rotate(0deg); }
        }
        @keyframes luxuryPulse {
          0%, 100% { opacity: 0.3; transform: scale(0.92); }
          50% { opacity: 0.85; transform: scale(1.08); }
        }
        @keyframes luxuryBreathe {
          0%, 100% { transform: scale(0.95); opacity: 0.85; }
          50% { transform: scale(1.08); opacity: 1; filter: drop-shadow(0 0 4px ${color}); }
        }
      `}</style>
    </Box>
  );
};

export default Loader;
