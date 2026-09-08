import { Box, Button, Skeleton, Typography } from "@mui/material";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import DeveloperLogo1 from "../../../assets/img/company_logos/1.png";
import DeveloperLogo2 from "../../../assets/img/company_logos/2.png";
import DeveloperLogo3 from "../../../assets/img/company_logos/3.png";
import DeveloperLogo4 from "../../../assets/img/company_logos/4.png";
import DeveloperLogo5 from "../../../assets/img/company_logos/5.png";
import DeveloperLogo6 from "../../../assets/img/company_logos/6.png";
import DeveloperLogo7 from "../../../assets/img/company_logos/7.png";
import DeveloperLogo8 from "../../../assets/img/company_logos/8.png";
import DeveloperLogo9 from "../../../assets/img/company_logos/9.png";
import DeveloperLogo10 from "../../../assets/img/company_logos/C10.jpg";
import DeveloperLogo11 from "../../../assets/img/company_logos/C11.jpg";
import DeveloperLogo12 from "../../../assets/img/company_logos/C12.jpg";
import DeveloperLogo13 from "../../../assets/img/company_logos/C13.jpg";
import DeveloperLogo14 from "../../../assets/img/company_logos/C14.jpg";
import DeveloperLogo15 from "../../../assets/img/company_logos/C15.jpg";

export type DeveloperCardProps = {
  developerId?: string;
  name: string;
  foundedIn?: number | null;
  description: string;
  projectsCount: number;
  logo: string;
  onViewProjects?: () => void;
};

export const developerLogos = [
  DeveloperLogo1,
  DeveloperLogo2,
  DeveloperLogo3,
  DeveloperLogo4,
  DeveloperLogo5,
  DeveloperLogo6,
  DeveloperLogo7,
  DeveloperLogo8,
  DeveloperLogo9,
  DeveloperLogo10,
  DeveloperLogo11,
  DeveloperLogo12,
  DeveloperLogo13,
  DeveloperLogo14,
  DeveloperLogo15,
];

function DeveloperCard({
  developerId,
  name,
  foundedIn,
  description,
  projectsCount,
  logo,
  onViewProjects,
}: DeveloperCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    const id = String(developerId ?? "").trim();
    if (id) {
      navigate(`/developerdetails/${encodeURIComponent(id)}`, { state: { developerId: id } });
      return;
    }
    navigate("/developerdetails");
  };

  const handleViewProjects = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    onViewProjects?.();
  };

  return (
    <Box
      className="pf-developer-card"
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyPress={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          handleCardClick();
        }
      }}
    >
      <Box className="pf-developer-card__body">
        <Box className="pf-developer-card__top">
          <Box className="pf-developer-card__title-group">
            <Typography className="pf-developer-card__name">{name}</Typography>
            <Typography className="pf-developer-card__meta">
              Founded in {typeof foundedIn === "number" && foundedIn > 0 ? foundedIn : "—"}
            </Typography>
          </Box>

          <Button
            className="pf-developer-card__cta"
            variant="outlined"
            onClick={handleViewProjects}
          >
            See {projectsCount} Projects
          </Button>
        </Box>

        <Typography className="pf-developer-card__description">
          {description}
        </Typography>
      </Box>

      <Box className="pf-developer-card__logo-box">
        <img
          src={logo}
          alt={`${name} logo`}
          className="pf-developer-card__logo"
          loading="lazy"
        />
      </Box>
    </Box>
  );
}

export function DeveloperCardSkeleton() {
  return (
    <Box className="pf-developer-card" role="presentation" aria-hidden="true">
      <Box className="pf-developer-card__body" sx={{ flex: 1 }}>
        <Box className="pf-developer-card__top">
          <Box className="pf-developer-card__title-group">
            <Skeleton variant="text" width={220} height={20} />
            <Skeleton variant="text" width={120} height={16} />
          </Box>
          <Skeleton variant="rounded" width={146} height={37} />
        </Box>
        <Skeleton variant="text" width="85%" height={18} />
        <Skeleton variant="text" width="65%" height={18} />
      </Box>

      <Box className="pf-developer-card__logo-box">
        <Skeleton variant="rounded" width="100%" height="100%" />
      </Box>
    </Box>
  );
}

export default DeveloperCard; 