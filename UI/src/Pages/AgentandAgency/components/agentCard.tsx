import { Box, Chip, Skeleton, Typography } from "@mui/material";
import {
  AgentStarIcon,
  StarIcon,
  SuperAgentStarIcon,
} from "../../../Components/parts/icon";

export type AgentCardProps = {
  /** Agent document id for navigation / detail APIs. */
  agentId?: string;
  name: string;
  title: string;
  rating: number;
  ratingsCount?: number;
  isSuperAgent?: boolean;
  agency: string;
  agencyLogo: string;
  profileImage: string;
  languages: string[];
  nationality: string;
  forSale: number;
  forRent: number;
};

export type AgentCardComponentProps = AgentCardProps & {
  onClick?: () => void;
};

function AgentDetailsCard({
  name,
  title,
  rating,
  isSuperAgent,
  agency,
  agencyLogo,
  profileImage,
  languages,
  nationality,
  forSale,
  forRent,
  onClick,
}: AgentCardComponentProps) {
  const ratingFillPercent = Math.min(Math.max((rating / 5) * 100, 0), 100);
  const BadgeIcon = isSuperAgent ? SuperAgentStarIcon : AgentStarIcon;

  return (
    <Box
      className={`pf-agent-card${onClick ? " pf-agent-card--clickable" : ""}`}
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <Box
        className={`pf-agent-card__badge${isSuperAgent ? " pf-agent-card__badge--super" : " pf-agent-card__badge--agent"
          }`}
      >
        <BadgeIcon width="7" height="13" />
        <span className="pf-agent-card__badge-text">
          {isSuperAgent ? "Superagent" : "Agent"}
        </span>
      </Box>

      <Box className="pf-agent-card__hero">
        <Box className="pf-agent-card__logo-stack">
          <img
            src={profileImage}
            alt={name}
            className="pf-agent-card__photo"
            loading="lazy"
          />
          <img
            src={agencyLogo}
            alt={`${agency} logo`}
            className="pf-agent-card__agency-logo"
            loading="lazy"
          />
        </Box>
      </Box>

      <Box className="pf-agent-card__info">
        <Typography className="pf-agent-card__name">{name}</Typography>
        <Typography className="pf-agent-card__title">{title}</Typography>

        <Box className="pf-agent-card__rating-row">
          <Box className="pf-agent-card__stars">
            <StarIcon width="76" height="14" starColor="#E5E7EB" />
            <Box
              className="pf-agent-card__stars-fill"
              style={{ width: `${ratingFillPercent}%` }}
            >
              <StarIcon width="76" height="14" starColor="#FFCB2B" />
            </Box>
          </Box>
          <Typography className="pf-agent-card__rating-value">
            {rating.toFixed(1)}/5
          </Typography>
        </Box>
      </Box>

      <Box className="pf-agent-card__details">
        <div className="pf-agent-card__detail">
          <span className="pf-agent-card__label">Nationality:</span>{" "}
          <span className="pf-agent-card__value">{nationality}</span>
        </div>
        <div className="pf-agent-card__detail">
          <span className="pf-agent-card__label">Languages:</span>{" "}
          <span className="pf-agent-card__value">
            {languages.length ? languages.join(", ") : "—"}
          </span>
        </div>

        <Box className="pf-agent-card__stats">
          <Chip
            label={
              <span className="pf-agent-card__chip-text">
                For sale : <strong>{forSale}</strong>
              </span>
            }
            className="pf-agent-card__chip"
          />
          <Chip
            label={
              <span className="pf-agent-card__chip-text">
                For rent : <strong>{forRent}</strong>
              </span>
            }
            className="pf-agent-card__chip"
          />
        </Box>
      </Box>
    </Box>
  );
}

export function AgentDetailsCardSkeleton() {
  const lineSx = { transform: "none" as const };

  return (
    <Box className="pf-agent-card" aria-hidden>
      <Box className="pf-agent-card__badge pf-agent-card__badge--agent">
        <Skeleton
          variant="rounded"
          width={7}
          height={13}
          sx={{ bgcolor: "rgba(255,255,255,0.35)", flexShrink: 0 }}
        />
        <Skeleton
          variant="rounded"
          width={52}
          height={10}
          sx={{ bgcolor: "rgba(255,255,255,0.35)", borderRadius: 0.5 }}
        />
      </Box>

      <Box className="pf-agent-card__hero">
        <Box className="pf-agent-card__logo-stack">
          <Skeleton variant="circular" className="pf-agent-card__photo" width={90} height={90} />
          <Skeleton
            variant="circular"
            className="pf-agent-card__agency-logo"
            width={88}
            height={88}
          />
        </Box>
      </Box>

      <Box className="pf-agent-card__info">
        <Skeleton variant="text" width="78%" height={18} sx={lineSx} />
        <Skeleton variant="text" width="58%" height={14} sx={{ ...lineSx, mt: 0.75 }} />
        <Box className="pf-agent-card__rating-row" sx={{ mt: 0.5 }}>
          <Skeleton variant="rounded" width={86} height={14} />
          <Skeleton variant="text" width={40} height={16} sx={lineSx} />
        </Box>
      </Box>

      <Box className="pf-agent-card__details">
        <div className="pf-agent-card__detail">
          <Skeleton variant="rounded" width={76} height={16} sx={{ flexShrink: 0 }} />
          <Skeleton variant="text" width="100%" height={16} sx={{ ...lineSx, minWidth: 0 }} />
        </div>
        <div className="pf-agent-card__detail">
          <Skeleton variant="rounded" width={72} height={16} sx={{ flexShrink: 0 }} />
          <Skeleton variant="text" width="100%" height={16} sx={{ ...lineSx, minWidth: 0 }} />
        </div>
        <Box className="pf-agent-card__stats">
          <Skeleton
            variant="rounded"
            width={118}
            height={29}
            sx={{ borderRadius: "20px" }}
          />
          <Skeleton
            variant="rounded"
            width={118}
            height={29}
            sx={{ borderRadius: "20px" }}
          />
        </Box>
      </Box>
    </Box>
  );
}

export default AgentDetailsCard;
