import { Box, Typography } from "@mui/material";
import {
  BedRoomIcon,
  BathRoomIcon,
  SqftIcon,
  LocationIcon,
  VerifiedBadgeIcon,
  SuperAgentStarIcon,
} from "../parts/icon";

export type RecommendedProperty = {
  /** MongoDB id or slug — used for navigation when `onClick` is set. */
  id?: string;
  image: string;
  title: string;
  location: string;
  beds: string;
  baths: string;
  area: string;
  price: string;
  ribbons?: {
    verified?: boolean;
    superAgent?: boolean;
    label?: string;
    type?: string;
  };
};

type RecommendedCardProps = {
  property: RecommendedProperty;
  onClick?: () => void;
};

function RecommendedCard({ property, onClick }: RecommendedCardProps) {
  const { image, title, location, beds, baths, area, price, ribbons } =
    property;

  return (
    <Box
      className={`pf-recommended-card${onClick ? " pf-recommended-card--clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onClick();
              }
            }
          : undefined
      }
    >
      <Box className="pf-recommended-card__media">
        <img src={image} alt={title} className="pf-recommended-card__image" />
        <Box className="pf-recommended-card__ribbons">
          {ribbons?.verified && (
            <span className="pf-ribbon pf-ribbon--paymentplan pf-recommended-card__ribbon-chip">
              <VerifiedBadgeIcon width={12} height={12} />
              VERIFIED
            </span>
          )}
          {ribbons?.superAgent && (
            <span className="pf-ribbon pf-ribbon--superagent pf-recommended-card__ribbon-chip">
              <SuperAgentStarIcon width={12} height={12} />
              SUPERAGENT
            </span>
          )}
          {ribbons?.label && (
            <span className="pf-ribbon pf-ribbon--label pf-recommended-card__ribbon-chip">
              {ribbons.label}
            </span>
          )}
        </Box>
      </Box>

      <Box className="pf-recommended-card__body">
        <Typography className="pf-recommended-card__title">{title}</Typography>
        <Box className="pf-recommended-card__location">
          <LocationIcon width={14} height={14} />
          <Typography className="pf-recommended-card__location-text">
            {location}
          </Typography>
        </Box>

        <Box className="pf-recommended-card__meta">
          <Box className="pf-recommended-card__meta-item">
            <BedRoomIcon width={16} height={16} />
            <Typography className="pf-recommended-card__meta-text" >{beds}</Typography>
          </Box>
          <Box className="pf-recommended-card__meta-divider" />
          <Box className="pf-recommended-card__meta-item">
            <BathRoomIcon width={16} height={16} />
            <Typography className="pf-recommended-card__meta-text" >{baths}</Typography>
          </Box>
          <Box className="pf-recommended-card__meta-divider" />
          <Box className="pf-recommended-card__meta-item">
            <SqftIcon width={16} height={16} />
            <Typography className="pf-recommended-card__meta-text">{area}</Typography>
          </Box>
        </Box>

        <Box className="pf-recommended-card__price-block">
          <Typography className="pf-recommended-card__price-label">
            Price
          </Typography>
          <Typography className="pf-recommended-card__price-value">
            {price}
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

export default RecommendedCard;


