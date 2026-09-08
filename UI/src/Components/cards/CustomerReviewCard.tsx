import React from "react";
import { CustomerReviewLogoIcon } from "../parts/icon";

export type CustomerReviewCardProps = {
  name: string;
  role: string;
  quote: string;
  avatar: string;
  style?: React.CSSProperties;
};

function CustomerReviewCard({ name, role, quote, avatar, style }: CustomerReviewCardProps) {
  return (
    <div className="pf-customer-card" style={style}>
      <div className="pf-customer-card__inner">
        <div className="pf-customer-card__face pf-customer-card__face--front">
          <div className="pf-customer-card__avatarWrapper">
            <div className="pf-customer-card__avatarFlip">
              <div className="pf-customer-card__avatarFace pf-customer-card__avatarFace--front">
                <img src={avatar} alt={name} className="pf-customer-card__avatar" />
              </div>
              <div className="pf-customer-card__avatarFace pf-customer-card__avatarFace--back">
                <div className="pf-customer-card__logo" aria-hidden>
                  <CustomerReviewLogoIcon width="40" height="40" fill="#FFFFFF" />
                </div>
              </div>
            </div>
          </div>
          <p className="pf-customer-card__quote">"{quote}"</p>
          <div className="pf-customer-card__footer">
            <p className="pf-customer-card__name">{name}</p>
            <p className="pf-customer-card__role">{role}</p>
          </div>
        </div>

        <div className="pf-customer-card__face pf-customer-card__face--back">
          <div className="pf-customer-card__avatarWrapper">
            <div className="pf-customer-card__avatarFlip">
              <div className="pf-customer-card__avatarFace pf-customer-card__avatarFace--front">
                <img src={avatar} alt={name} className="pf-customer-card__avatar" />
              </div>
              <div className="pf-customer-card__avatarFace pf-customer-card__avatarFace--back">
                <div className="pf-customer-card__logo" aria-hidden>
                  <CustomerReviewLogoIcon width="48" height="48" />
                </div>
              </div>
            </div>
          </div>
          <p className="pf-customer-card__quote pf-customer-card__quote--back">"{quote}"</p>
          <div className="pf-customer-card__footer pf-customer-card__footer--back">
            <p className="pf-customer-card__name pf-customer-card__name--light">{name}</p>
            <p className="pf-customer-card__role pf-customer-card__role--light">{role}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerReviewCard;
