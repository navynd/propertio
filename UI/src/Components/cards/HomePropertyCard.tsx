import { Card, CardContent, CardMedia, Button, useMediaQuery } from "@mui/material";
import { LocationIcon, WhatsappIcon } from "../parts/icon";
import { normalizePhoneForWhatsapp } from "../../utils/phoneWhatsapp";

export type PropertyTag = {
  label: string;
  type: string;
};

type PropertyCardProps = {
  image: string;
  logo?: string;
  title: string;
  location: string;
  features: string[]; // render max 3 features for normal cards, 9 for expanded cards
  launchPrice?: string;
  currency?: string;
  ctaText?: string;
  tags?: PropertyTag[];
  isExpanded?: boolean; // Static expansion based on position, not content
  whatsappPhone?: string;
  whatsappMessage?: string;
};

// Map tag type to CSS class
function getTagClassName(type: string): string {
  return `pf-ribbon--${type}`;
}

function PropertyCard({
  image,
  logo,
  title,
  location,
  features,
  launchPrice,
  currency,
  ctaText = "Whatsapp",
  tags = [],
  isExpanded = false,
  whatsappPhone,
  whatsappMessage,
}: PropertyCardProps) {
  // Use 1440px breakpoint to match the large screen media query
  const isLargeScreen = useMediaQuery('(min-width: 1440px)');
  const cardHeight = isLargeScreen ? '280' : '250';

  // Normal cards: show max 3 features (3 rows, 1 column)
  // Expanded cards: show max 9 features (3 rows, 3 columns)
  const maxFeatures = isExpanded ? 9 : 3;
  const displayedFeatures = features.slice(0, maxFeatures);
  // Pad to ensure consistent layout
  while (displayedFeatures.length < maxFeatures) {
    displayedFeatures.push("");
  }
  const hasLaunchPrice = launchPrice && currency;
  const hasWhatsapp = Boolean(normalizePhoneForWhatsapp(whatsappPhone));

  const handleWhatsappClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    const digits = normalizePhoneForWhatsapp(whatsappPhone);
    if (!digits) return;
    const message = (whatsappMessage ?? "Hi, I'm interested in this project.").trim();
    window.open(
      `https://wa.me/${digits}?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  return (
    <Card
      className={`pf-projectCard ${isExpanded ? "pf-projectCard--expanded" : ""
        }`}
      elevation={0}
    >
      <div className="pf-projectCard__mediaWrap">
        {logo && (
          <div className="pf-projectCard__logo">
            <img src={logo} alt="developer logo" />
          </div>
        )}
        <div className="pf-projectCard__mediaWrap-image" >
          <CardMedia
            component="img"
            height={cardHeight}
            image={image}
            alt={title}
            sx={{
              transition: "transform 0.3s ease",
              "&:hover": {
                transform: "scale(1.05)",
              },
            }}
          />
        </div>
        {tags.length > 0 && (
          <div className="pf-projectCard__ribbons">
            {tags.map((t, i) => (
              <span key={i} className={`pf-ribbon ${getTagClassName(t.type)}`}>
                {t.label}
              </span>
            ))}
          </div>
        )}
      </div>

      <CardContent className="pf-projectCard__content">
        <h4 className="pf-projectCard__title">{title}</h4>
        <div className="pf-projectCard__location">
          <div>
            <LocationIcon />
          </div>
          <p className="pf-projectCard__subtitle">{location}</p>
        </div>

        <ul className="pf-projectCard__features">
          {displayedFeatures.map((f, idx) => (
            <li key={idx} className={f ? "" : "pf-projectCard__feature--empty"}>
              {f}
            </li>
          ))}
        </ul>

        <div className="pf-projectCard__viewMore">+ view more features</div>

        <div
          className={`pf-projectCard__bottom ${hasLaunchPrice ? "pf-projectCard__bottom--withPrice" : ""
            }`}
        >
          {hasLaunchPrice && (
            <div className="pf-projectCard__launchPrice">
              <div className="pf-projectCard__launchPriceLabel">
                Launch price
              </div>
              <div className="pf-projectCard__launchPriceValue">
                {launchPrice} {currency}
              </div>
            </div>
          )}
          <Button
            size="small"
            className="pf-whatsapp-btn"
            startIcon={<WhatsappIcon width={19} height={19} />}
            onClick={handleWhatsappClick}
            onMouseDown={(event) => {
              event.stopPropagation();
            }}
            disabled={!hasWhatsapp}
          >
            {ctaText}
          </Button>

          {!hasLaunchPrice && (
            <p className="pf-projectCard__priceWillBeAnnounced">
              Price will be announced
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default PropertyCard;
