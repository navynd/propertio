import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Container, Tabs, Tab, Box } from "@mui/material";
import { DownArrowIconBlack, RightArrowBlackIcon } from "../Components/parts/icon";
import "../assets/styles/Terms/Terms.scss";
import {
  sitemapService,
  type SitemapCountry,
  type SitemapDocument,
  type SitemapPageSettings,
} from "../services/sitemapService";

const SiteMap: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [openDropdown, setOpenDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SitemapPageSettings>({});
  const [countries, setCountries] = useState<SitemapCountry[]>([]);
  const [documents, setDocuments] = useState<SitemapDocument[]>([]);
  const [countryCode, setCountryCode] = useState("AE");
  const [locationName, setLocationName] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const data = await sitemapService.getSitemap({ country: countryCode });
        if (cancelled) return;
        setSettings(data.settings || {});
        setCountries(data.countries || []);
        setDocuments(data.documents || []);
        setLocationName(data.locationName || "");
        if (data.countryCode) {
          setCountryCode((prev) =>
            prev.toUpperCase() === data.countryCode.toUpperCase() ? prev : data.countryCode.toUpperCase()
          );
        }
        setTabValue(0);
      } catch {
        if (!cancelled) setDocuments([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  const countryLabel = useMemo(() => {
    const match = countries.find(
      (country) => (country.code || "").toUpperCase() === countryCode.toUpperCase()
    );
    return match?.name || countryCode;
  }, [countries, countryCode]);

  const pageTitleBase = settings.pageTitle || "Sitemap";
  const pageTitle = locationName ? `${pageTitleBase} in ${locationName}` : pageTitleBase;

  const activeDocument = documents[tabValue] || null;

  return (
    <div className="terms-main-section">
      <div className="terms-top-section">
        <Container>
          <div className="terms-top-ulsection">
            <Link to="/" className="terms-top-ul-title">
              {settings.breadcrumbHomeLabel || "Home"}
            </Link>
            <RightArrowBlackIcon width="10" height="10" fill="#222222" />
            <p className="terms-top-ul-title">{settings.breadcrumbLabel || "Site map"}</p>
          </div>

          <div className="terms-title-row">
            <h2 className="terms-top-title">{pageTitle}</h2>
            <div className="terms-dropdown">
              <span className="terms-dropdown-label">Select location :</span>
              <div className="terms-custom-select">
                <div className="terms-select-box" onClick={() => setOpenDropdown(!openDropdown)}>
                  <h4 className="terms-select-title">{countryLabel}</h4>
                  <DownArrowIconBlack width="10" height="10" fill="#222222" />
                </div>
                {openDropdown && (
                  <div className="terms-options">
                    {(countries.length ? countries : [{ name: countryLabel, code: countryCode }]).map(
                      (item) => (
                        <div
                          key={item.code || item.name}
                          className="terms-option"
                          onClick={() => {
                            if (item.code) setCountryCode(item.code.toUpperCase());
                            setOpenDropdown(false);
                          }}
                        >
                          {item.name}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {documents.length > 0 && (
            <Box className="terms-tabs-section">
              <Tabs
                value={tabValue}
                onChange={(_event, value) => setTabValue(value)}
                textColor="primary"
                indicatorColor="primary"
                variant="scrollable"
                scrollButtons="auto"
              >
                {documents.map((doc) => (
                  <Tab key={doc.id} label={doc.categoryName} />
                ))}
              </Tabs>
            </Box>
          )}
        </Container>
      </div>

      <Container>
        <Box mt={3}>
          {loading ? (
            <p className="terms-content-text">Loading...</p>
          ) : activeDocument?.content ? (
            <div
              className="terms-content-html"
              dangerouslySetInnerHTML={{ __html: activeDocument.content }}
            />
          ) : (
            <p className="terms-content-text text-[#707070]">No content available.</p>
          )}
        </Box>
      </Container>
    </div>
  );
};

export default SiteMap;
