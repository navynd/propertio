import React from "react";

interface EstatehubLogoProps extends React.SVGProps<SVGSVGElement> {
    variant?: "dark" | "light";
    subtitle?: string;
}

export function EstatehubLogo({
    variant = "dark",
    subtitle = "PROVIDERS",
    className,
    width = "180",
    height = "46",
    ...props
}: EstatehubLogoProps) {
    const isDark = variant === "dark";
    const primaryColor = isDark ? "#1F3D51" : "#FFFFFF";
    const accentColor = "#D4A373";
    const subColor = isDark ? "#707070" : "rgba(255, 255, 255, 0.7)";

    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 210 50"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
            {...props}
        >
            {/* Monogram Architectural Symbol */}
            <g transform="translate(4, 3)">
                {/* Roof and Top Chimney */}
                <path
                    d="M20 6 L34 17 L31.5 17 L20 8 L11.5 15 V 9.5 H 9 V 17 L 6 17 L 20 6 Z"
                    fill={primaryColor}
                />
                {/* Ochre Location Pin / Emblem Accent */}
                <path
                    d="M20 11 C18.5 11 17.3 12.1 17.3 13.6 C17.3 15.8 20 18.6 20 18.6 C20 18.6 22.7 15.8 22.7 13.6 C22.7 12.1 21.5 11 20 11 Z"
                    fill={accentColor}
                />
                <circle cx="20" cy="13.5" r="0.9" fill={isDark ? "#FFFFFF" : primaryColor} />

                {/* Left Structural Pillar */}
                <path
                    d="M8.5 35 H13.5 V 19.5 L16.5 17.5 L14 15.5 V 18.5 H11.5 V 32.5 H8.5 V 35 Z"
                    fill={primaryColor}
                />

                {/* Geometric Monogram E */}
                <path
                    d="M17.5 18.5 H31 V 21.7 H21.2 V 25.5 H29.5 V 28.5 H21.2 V 31.8 H31 V 35 H17.5 V 18.5 Z"
                    fill={primaryColor}
                />
            </g>

            {/* Typography: Estatehub */}
            <text
                x="46"
                y="27"
                fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif"
                fontSize="22"
                fontWeight="800"
                letterSpacing="-0.3px"
                fill={primaryColor}
            >
                Estatehub
            </text>

            {/* Tagline / Subtitle */}
            {subtitle && (
                <text
                    x="47"
                    y="39"
                    fontFamily="'Plus Jakarta Sans', 'Inter', system-ui, -apple-system, sans-serif"
                    fontSize="9"
                    fontWeight="700"
                    letterSpacing="2.8px"
                    fill={subColor}
                >
                    {subtitle}
                </text>
            )}
        </svg>
    );
}

export default EstatehubLogo;
