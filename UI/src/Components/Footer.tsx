import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Typography,
  IconButton,
  MenuItem,
  Select,
  Divider,
  Collapse,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material";
import "../assets/styles/Footer.scss";
import {
  PfOrangeLogoIcon,
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  LinkedInIcon,
  PlayStoreIcon,
  AppleStoreIcon,
  DownArrowIconBlack,
} from "./parts/icon";
import PFContainer from "./container/PFContainer";

const footerLinkColumns = [
  {
    title: "Useful Links",
    links: [
      { label: "About us", path: "/about" },
      { label: "New projects", path: "/newprojectlisting" },
      { label: "Find agents", path: "/findagentorcompany" },
      { label: "Buy", path: "/searchlisting" },
      { label: "Rent", path: "/searchlisting" },
      { label: "Commercial", path: "/searchlisting" },
      { label: "Careers", path: "/careers" },
    ],
  },
  {
    title: "Explore",
    links: [
      { label: "Find developers", path: "/finddevelopers" },
      { label: "Find community", path: "/community" },
      { label: "Area insights", path: "/areainsight" },
      { label: "Property blog", path: "/blog" },
      { label: "Insight hub", path: "/insighthub" },
      { label: "Get mortgage help", path: "/mortgagecal" },
      { label: "Know your rights", path: "/rights" },
    ],
  },
  {
    title: "Supercharge search",
    links: [
      { label: "Popular areas", path: "/popular" },
      { label: "Affordable areas", path: "/affordable" },
      { label: "Family-friendly areas", path: "/family" },
      { label: "Invest in the best", path: "/invest" },
      { label: "Verified listings", path: "/searchlisting" },
      { label: "Rent vs Buy calculator", path: "/rentbuycal" },
      { label: "Investment hotspots", path: "/hotspots" },
    ],
  },
  {
    title: "Other Links",
    links: [
      { label: "Partner hub", path: "/about" },
      { label: "PF Expert", path: "/teams" },
      { label: "Contact", path: "/contact" },
      { label: "Terms & conditions", path: "/terms" },
      { label: "Privacy Policy", path: "/privacypolicy" },
      { label: "Cookie policy", path: "/mapview" },
      { label: "Sitemap", path: "/sitemap" },
    ],
  },
];
const socialIcons = [
  { label: "Facebook", icon: <FacebookIcon width={40} height={40} />, url: "https://www.facebook.com" },
  { label: "Instagram", icon: <InstagramIcon width={40} height={40} />, url: "https://www.instagram.com" },
  { label: "Twitter", icon: <TwitterIcon width={40} height={40} />, url: "https://www.twitter.com" },
  { label: "LinkedIn", icon: <LinkedInIcon width={40} height={40} />, url: "https://www.linkedin.com" },
];

const createDefaultAccordionState = () =>
  footerLinkColumns.reduce<Record<string, boolean>>((acc, column, index) => {
    acc[column.title] = index === 0;
    return acc;
  }, {});

