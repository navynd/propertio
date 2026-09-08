import React, { useMemo, useState } from "react";
import { Box, Typography, IconButton, Button, Menu, MenuItem } from "@mui/material";
import {
  ThreeDotIcon,
  ReportFlagIcon,
  ShareIcon,
  TrashBinIcon,
  BedRoomIcon,
  BathRoomIcon,
  SqftIcon,
  TelephoneIcon,
  MailIcon,
  WhatsappIcon,
  ModalCloseIcon,
  LocationIcon,
} from "../../../Components/parts/icon";

export type ContactedProperty = {
  /** `contactedProperties` subdocument `_id` from the users API. */
  id: string;
  title: string;
  propertyType?: string;
  location: string;
  image: string;
  beds: number;
  baths: number;
  sqft: number;
  agent?: {
    name?: string;
    phone?: string;
    email?: string;
    whatsapp?: string;
    image?: string;
    languagesLabel?: string;
    brokerLicenseNumber?: string;
  };
};

type ContactedPropertyCardProps = {
  property: ContactedProperty;
  onReport?: (id: string) => void;
  onShare?: (id: string) => void;
  onDelete?: (id: string) => void;
  onCall?: (id: string) => void;
  onMail?: (id: string) => void;
  onWhatsapp?: (id: string) => void;
};

function ContactedPropertyCard({
  property,
  onReport,
  onShare,
  onDelete,
  onCall,
  onMail,
  onWhatsapp,
}: ContactedPropertyCardProps) {
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const isMenuOpen = Boolean(menuAnchor);

  const combinedTitle = useMemo(() => {
    if (!property.propertyType) return property.title;
    return `${property.title} | ${property.propertyType}`;
  }, [property.propertyType, property.title]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => setMenuAnchor(null);

  const handleMenuAction = (action?: (id: string) => void) => {
    action?.(property.id);
    handleMenuClose();
  };

  const handleBubbleAction = (event: React.MouseEvent, action?: (id: string) => void) => {
    event.stopPropagation();
    action?.(property.id);
  };

  return (
    <Box className="pf-contacted-card">
      <img src={property.image} alt={property.title} className="pf-contacted-card__image" />
      <Box className="pf-contacted-card__overlay" />

      <IconButton
        aria-label="More options"
        onClick={handleMenuOpen}
        className="pf-contacted-card__kebab"
        aria-controls={menuAnchor ? "contacted-properties-menu" : undefined}
        aria-haspopup="true"
        aria-expanded={menuAnchor ? "true" : undefined}
      >
        {menuAnchor ? (
          <ModalCloseIcon width={14} height={14} />
        ) : (
          <ThreeDotIcon width={16} height={16} />
        )}
      </IconButton>

      <Menu
        anchorEl={menuAnchor}
        open={isMenuOpen}
        onClose={handleMenuClose}
        className="pf-contacted-card__menu"
        MenuListProps={{ "aria-labelledby": "contacted-properties-menu" }}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem
          onClick={() => handleMenuAction(onReport)}
          className="pf-contacted-card__menu-item"
        >
          <ReportFlagIcon width={16} height={16} />
          <Typography className="pf-contacted-card__menu-text">Report</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => handleMenuAction(onShare)}
          className="pf-contacted-card__menu-item"
        >
          <ShareIcon width={16} height={16} />
          <Typography className="pf-contacted-card__menu-text">Share</Typography>
        </MenuItem>
        <MenuItem
          onClick={() => handleMenuAction(onDelete)}
          className="pf-contacted-card__menu-item"
        >
          <TrashBinIcon width={16} height={16} />
          <Typography className="pf-contacted-card__menu-text">Delete</Typography>
        </MenuItem>
      </Menu>

      <Box className="pf-contacted-card__content">
        <Box className="pf-contacted-card__headline">
          <Typography className="pf-contacted-card__title">{combinedTitle}</Typography>
          <Box className="pf-contacted-card__location">
            <LocationIcon width={11} height={15} />
            <Typography className="pf-contacted-card__location-text">
              {property.location}
            </Typography>
          </Box>
        </Box>

        <Box className="pf-contacted-card__details">
          <Box className="pf-contacted-card__chips">
            <Box className="pf-contacted-card__chip">
              <BedRoomIcon width={16} height={16} />
              <Typography className="pf-contacted-card__chip-text">
                {property.beds} Bed
              </Typography>
            </Box>
            <Box className="pf-contacted-card__chip">
              <BathRoomIcon width={16} height={16} />
              <Typography className="pf-contacted-card__chip-text">
                {property.baths} Bath
              </Typography>
            </Box>
            <Box className="pf-contacted-card__chip">
              <SqftIcon width={16} height={16} />
              <Typography className="pf-contacted-card__chip-text">
                {property.sqft.toLocaleString()} sqft
              </Typography>
            </Box>
          </Box>

          <Box className="pf-contacted-card__actions">
            <IconButton
              aria-label="Call agent"
              className="pf-contacted-card__action-icon"
              onClick={(e) => handleBubbleAction(e, onCall)}
              size="small"
            >
              <TelephoneIcon width={14} height={14} />
            </IconButton>
            <IconButton
              aria-label="Email agent"
              className="pf-contacted-card__action-icon"
              onClick={(e) => handleBubbleAction(e, onMail)}
              size="small"
            >
              <MailIcon width={15} height={12} />
            </IconButton>
            <Button
              onClick={(e) => handleBubbleAction(e, onWhatsapp)}
              className="pf-contacted-card__whatsapp"
              startIcon={<WhatsappIcon width={19} height={20} />}
            >
              Whatsapp
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

export default ContactedPropertyCard;

