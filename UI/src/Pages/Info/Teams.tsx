import React, { useCallback, useEffect, useState } from "react";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentSecondLevel } from "../../Components/parts/component";
import { SearchIcon } from "../../Components/parts/icon";
import PFPagination from "../../Components/pagination/PFPagination";
import "../../assets/styles/Info/Teams.scss";
import defaultAvatar from "../../assets/img/header_person.png";
import {
  teamService,
  type TeamMember,
  type TeamPageSettings,
} from "../../services/teamService";

const DEFAULT_SETTINGS: TeamPageSettings = {
  pageTitle: "Our Team",
  pageSubtitle: "Let see our Awesome Team members",
  itemsPerPage: 8,
};

const resolveImage = (
  filename: string | undefined,
  baseUrl: string | undefined,
  fallback: string
) => {
  const trimmed = String(filename || "").trim();
  if (!trimmed) return fallback;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const base = String(baseUrl || "").replace(/\/+$/, "");
  return base ? `${base}/${encodeURIComponent(trimmed)}` : fallback;
};

const Teams: React.FC = () => {
  const [settings, setSettings] = useState<TeamPageSettings>(DEFAULT_SETTINGS);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [mediaBaseUrl, setMediaBaseUrl] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);

  const pageSize = settings.itemsPerPage || DEFAULT_SETTINGS.itemsPerPage || 8;

  const fetchTeams = useCallback(async () => {
    setLoading(true);
    try {
      const data = await teamService.getTeams({
        search: appliedSearch || undefined,
        page: currentPage,
        limit: pageSize,
      });
      setSettings({ ...DEFAULT_SETTINGS, ...data.settings });
      setMembers(data.members || []);
      setTotalPages(data.pagination?.pages || 1);
      setMediaBaseUrl(data.mediaBaseUrl?.img || "");
    } catch {
      setMembers([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  }, [appliedSearch, currentPage, pageSize]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  const handleSearch = () => {
    setCurrentPage(1);
    setAppliedSearch(searchQuery.trim());
  };

  return (
    <div className="pf-teams">
      <PFContainer>
        <div className="pf-teams__breadcrumb">
          <BreadcrumbsComponentSecondLevel
            breadcrumbTitle="Home"
            breadcrumbSubTitle1="About us"
            breadcrumbSubTitle2="Team"
            breadcrumbLinkTitleTo="/"
            breadcrumbLinkSubTitle1To="/"
          />
        </div>

        <header className="pf-teams__header">
          <h1 className="pf-teams__title">{settings.pageTitle || DEFAULT_SETTINGS.pageTitle}</h1>
          <p className="pf-teams__subtitle">
            {settings.pageSubtitle || DEFAULT_SETTINGS.pageSubtitle}
          </p>
        </header>

        <div className="pf-teams__search-wrap">
          <div className="pf-teams__search-bar">
            <SearchIcon className="pf-teams__search-icon" />
            <input
              type="text"
              className="pf-teams__search-input"
              placeholder="Looking for something specific"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <button type="button" className="pf-teams__search-btn" onClick={handleSearch}>
              Search now
            </button>
          </div>
        </div>

        {loading ? (
          <p className="pf-teams__no-results">Loading team members...</p>
        ) : (
          <>
            <div className="pf-teams__grid">
              {members.map((member) => (
                <div key={member.id} className="pf-teams__card">
                  <div className="pf-teams__card-image-wrap">
                    <img
                      src={resolveImage(member.profileImage, mediaBaseUrl, defaultAvatar)}
                      alt={member.fullName}
                      className="pf-teams__card-image"
                    />
                  </div>
                  <h3 className="pf-teams__card-name">{member.fullName}</h3>
                  <p className="pf-teams__card-role">{member.jobTitle}</p>
                  {(member.email || member.phone) && (
                    <div className="pf-teams__card-contact">
                      {member.email && (
                        <a href={`mailto:${member.email}`} className="pf-teams__card-contact-link">
                          {member.email}
                        </a>
                      )}
                      {member.phone && (
                        <a href={`tel:${member.phone.replace(/\s/g, "")}`} className="pf-teams__card-contact-link">
                          {member.phone}
                        </a>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {members.length > 0 && (
              <div className="pf-teams__pagination">
                <PFPagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}

            {!members.length && (
              <p className="pf-teams__no-results">No team members match your search.</p>
            )}
          </>
        )}
      </PFContainer>
    </div>
  );
};

export default Teams;
