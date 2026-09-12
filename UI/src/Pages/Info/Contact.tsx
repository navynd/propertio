import React, { useEffect, useMemo, useRef, useState } from "react";
import PFContainer from "../../Components/container/PFContainer";
import {
  FacebookIcon,
  InstagramIcon,
  TwitterIcon,
  LinkedInIcon,
  RightArrowIcon,
  DownArrowIconBlack,
} from "../../Components/parts/icon";
import MessageIcon from "../../assets/img/messageIcon.svg";
import PhoneIcon from "../../assets/img/phoneIcon.svg";
import LocationIcon from "../../assets/img/locationIcon.svg";
import "../../assets/styles/Info/Contact.scss";
import {
  contactService,
  type ContactOfficeLocation,
  type ContactPageSettings,
} from "../../services/contactService";

const DEFAULT_SETTINGS: ContactPageSettings = {
  heroTitle: "We want to hear from you",
  heroSubtitle: "Send us a message, give us a call, or better still visit us.",
  sectionTitle: "Let's get in touch",
  sectionSubtext: "Contact if you have any queries",
  email: "contact@estatehub.com",
  phone: "+1 (800) 558-0000",
  officeAddress: "Prime Global Headquarters, One Berkeley Square, London & Fifth Avenue, New York",
  mapUrl: "https://maps.google.com",
};

const DEFAULT_SUBJECTS = [
  "General inquiry",
  "Property support",
  "Advertising",
  "Careers",
  "Other",
];

const renderHeroTitle = (title: string) => {
  const lines = title.split("\n").filter(Boolean);
  if (lines.length <= 1) {
    const parts = title.trim().split(/\s+/);
    if (parts.length > 4) {
      const mid = Math.ceil(parts.length / 2);
      return (
        <>
          {parts.slice(0, mid).join(" ")}
          <br />
          {parts.slice(mid).join(" ")}
        </>
      );
    }
    return title;
  }
  return lines.map((line, index) => (
    <React.Fragment key={index}>
      {line}
      {index < lines.length - 1 ? <br /> : null}
    </React.Fragment>
  ));
};

const formatLocationCity = (loc: ContactOfficeLocation) => {
  if (loc.city && loc.country) return `${loc.city}, ${loc.country}`;
  return loc.city || loc.country || "";
};

