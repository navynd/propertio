import { Breadcrumbs, Typography, Box } from "@mui/material";
import { RightArrowBlackIcon } from "./icon";
import { Link, useLocation } from "react-router-dom";

export function BreadcrumbsComponentFirstLevel({ ...props }) {
  return (
    <Box className="pf-search-listing__breadcrumbs">
      <Breadcrumbs
        separator={<RightArrowBlackIcon />}
        aria-label="breadcrumb"
        className={props.className || "pf-search-listing__breadcrumb-nav"}
      >
        <Link
          color="inherit"
          to={props.breadcrumbLinkTitleTo || "/"}
          className={
            props.breadcrumbLinkClassName ||
            "pf-search-listing__breadcrumb-link"
          }
        >
          {props.breadcrumbTitle}
        </Link>

        <Typography
          color="text.primary"
          className={
            props.breadcrumbLinkClassName ||
            "pf-search-listing__breadcrumb-link"
          }
        >
          {props.breadcrumbSubTitle1}
        </Typography>

      </Breadcrumbs>
    </Box>
  );
}


export function BreadcrumbsComponentSecondLevel({ ...props }) {
  const isTransactionPage = useLocation().pathname.includes("/transaction");
  const separator = isTransactionPage ? <RightArrowBlackIcon fill="#FFF" /> : <RightArrowBlackIcon />;
  return (
    <Box className="pf-search-listing__breadcrumbs">
      <Breadcrumbs
        separator={separator}
        aria-label="breadcrumb"
        className={props.className || "pf-search-listing__breadcrumb-nav"}
      >
        <Link
          color="inherit"
          to={props.breadcrumbLinkTitleTo || "/"}
          className={
            props.breadcrumbLinkClassName ||
            "pf-search-listing__breadcrumb-link"
          }
        >
          {props.breadcrumbTitle}
        </Link>

        <Link
          color="inherit"
          to={props.breadcrumbLinkSubTitle1To || "/"}
          className={
            props.breadcrumbLinkClassName ||
            "pf-search-listing__breadcrumb-link"
          }
          state={props.breadcrumbLinkSubTitle1State}
        >
          <Typography
            color="text.primary"
            className={
              props.breadcrumbLinkClassName ||
              "pf-search-listing__breadcrumb-link"
            }
          >
            {props.breadcrumbSubTitle1}
          </Typography>
        </Link>

        <Typography
          color="text.primary"
          className={
            props.breadcrumbLinkClassName ||
            "pf-search-listing__breadcrumb-link"
          }
        >
          {props.breadcrumbSubTitle2}
        </Typography>
      </Breadcrumbs>
    </Box>
  );
}

/**
 * Home > Level 1 > Level 2 > Current (4 crumbs)
 * Last segment is plain text; earlier segments are links.
 */
export function BreadcrumbsComponentThirdLevel({ ...props }) {
  const linkClass =
    props.breadcrumbLinkClassName || "pf-search-listing__breadcrumb-link";

  return (
    <Box className="pf-search-listing__breadcrumbs">
      <Breadcrumbs
        separator={<RightArrowBlackIcon />}
        aria-label="breadcrumb"
        className={props.className || "pf-search-listing__breadcrumb-nav"}
      >
        <Link color="inherit" to={props.breadcrumbLinkTitleTo || "/"} className={linkClass}>
          {props.breadcrumbTitle}
        </Link>

        <Link
          color="inherit"
          to={props.breadcrumbLinkSubTitle1To || "/"}
          className={linkClass}
          state={props.breadcrumbLinkSubTitle1State}
        >
          <Typography color="text.primary" className={linkClass}>
            {props.breadcrumbSubTitle1}
          </Typography>
        </Link>

        <Link
          color="inherit"
          to={props.breadcrumbLinkSubTitle2To || "/"}
          className={linkClass}
          state={props.breadcrumbLinkSubTitle2State}
        >
          <Typography color="text.primary" className={linkClass}>
            {props.breadcrumbSubTitle2}
          </Typography>
        </Link>

        <Typography color="text.primary" className={linkClass}>
          {props.breadcrumbSubTitle3}
        </Typography>
      </Breadcrumbs>
    </Box>
  );
}

/**
 * Home > Level 1 > Level 2 > Level 3 > Current (5 crumbs)
 * Last segment is plain text; earlier segments are links.
 */
export function BreadcrumbsComponentFourLevel({ ...props }) {
  const linkClass =
    props.breadcrumbLinkClassName || "pf-search-listing__breadcrumb-link";

  return (
    <Box className="pf-search-listing__breadcrumbs">
      <Breadcrumbs
        separator={<RightArrowBlackIcon />}
        aria-label="breadcrumb"
        className={props.className || "pf-search-listing__breadcrumb-nav"}
      >
        <Link color="inherit" to={props.breadcrumbLinkTitleTo || "/"} className={linkClass}>
          {props.breadcrumbTitle}
        </Link>

        <Link
          color="inherit"
          to={props.breadcrumbLinkSubTitle1To || "/"}
          className={linkClass}
          state={props.breadcrumbLinkSubTitle1State}
        >
          <Typography color="text.primary" className={linkClass}>
            {props.breadcrumbSubTitle1}
          </Typography>
        </Link>

        <Link
          color="inherit"
          to={props.breadcrumbLinkSubTitle2To || "/"}
          className={linkClass}
          state={props.breadcrumbLinkSubTitle2State}
        >
          <Typography color="text.primary" className={linkClass}>
            {props.breadcrumbSubTitle2}
          </Typography>
        </Link>

        <Link
          color="inherit"
          to={props.breadcrumbLinkSubTitle3To || "/"}
          className={linkClass}
          state={props.breadcrumbLinkSubTitle3State}
        >
          <Typography color="text.primary" className={linkClass}>
            {props.breadcrumbSubTitle3}
          </Typography>
        </Link>

        <Typography color="text.primary" className={linkClass}>
          {props.breadcrumbSubTitle4}
        </Typography>
      </Breadcrumbs>
    </Box>
  );
}