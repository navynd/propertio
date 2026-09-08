import { Box, Chip, Skeleton, Typography } from "@mui/material";
import { LocationIcon } from "../../../Components/parts/icon";

export type CompanyCardProps = {
  /** Agency id for navigation / list keys */
  companyId?: string;
  name: string;
  location: string;
  logo: string;
  forSale: number;
  forRent: number;
  nationality: string;
  agentsCount: number;
  superagentCount: number;
};

export type CompanyCardComponentProps = CompanyCardProps & {
  onClick?: () => void;
};

function CompanyDetailsCard({
  name,
  location,
  logo,
  forSale,
  forRent,
  nationality,
  agentsCount,
  superagentCount,
  onClick,
}: CompanyCardComponentProps) {
  return (
    <Box
      className={`pf-company-card${onClick ? " pf-company-card--clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Box className="pf-company-card__top">
        <img src={logo} alt={name} className="pf-company-card__logo" />
        <Box className="pf-company-card__header">
          <Typography className="pf-company-card__name">{name}</Typography>
          <Box className="pf-company-card__location">
            <LocationIcon width={12} height={14} />
            <Typography className="pf-company-card__location-text">
              {location}
            </Typography>
          </Box>

          <Box className="pf-company-card__chips">
            <Chip
              label={
                <span className="pf-company-card__chip-text">
                  For sale : <strong>{forSale}</strong>
                </span>
              }
              className="pf-company-card__chip"
            />
            <Chip
              label={
                <span className="pf-company-card__chip-text">
                  For rent : <strong>{forRent}</strong>
                </span>
              }
              className="pf-company-card__chip"
            />
          </Box>
        </Box>
      </Box>

      <Box className="pf-company-card__meta">
        <Box className="pf-company-card__meta-item">
          <span className="pf-company-card__meta-label">Nationality</span>
          <span className="pf-company-card__meta-value">{nationality}</span>
        </Box>
        <Box className="pf-company-card__meta-item">
          <span className="pf-company-card__meta-label">Agents</span>
          <span className="pf-company-card__meta-value">{agentsCount}</span>
        </Box>
        <Box className="pf-company-card__meta-item">
          <span className="pf-company-card__meta-label">Superagent</span>
          <span className="pf-company-card__meta-value">
            {superagentCount}
          </span>
        </Box>
      </Box>
    </Box>
  );
}

const lineSx = { borderRadius: 0.5 };

export function CompanyDetailsCardSkeleton() {
  return (
    <Box className="pf-company-card">
      <Box className="pf-company-card__top">
        <Box
          className="pf-company-card__logo"
          sx={{
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Skeleton variant="rectangular" width="100%" height="100%" />
        </Box>
        <Box className="pf-company-card__header" sx={{ flex: 1, minWidth: 0 }}>
          <Skeleton variant="text" width="78%" height={22} sx={lineSx} />
          <Box className="pf-company-card__location">
            <Skeleton variant="circular" width={12} height={12} />
            <Skeleton
              variant="text"
              width="68%"
              height={16}
              sx={{ ...lineSx, ml: 0.5 }}
            />
          </Box>
          <Box className="pf-company-card__chips">
            <Skeleton variant="rounded" width={110} height={28} sx={{ borderRadius: 18 }} />
            <Skeleton variant="rounded" width={110} height={28} sx={{ borderRadius: 18 }} />
          </Box>
        </Box>
      </Box>
      <Box className="pf-company-card__meta">
        <Box className="pf-company-card__meta-item">
          <Skeleton variant="text" width={92} height={18} sx={lineSx} />
          <Skeleton variant="text" width={70} height={18} sx={lineSx} />
        </Box>
        <Box className="pf-company-card__meta-item">
          <Skeleton variant="text" width={70} height={18} sx={lineSx} />
          <Skeleton variant="text" width={48} height={18} sx={lineSx} />
        </Box>
        <Box className="pf-company-card__meta-item">
          <Skeleton variant="text" width={92} height={18} sx={lineSx} />
          <Skeleton variant="text" width={48} height={18} sx={lineSx} />
        </Box>
      </Box>
    </Box>
  );
}

export default CompanyDetailsCard;