const Contact: React.FC = () => {
  const [settings, setSettings] = useState<ContactPageSettings>(DEFAULT_SETTINGS);
  const [subjects, setSubjects] = useState<string[]>(DEFAULT_SUBJECTS);
  const [otherLocations, setOtherLocations] = useState<ContactOfficeLocation[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    comments: "",
  });
  const [selectedSubject, setSelectedSubject] = useState("");
  const [isSubjectOpen, setIsSubjectOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const subjectDropdownRef = useRef<HTMLDivElement>(null);
  const [locationsStartIndex, setLocationsStartIndex] = useState(0);
  const [locationsPerView, setLocationsPerView] = useState(3);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const data = await contactService.getContact();
        if (cancelled) return;
        setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
        if (data.formSubjects?.length) setSubjects(data.formSubjects);
        setOtherLocations(data.locations ?? []);
      } catch {
        // Keep defaults when API is unavailable.
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const metaTitle = settings.seo?.metaTitle?.trim();
    if (metaTitle) document.title = metaTitle;
  }, [settings.seo?.metaTitle]);

  useEffect(() => {
    const getPerView = () => {
      const w = window.innerWidth;
      if (w >= 768 && w <= 1023) return 2;
      if (w >= 320 && w <= 767) return 1;
      return 3;
    };

    const update = () => setLocationsPerView(getPerView());
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const visibleLocations = useMemo(() => {
    const len = otherLocations.length;
    if (len === 0) return [];
    return Array.from({ length: Math.min(locationsPerView, len) }, (_, i) =>
      otherLocations[(locationsStartIndex + i) % len]
    );
  }, [locationsPerView, locationsStartIndex, otherLocations]);

  const toggleSubject = () => setIsSubjectOpen((prev) => !prev);

  const handleSelectSubject = (subject: string) => {
    setSelectedSubject(subject);
    setIsSubjectOpen(false);
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitMessage("");
    setSubmitting(true);
    try {
      await contactService.submitContact({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        subject: selectedSubject,
        comments: formData.comments.trim(),
      });
      setFormData({ name: "", email: "", phone: "", comments: "" });
      setSelectedSubject("");
      setSubmitMessage("Thank you. Your message has been sent.");
    } catch {
      setSubmitMessage("Unable to send your message right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const openMap = (url?: string) => {
    const target = (url || settings.mapUrl || "").trim();
    if (target) window.open(target, "_blank", "noopener,noreferrer");
  };

  const goPrevLocations = () => {
    const len = otherLocations.length;
    if (len <= 1) return;
    setLocationsStartIndex((prev) => (prev - 1 + len) % len);
  };

  const goNextLocations = () => {
    const len = otherLocations.length;
    if (len <= 1) return;
    setLocationsStartIndex((prev) => (prev + 1) % len);
  };

  const heroStyle = settings.heroBackgroundImage?.trim()
    ? { backgroundImage: `url(${settings.heroBackgroundImage.trim()})` }
    : undefined;

  return (
    <div className="pf-contact">
      <section className="pf-contact__hero" style={heroStyle}>
        <div className="pf-contact__hero-overlay" />
        <PFContainer className="pf-contact__hero-container">
          <div className="pf-contact__hero-inner">
            <div className="pf-contact__breadcrumb">
              <span>Home</span>
              <RightArrowIcon width="12" height="12" fill="#FFFFFF" />
              <span>Contact us</span>
            </div>
            <h1 className="pf-contact__hero-title">
              {renderHeroTitle(settings.heroTitle || DEFAULT_SETTINGS.heroTitle || "")}
            </h1>
            <p className="pf-contact__hero-subtitle">{settings.heroSubtitle}</p>
          </div>
        </PFContainer>
      </section>

      <div className="pf-contact__card-wrap">
        <PFContainer>
          <div className="pf-contact__card">
            <div className="pf-contact__info">
              <h2 className="pf-contact__info-title">{settings.sectionTitle}</h2>
              <p className="pf-contact__info-desc">{settings.sectionSubtext}</p>
              <div className="pf-contact__info-cta-wrap">
                <p className="pf-contact__info-cta">Don&apos;t be afraid to say hello with us</p>
                <div className="pf-contact__social">
                  {settings.facebookUrl ? (
                    <a
                      href={settings.facebookUrl}
                      className="pf-contact__social-link"
                      aria-label="Facebook"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <FacebookIcon fill="#222" />
                    </a>
                  ) : null}
                  {settings.instagramUrl ? (
                    <a
                      href={settings.instagramUrl}
                      className="pf-contact__social-link"
                      aria-label="Instagram"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <InstagramIcon fill="#222" />
                    </a>
                  ) : null}
                  {settings.twitterUrl ? (
                    <a
                      href={settings.twitterUrl}
                      className="pf-contact__social-link"
                      aria-label="X"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <TwitterIcon fill="#222" />
                    </a>
                  ) : null}
                  {settings.linkedinUrl ? (
                    <a
                      href={settings.linkedinUrl}
                      className="pf-contact__social-link"
                      aria-label="LinkedIn"
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <LinkedInIcon fill="#222" />
                    </a>
                  ) : null}
                </div>
              </div>

              <div className="pf-contact__details">
                <div className="pf-contact__detail">
                  <div className="pf-contact__detail-icon-wrap">
                    <img src={MessageIcon} alt="Message" className="pf-contact__detail-icon" />
                  </div>
                  <div>
                    <span className="pf-contact__detail-label">Email ID</span>
                    <a href={`mailto:${settings.email}`} className="pf-contact__detail-value">
                      {settings.email}
                    </a>
                  </div>
                </div>
                <div className="pf-contact__detail">
                  <div className="pf-contact__detail-icon-wrap">
                    <img src={PhoneIcon} alt="Phone" className="pf-contact__detail-icon" />
                  </div>
                  <div>
                    <span className="pf-contact__detail-label">Phone</span>
                    <a
                      href={`tel:${String(settings.phone || "").replace(/\s/g, "")}`}
                      className="pf-contact__detail-value"
                    >
                      {settings.phone}
                    </a>
                  </div>
                </div>
                <div className="pf-contact__detail">
                  <div className="pf-contact__detail-icon-wrap">
                    <img src={LocationIcon} alt="Location" className="pf-contact__detail-icon" />
                  </div>
                  <div>
                    <span className="pf-contact__detail-label">Office address</span>
                    <span className="pf-contact__detail-value">{settings.officeAddress}</span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="pf-contact__map-btn"
                onClick={() => openMap(settings.mapUrl)}
              >
                View in map
              </button>
            </div>

            <div className="pf-contact__form-wrap">
              <h2 className="pf-contact__form-title">Contact</h2>
              <form onSubmit={handleSubmit} className="pf-contact__form">
                <div className="pf-contact__field">
                  <label htmlFor="contact-name" className="pf-contact__label">
                    Name
                  </label>
                  <input
                    id="contact-name"
                    type="text"
                    name="name"
                    className="pf-contact__input"
                    placeholder="Enter Name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className="pf-contact__row">
                  <div className="pf-contact__field">
                    <label htmlFor="contact-email" className="pf-contact__label">
                      Email Address
                    </label>
                    <input
                      id="contact-email"
                      type="email"
                      name="email"
                      className="pf-contact__input"
                      placeholder="Enter email address"
                      value={formData.email}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="pf-contact__field">
                    <label htmlFor="contact-phone" className="pf-contact__label">
                      Phone number
                    </label>
                    <input
                      id="contact-phone"
                      type="tel"
                      name="phone"
                      className="pf-contact__input"
                      placeholder="Enter phone number"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                </div>
                <div className="pf-contact__field">
                  <label htmlFor="contact-subject" className="pf-contact__label">
                    Subject
                  </label>
                  <div className="pf-contact__subject-dropdown" ref={subjectDropdownRef}>
                    <button
                      type="button"
                      className={`pf-contact__subject-dropdown-btn ${selectedSubject ? "selected" : ""}`}
                      onClick={toggleSubject}
                    >
                      <span
                        className={`pf-contact__subject-dropdown-text ${selectedSubject ? "selected" : ""}`}
                      >
                        {selectedSubject || "Select subject"}
                      </span>
                      <DownArrowIconBlack width="10" height="10" fill="#707070" />
                    </button>
                    {isSubjectOpen && (
                      <div className="pf-contact__subject-dropdown-menu">
                        {subjects.map((s) => (
                          <button
                            key={s}
                            type="button"
                            className="pf-contact__subject-dropdown-option"
                            onClick={() => handleSelectSubject(s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="pf-contact__field">
                  <label htmlFor="contact-comments" className="pf-contact__label">
                    Comments
                  </label>
                  <textarea
                    id="contact-comments"
                    name="comments"
                    className="pf-contact__textarea"
                    placeholder="Write your comments"
                    rows={4}
                    value={formData.comments}
                    onChange={handleChange}
                  />
                </div>
                {submitMessage ? (
                  <p className="pf-contact__submit-message">{submitMessage}</p>
                ) : null}
                <button type="submit" className="pf-contact__submit" disabled={submitting}>
                  {submitting ? "Submitting..." : "Submit"}
                </button>
              </form>
            </div>
          </div>
        </PFContainer>
      </div>

      {otherLocations.length > 0 ? (
        <section className="pf-contact__locations">
          <PFContainer>
            <h2 className="pf-contact__locations-title">Our other locations</h2>

            <div className="pf-contact__locations-slider" role="region" aria-label="Other locations">
              <button
                type="button"
                className="pf-contact__locations-arrow pf-contact__locations-arrow--left"
                onClick={goPrevLocations}
                aria-label="Previous locations"
              >
                <RightArrowIcon width="16" height="16" fill="#222" />
              </button>

              <div className="pf-contact__locations-row">
                {visibleLocations.map((loc) => (
                  <div key={loc.id} className="pf-contact__location-card">
                    <div className="pf-contact__location-top">
                      <div className="pf-contact__location-head">
                        <div className="pf-contact__location-city">{formatLocationCity(loc)}</div>
                        <div className="pf-contact__location-tag">{loc.locationType}</div>
                      </div>
                    </div>

                    <div className="pf-contact__location-body">
                      <div className="pf-contact__location-address">
                        <img
                          src={LocationIcon}
                          alt=""
                          aria-hidden="true"
                          className="pf-contact__location-address-icon"
                        />
                        <p className="pf-contact__location-address-text">{loc.address}</p>
                      </div>

                      <button
                        type="button"
                        className="pf-contact__location-map-btn"
                        onClick={() => openMap(loc.mapUrl)}
                      >
                        View in map
                      </button>
                    </div>

                    <div className="pf-contact__location-footer">
                      <a
                        className="pf-contact__location-pill"
                        href={`tel:${loc.phone.replace(/\s/g, "")}`}
                      >
                        {loc.phone}
                      </a>
                      <a className="pf-contact__location-pill" href={`mailto:${loc.email}`}>
                        {loc.email}
                      </a>
                    </div>
                  </div>
                ))}
              </div>

              <button
                type="button"
                className="pf-contact__locations-arrow pf-contact__locations-arrow--right"
                onClick={goNextLocations}
                aria-label="Next locations"
              >
                <RightArrowIcon width="16" height="16" fill="#222" />
              </button>
            </div>
          </PFContainer>
        </section>
      ) : null}
    </div>
  );
};

export default Contact;