function Footer() {
  const [language, setLanguage] = React.useState("en");
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [accordionState, setAccordionState] = React.useState(
    createDefaultAccordionState
  );

  React.useEffect(() => {
    if (isMobile) {
      setAccordionState(createDefaultAccordionState());
    }
  }, [isMobile]);

  const handleLanguageChange = (event: SelectChangeEvent<string>) => {
    setLanguage(event.target.value as string);
  };

  const handleAccordionToggle = (title: string) => {
    setAccordionState((prev) => ({
      ...prev,
      [title]: !prev[title],
    }));
  };
  const [showLanguage, setShowLanguage] = useState(false);
  const [languageType, setLanguageType] = useState("English");
  const languageDropdownRef = useRef<HTMLDivElement | null>(null);

  // Close language dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setShowLanguage(false);
      }
    };

    if (showLanguage) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showLanguage]);
  return (
    <Box
      component="footer"
      className={`pf-footer${isMobile ? " pf-footer--mobile" : ""}`}
    >
      <PFContainer className="pf-footer__inner">
        <Box className="pf-footer__top">
          <Box className="pf-footer__brand">
            <PfOrangeLogoIcon className="pf-footer__logo" />
            <Typography className="pf-footer__brandText">
              Connect our placing elit. Donec vestibulum cursus eros vel dictum.
              Donec varius leo ac tellus volutpat luctus.
            </Typography>
            <Box className="pf-footer__social" role="list">
              {socialIcons.map((item) => (
                <IconButton
                  key={item.label}
                  className="pf-footer__socialBtn"
                  aria-label={item.label}
                  size="small"
                  href={item.url ?? ""}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {item.icon}
                </IconButton>
              ))}
            </Box>
          </Box>

          {isMobile ? (
            <Box className="pf-footer__links pf-footer__links--mobile">
              <Divider className="pf-footer__divider" />
              {footerLinkColumns.map((column) => {
                const isOpen = accordionState[column.title];

                return (
                  <div
                    key={column.title}
                    className={`pf-footer__accordion${isOpen ? " pf-footer__accordion--open" : ""
                      }`}
                  >


                    <button
                      type="button"
                      className="pf-footer__accordionHeader"
                      onClick={() => handleAccordionToggle(column.title)}
                      aria-expanded={isOpen}
                      aria-controls={`pf-footer-accordion-${column.title}`}
                    >
                      <span>{column.title}</span>
                      <DownArrowIconBlack
                        className="pf-footer__accordionIcon"
                        width={10}
                        height={6}
                        aria-hidden
                      />
                    </button>
                    <Collapse in={isOpen} timeout="auto">
                      <ul
                        id={`pf-footer-accordion-${column.title}`}
                        className="pf-footer__columnList pf-footer__columnList--mobile"
                      >
                        {column.links.map((link) => (

                          <li key={link.label}>

                            <Link
                              to={link.path}
                              className="pf-footer__columnLink"
                            >
                              {link.label}
                            </Link>

                          </li>

                        ))}
                      </ul>
                    </Collapse>
                  </div>
                );
              })}
            </Box>
          ) : (
            <Box className="pf-footer__links">
              {footerLinkColumns.map((column) => (
                <Box key={column.title} className="pf-footer__column">
                  <Typography className="pf-footer__columnTitle">
                    {column.title}
                  </Typography>
                  <ul className="pf-footer__columnList">
                    {column.links.map((link) => (

                      <li key={link.label}>

                        <Link
                          to={link.path}
                          className="pf-footer__columnLink"
                        >
                          {link.label}
                        </Link>

                      </li>

                    ))}
                  </ul>
                </Box>
              ))}
            </Box>
          )}
        </Box>

        <Divider className="pf-footer__divider01 pf-footer__divider" />

        <Box className="pf-footer__download">
          <Typography className="pf-footer__downloadText">
            Download our Propertio app on Playstore and Appstore
          </Typography>
          <Box className="pf-footer__stores">
            <a
              href="#"
              className="pf-footer__storeButton"
              aria-label="Get it on Google Play"
            >
              <PlayStoreIcon width={120} height={40} />
            </a>
            <a
              href="#"
              className="pf-footer__storeButton"
              aria-label="Download on the App Store"
            >
              <AppleStoreIcon width={120} height={40} />
            </a>
          </Box>
        </Box>

        <Divider className="pf-footer__divider" />

        <Box className="pf-footer__bottom">
          <Typography className="pf-footer__copyright">
            Copyright © {new Date().getFullYear()} Propertio. All rights
            reserved.
          </Typography>
          <div
            ref={languageDropdownRef}
            className="footer-dropdown-main footer-dropdown-language-wrapper"
          >
            <div
              className="footer-dropdown-language-content"
              onClick={() => setShowLanguage(!showLanguage)}
            >
              <h4 className="footer-dropdown-language-value">
                {languageType}
              </h4>
            </div>
            <svg
              onClick={() => setShowLanguage(!showLanguage)}
              width="15"
              height="20"
              className="footer-dropdown-language-icon"
              viewBox="0 0 14 10"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M5.77889 5.78035C5.64974 5.90949 5.47792 5.98706 5.29564 5.99852C5.11337 6.00998 4.93318 5.95454 4.78887 5.8426L4.71837 5.78035L0.218293 1.28027L0.156042 1.20977L0.115541 1.15202L0.0750404 1.08002L0.0622898 1.05302L0.0420404 1.00277L0.0180393 0.921767L0.0105405 0.882016L0.00303986 0.837016L3.95992e-05 0.794265L-0.00146053 0.750014L3.95915e-05 0.705763L0.00378944 0.662263L0.0105405 0.617262L0.0180392 0.578261L0.0420403 0.49726L0.0622897 0.447009L0.114791 0.348007L0.163541 0.280506L0.218293 0.219755L0.288794 0.157504L0.346546 0.117003L0.418546 0.0765027L0.445548 0.0637521L0.495798 0.0435013L0.576799 0.0195011L0.61655 0.0120009L0.661551 0.00450077L0.704301 0.00150099L0.748553 8.52499e-07L9.74871 6.56799e-08C10.3877 9.8158e-09 10.7215 0.739513 10.336 1.21727L10.279 1.28027L5.77889 5.78035Z"
                fill="#222222"
              />
            </svg>

            {showLanguage && (
              <ul className="footer-dropdown-language">
                {["English"].map((type) => (
                  <li
                    key={type}
                    onClick={() => {
                      setLanguageType(type);
                      setShowLanguage(false);
                    }}
                  >
                    {type}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Box>
      </PFContainer>
    </Box>
  );
}

export default Footer;


{/* <Select
            value={language}
            onChange={handleLanguageChange}
            className="pf-footer__languageSelect"
            variant="outlined"
            IconComponent={() => (
              // <DownArrowIconBlack
              //   className="pf-footer__languageSelectIcon"
              //   width={14}
              //   height={10}
              // />
              <svg
                width="30"
                height="20"
                className="pf-footer__languageSelectIcon"
                viewBox="0 0 14 10"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M5.77889 5.78035C5.64974 5.90949 5.47792 5.98706 5.29564 5.99852C5.11337 6.00998 4.93318 5.95454 4.78887 5.8426L4.71837 5.78035L0.218293 1.28027L0.156042 1.20977L0.115541 1.15202L0.0750404 1.08002L0.0622898 1.05302L0.0420404 1.00277L0.0180393 0.921767L0.0105405 0.882016L0.00303986 0.837016L3.95992e-05 0.794265L-0.00146053 0.750014L3.95915e-05 0.705763L0.00378944 0.662263L0.0105405 0.617262L0.0180392 0.578261L0.0420403 0.49726L0.0622897 0.447009L0.114791 0.348007L0.163541 0.280506L0.218293 0.219755L0.288794 0.157504L0.346546 0.117003L0.418546 0.0765027L0.445548 0.0637521L0.495798 0.0435013L0.576799 0.0195011L0.61655 0.0120009L0.661551 0.00450077L0.704301 0.00150099L0.748553 8.52499e-07L9.74871 6.56799e-08C10.3877 9.8158e-09 10.7215 0.739513 10.336 1.21727L10.279 1.28027L5.77889 5.78035Z"
                  fill="#222222"
                />
              </svg>
            )}
            MenuProps={{
              PaperProps: {
                className: "pf-dropdown",
              },
              anchorOrigin: {
                vertical: "bottom",
                horizontal: "left",
              },
              transformOrigin: {
                vertical: "top",
                horizontal: "left",
              },
              disablePortal: false,
              disableScrollLock: true,
            }}
          >
            <MenuItem value="en" className="pf-dropdown__item">
              English
            </MenuItem>
            <MenuItem value="ar" className="pf-dropdown__item">
              العربية
            </MenuItem>
          </Select> */}


// const footerLinkColumns = [
//   {
//     title: "Useful Links",
//     links: [
//       "About us",
//       "New projects",
//       "Find agents",
//       "Buy",
//       "Rent",
//       "Commercial",
//       "Careers",
//     ],
//   },
//   {
//     title: "Explore",
//     links: [
//       "Find developers",
//       "Find community",
//       "Area insights",
//       "Property blog",
//       "Insight hub",
//       "Get mortgage help",
//       "Know your rights",
//     ],
//   },
//   {
//     title: "Supercharge search",
//     links: [
//       "Popular areas",
//       "Affordable areas",
//       "Family-friendly areas",
//       "Invest in the best",
//       "Verified listings",
//       "Rent vs Buy calculator",
//       "Investment hotspots",
//     ],
//   },
//   {
//     title: "Other Links",
//     links: [
//       "Partner hub",
//       "PF Expert",
//       "Contact",
//       "Terms & conditions",
//       "Privacy Policy",
//       "Cookie policy",
//       "Sitemap",
//     ],
//   },
// ];

