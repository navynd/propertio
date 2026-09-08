import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  Button,
  InputAdornment,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { useLocation, useNavigate } from "react-router-dom";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentFirstLevel } from "../../Components/parts/component";
import { DownArrowIconBlack, SearchIcon } from "../../Components/parts/icon";
import AgentDetailsCard, {
  AgentDetailsCardSkeleton,
  type AgentCardProps,
} from "./components/agentCard";
import CompanyDetailsCard, {
  CompanyDetailsCardSkeleton,
  type CompanyCardProps,
} from "./components/companyCard";
import PFPagination from "../../Components/pagination/PFPagination";
import "../../assets/styles/AgentandAgency.scss";
import CompanyLogo1 from "../../assets/img/company_logos/1.png";
import {
  getAgentSearchMasterBundle,
  searchAgents,
  searchAgencies,
  type AgencySearchApiItem,
  type AgentSearchApiItem,
  type MasterCountry,
  type MasterLanguageRow,
  type ServiceNeededMaster,
} from "../../services/apiService";

type TabKey = "agents" | "companies";
type AgentAgencyLocationState = {
  activeTab?: TabKey;
};

const COMPANY_PER_PAGE = 20;
/** Agents per page for `GET /agents/search` (API default/max allow higher; we use 20). */
const AGENTS_PAGE_LIMIT = 20;
const AGENT_SKELETON_COUNT = 12;
const COMPANY_SKELETON_COUNT = 12;

function resolveSupportedUrlPath(
  url: unknown,
  baseImg?: string | null
): string {
  if (typeof url !== "string") return "";
  const trimmed = url.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const base = typeof baseImg === "string" ? baseImg.trim() : "";
  if (!base) return trimmed;

  const baseNormalized = base.replace(/\/$/, "");
  const pathNormalized = trimmed.replace(/^\//, "");
  return `${baseNormalized}/${pathNormalized}`;
}

function mapSearchAgentToCard(
  item: AgentSearchApiItem,
  agentImgBase: string,
  agencyImgBase: string,
  fallbackImg: string
): AgentCardProps {
  const langs = (item.languages ?? [])
    .map((l) => (typeof l?.name === "string" ? l.name.trim() : ""))
    .filter(Boolean);

  return {
    agentId: item._id,
    name: item.name?.trim() || "Agent",
    title:
      (typeof item.specialization?.title === "string" && item.specialization.title.trim()) ||
      "Property consultant",
    rating: typeof item.ratings?.average === "number" ? item.ratings.average : 0,
    ratingsCount: item.ratings?.totalCount,
    isSuperAgent: item.agentType === "superagent",
    agency: item.agency?.name?.trim() || "—",
    agencyLogo:
      resolveSupportedUrlPath(item.agency?.logo, agencyImgBase) || fallbackImg,
    profileImage:
      resolveSupportedUrlPath(item.profilePicture, agentImgBase) || fallbackImg,
    languages: langs,
    nationality: item.nationality?.name?.trim() || "—",
    forSale: item.statistics?.totalSaleProperties ?? 0,
    forRent: item.statistics?.totalRentProperties ?? 0,
  };
}

function formatAgencyAddress(
  addr: AgencySearchApiItem["address"] | undefined
): string {
  if (!addr || typeof addr !== "object") return "—";
  const full =
    typeof addr.fullAddress === "string" ? addr.fullAddress.trim() : "";
  if (full) return full;
  const parts = [addr.city, addr.state, addr.country]
    .map((s) => (typeof s === "string" ? s.trim() : ""))
    .filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function mapSearchAgencyToCard(
  item: AgencySearchApiItem,
  agencyImgBase: string,
  fallbackLogo: string
): CompanyCardProps {
  const logo =
    resolveSupportedUrlPath(item.logo, agencyImgBase) || fallbackLogo;
  return {
    companyId: item._id,
    name: item.name?.trim() || "Company",
    location: formatAgencyAddress(item.address),
    logo,
    forSale: item.statistics?.totalSaleListings ?? 0,
    forRent: item.statistics?.totalRentListings ?? 0,
    nationality: item.nationality?.name?.trim() || "—",
    agentsCount: item.totalAgents ?? 0,
    superagentCount: item.totalSuperAgents ?? 0,
  };
}

function AgentandAgency() {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const state = location.state as AgentAgencyLocationState | undefined;
    return state?.activeTab ?? "agents";
  });
  const [page, setPage] = useState(1);

  const [searchInput, setSearchInput] = useState("");

  const [masterServices, setMasterServices] = useState<ServiceNeededMaster[]>([]);
  const [masterLanguages, setMasterLanguages] = useState<MasterLanguageRow[]>([]);
  const [masterCountries, setMasterCountries] = useState<MasterCountry[]>([]);
  const [agentImgBase, setAgentImgBase] = useState("");
  const [agencyImgBase, setAgencyImgBase] = useState("");
  const [mastersReady, setMastersReady] = useState(false);
  const [mastersError, setMastersError] = useState<string | null>(null);

  const [serviceValue, setServiceValue] = useState("");
  const [serviceLabel, setServiceLabel] = useState("Service needed");
  const [languageId, setLanguageId] = useState("");
  const [languageLabel, setLanguageLabel] = useState("Language");
  const [nationalityId, setNationalityId] = useState("");
  const [nationalityLabel, setNationalityLabel] = useState("Nationality");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedServiceNeeded, setAppliedServiceNeeded] = useState("");
  const [appliedLanguageId, setAppliedLanguageId] = useState("");
  const [appliedNationalityId, setAppliedNationalityId] = useState("");

  const [agents, setAgents] = useState<AgentCardProps[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  const [agentTotalPages, setAgentTotalPages] = useState(1);
  /** Bumps to re-run agent fetch without changing filters (e.g. retry). */
  const [agentListVersion, setAgentListVersion] = useState(0);
  /** False until an agent list request finishes — closes the frame where mastersReady is true but loading hasn't flipped yet. */
  const [agentListReady, setAgentListReady] = useState(false);

  const [companies, setCompanies] = useState<CompanyCardProps[]>([]);
  const [companiesLoading, setCompaniesLoading] = useState(false);
  const [companiesError, setCompaniesError] = useState<string | null>(null);
  const [companyTotalPages, setCompanyTotalPages] = useState(1);
  const [companyListVersion, setCompanyListVersion] = useState(0);
  const [companyListReady, setCompanyListReady] = useState(false);

  const [open, setOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const [nationOpen, setNationOpen] = useState(false);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const languageDropdownRef = useRef<HTMLDivElement>(null);
  const nationalityDropdownRef = useRef<HTMLDivElement>(null);

  const isCompanyTab = activeTab === "companies";

  const serviceRows = useMemo(() => {
    return [{ name: "Service needed", value: "" }, ...masterServices];
  }, [masterServices]);

  const languageRows = useMemo(() => {
    const rows = masterLanguages
      .filter((l) => String(l?.name ?? "").trim() && String(l?._id ?? "").trim())
      .map((l) => ({ name: String(l.name).trim(), id: String(l._id) }));
    return [{ name: "Language", id: "" }, ...rows];
  }, [masterLanguages]);

  const nationalityRows = useMemo(() => {
    const rows = masterCountries
      .filter((c) => String(c?.name ?? "").trim())
      .map((c) => ({
        name: String(c.name).trim(),
        id: String(c._id ?? c.id ?? ""),
      }))
      .filter((r) => r.id);
    return [{ name: "Nationality", id: "" }, ...rows];
  }, [masterCountries]);

  useEffect(() => {
    const incomingTab = (
      location.state as AgentAgencyLocationState | undefined
    )?.activeTab;
    if (incomingTab && incomingTab !== activeTab) {
      setActiveTab(incomingTab);
      setPage(1);
    }
  }, [location.state]);

  useEffect(() => {
    let cancelled = false;
    setMastersError(null);
    void getAgentSearchMasterBundle()
      .then((resp) => {
        if (cancelled) return;
        if (resp?.status === false) {
          throw new Error(
            typeof resp.message === "string" ? resp.message : "Master data failed"
          );
        }
        const d = resp.data;
        setMasterServices(Array.isArray(d?.services) ? d.services : []);
        setMasterLanguages(Array.isArray(d?.languages) ? d.languages : []);
        setMasterCountries(Array.isArray(d?.countries) ? d.countries : []);
        const su = d?.supportedUrls as
          | {
            agentUrl?: { img?: string };
            agencyUrl?: { img?: string };
          }
          | undefined;
        setAgentImgBase(typeof su?.agentUrl?.img === "string" ? su.agentUrl.img : "");
        setAgencyImgBase(typeof su?.agencyUrl?.img === "string" ? su.agencyUrl.img : "");
        setMastersReady(true);
      })
      .catch((e) => {
        if (!cancelled) {
          setMastersError(e instanceof Error ? e.message : "Could not load filters");
          setMastersReady(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (isCompanyTab || !mastersReady) return;

    const ac = new AbortController();
    setAgentsLoading(true);
    setAgentsError(null);

    const searchQuery = appliedSearch.trim();
    void searchAgents({
      name: searchQuery || undefined,
      location: searchQuery || undefined,
      serviceNeeded: appliedServiceNeeded || undefined,
      language: appliedLanguageId || undefined,
      nationality: appliedNationalityId || undefined,
      agentType: "all",
      page,
      limit: AGENTS_PAGE_LIMIT,
      signal: ac.signal,
    })
      .then((resp) => {
        if (ac.signal.aborted) return;
        if (resp?.status === false) {
          throw new Error(
            typeof resp.message === "string" ? resp.message : "Search failed"
          );
        }
        const items = resp?.data?.items ?? [];
        const pagination = resp?.data?.pagination;
        const mapped = Array.isArray(items)
          ? items.map((it) =>
            mapSearchAgentToCard(it, agentImgBase, agencyImgBase, CompanyLogo1)
          )
          : [];
        setAgents(mapped);
        const tp =
          typeof pagination?.totalPages === "number" && pagination.totalPages >= 1
            ? pagination.totalPages
            : 1;
        setAgentTotalPages(Math.max(1, tp));
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setAgents([]);
        setAgentsError(e instanceof Error ? e.message : "Search failed");
      })
      .finally(() => {
        if (!ac.signal.aborted) {
          setAgentsLoading(false);
          setAgentListReady(true);
        }
      });

    return () => ac.abort();
  }, [
    isCompanyTab,
    mastersReady,
    page,
    appliedSearch,
    appliedServiceNeeded,
    appliedLanguageId,
    appliedNationalityId,
    agentImgBase,
    agencyImgBase,
    agentListVersion,
  ]);

  useEffect(() => {
    if (!isCompanyTab || !mastersReady) return;

    const ac = new AbortController();
    setCompaniesLoading(true);
    setCompaniesError(null);

    const searchQuery = appliedSearch.trim();
    void searchAgencies({
      name: searchQuery || undefined,
      location: searchQuery || undefined,
      serviceNeeded: appliedServiceNeeded || undefined,
      page,
      limit: COMPANY_PER_PAGE,
      signal: ac.signal,
    })
      .then((resp) => {
        if (ac.signal.aborted) return;
        if (resp?.status === false) {
          throw new Error(
            typeof resp.message === "string" ? resp.message : "Search failed"
          );
        }
        const items = resp?.data?.items ?? [];
        const pagination = resp?.data?.pagination;
        const mapped = Array.isArray(items)
          ? items.map((it) =>
            mapSearchAgencyToCard(it, agencyImgBase, CompanyLogo1)
          )
          : [];
        setCompanies(mapped);
        const tp =
          typeof pagination?.totalPages === "number" && pagination.totalPages >= 1
            ? pagination.totalPages
            : 1;
        setCompanyTotalPages(Math.max(1, tp));
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setCompanies([]);
        setCompaniesError(e instanceof Error ? e.message : "Search failed");
      })
      .finally(() => {
        if (!ac.signal.aborted) {
          setCompaniesLoading(false);
          setCompanyListReady(true);
        }
      });

    return () => ac.abort();
  }, [
    isCompanyTab,
    mastersReady,
    page,
    appliedSearch,
    appliedServiceNeeded,
    agencyImgBase,
    companyListVersion,
  ]);

  useEffect(() => {
    if (isCompanyTab || page <= agentTotalPages) return;
    setPage(agentTotalPages);
  }, [isCompanyTab, page, agentTotalPages]);

  useEffect(() => {
    if (!isCompanyTab || page <= companyTotalPages) return;
    setPage(companyTotalPages);
  }, [isCompanyTab, page, companyTotalPages]);

  const handleToggle = () => {
    setOpen((prev) => {
      const newValue = !prev;
      if (newValue) {
        if (langOpen) setLangOpen(false);
        if (nationOpen) setNationOpen(false);
      }
      return newValue;
    });
  };
  const handleLangToggle = () => {
    setLangOpen((prev) => {
      const newValue = !prev;
      if (newValue) {
        if (open) setOpen(false);
        if (nationOpen) setNationOpen(false);
      }
      return newValue;
    });
  };
  const handleNationToggle = () => {
    setNationOpen((prev) => {
      const newValue = !prev;
      if (newValue) {
        if (open) setOpen(false);
        if (langOpen) setLangOpen(false);
      }
      return newValue;
    });
  };

  const selectService = (opt: ServiceNeededMaster | { name: string; value: string }) => {
    setServiceValue(opt.value);
    setServiceLabel(opt.value ? opt.name : "Service needed");
    setOpen(false);
  };

  const selectLanguage = (opt: { name: string; id: string }) => {
    setLanguageId(opt.id);
    setLanguageLabel(opt.id ? opt.name : "Language");
    setLangOpen(false);
  };

  const selectNationality = (opt: { name: string; id: string }) => {
    setNationalityId(opt.id);
    setNationalityLabel(opt.id ? opt.name : "Nationality");
    setNationOpen(false);
  };

  const handleTabChange = (_event: React.SyntheticEvent, value: TabKey) => {
    setActiveTab(value);
    setPage(1);
  };

  const searchPlaceholder = isCompanyTab
    ? "Enter Location or company name"
    : "Enter Location or agent name";

  const pageTitle = isCompanyTab
    ? "Find the best real estate companies"
    : "Find your agent to find a home";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        serviceDropdownRef.current &&
        !serviceDropdownRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        languageDropdownRef.current &&
        !languageDropdownRef.current.contains(event.target as Node)
      ) {
        setLangOpen(false);
      }
    };
    if (langOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [langOpen]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        nationalityDropdownRef.current &&
        !nationalityDropdownRef.current.contains(event.target as Node)
      ) {
        setNationOpen(false);
      }
    };
    if (nationOpen) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [nationOpen]);

  const handleAgentClick = (agent: AgentCardProps) => {
    const agentId = String(agent.agentId ?? "").trim();
    if (agentId) {
      navigate(`/agentdetails/${encodeURIComponent(agentId)}`, {
        state: { agentId },
      });
      return;
    }
    navigate("/agentdetails");
  };

  const handleCompanyClick = (company: CompanyCardProps) => {
    const companyId = String(company.companyId ?? "").trim();
    if (companyId) {
      navigate(`/companydetails/${encodeURIComponent(companyId)}`, {
        state: { companyId, activeTab: "companies" },
      });
      return;
    }
    navigate("/companydetails");
  };

  const totalPages = isCompanyTab ? companyTotalPages : agentTotalPages;
  /** Hide pagination until list data is loaded and there is more than one page. */
  const showPagination =
    totalPages > 1 &&
    (isCompanyTab
      ? mastersReady && !companiesLoading && !companiesError
      : mastersReady && !agentsLoading && !agentsError);

  const runSearch = () => {
    setAppliedSearch(searchInput.trim());
    setAppliedServiceNeeded(serviceValue);
    setAppliedLanguageId(languageId);
    setAppliedNationalityId(isCompanyTab ? "" : nationalityId);
    setPage(1);
  };

  /** Skeleton until masters + at least one agent request cycle (agentListReady) — no empty-message flash between them. */
  const showAgentSkeleton =
    !isCompanyTab &&
    !agentsError &&
    agents.length === 0 &&
    (!mastersReady || agentsLoading || !agentListReady);
  const showAgentError = !isCompanyTab && agentsError && !agentsLoading;
  const showAgentEmpty =
    !isCompanyTab &&
    agentListReady &&
    !agentsLoading &&
    !agentsError &&
    agents.length === 0;

  const showCompanySkeleton = isCompanyTab &&!companiesError &&companies.length === 0 && (!mastersReady || companiesLoading || !companyListReady);
  const showCompanyError = isCompanyTab && companiesError && !companiesLoading;
  const showCompanyEmpty =
    isCompanyTab &&
    companyListReady &&
    !companiesLoading &&
    !companiesError &&
    companies.length === 0;

  return (
    <main className="pf-agent-agency">
      <PFContainer>
        <BreadcrumbsComponentFirstLevel
          breadcrumbTitle="Home"
          breadcrumbSubTitle1={isCompanyTab ? "Find companies" : "Find agents"}
          breadcrumbLinkTitleTo="/"
        />

        <Box className="pf-agent-agency__header">
          <h1 className="pf-agent-agency__title">{pageTitle}</h1>
        </Box>

        <Box className="pf-agent-agency__card">
          <Box className="pf-agent-agency__toolbar">
            <Tabs
              value={activeTab}
              onChange={handleTabChange}
              className="pf-agent-agency__tabs"
            >
              <Tab
                disableRipple
                value="agents"
                label="Agents"
                className="pf-agent-agency__tab"
              />
              <Tab
                disableRipple
                value="companies"
                label="Companies"
                className="pf-agent-agency__tab"
              />
            </Tabs>

            <TextField
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch();
              }}
              placeholder={searchPlaceholder}
              className="pf-agent-agency__field pf-agent-agency__search-field"
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon className="pf-agent-agency__search-icon" />
                  </InputAdornment>
                ),
              }}
            />

            <Box
              ref={serviceDropdownRef}
              className="pf-agent-Service__custom-select"
              style={{ position: "relative" }}
            >
              <Box className="pf-agent-Service__select-btn" onClick={handleToggle}>
                <Typography className="pf-agent-Service__name">
                  {serviceLabel}
                </Typography>
                <DownArrowIconBlack width={13} height={13} />
              </Box>
              {open && (
                <Box className="pf-agent-Service__dropdown">
                  {serviceRows.map((row) => {
                    const isActive =
                      (row.value === "" && serviceValue === "") ||
                      row.value === serviceValue;
                    return (
                      <Box
                        key={row.value || "all"}
                        className={`pf-saved-alerts__dropdown-item ${isActive ? "active" : ""
                          }`}
                        onClick={() => selectService(row)}
                      >
                        {row.name}
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>

            {!isCompanyTab ? (
              <Box
                ref={languageDropdownRef}
                className="pf-agent-Service__custom-select"
                style={{ position: "relative" }}
              >
                <Box
                  className="pf-agent-Service__select-btn"
                  onClick={handleLangToggle}
                >
                  <Typography className="pf-agent-Service__name">
                    {languageLabel}
                  </Typography>
                  <DownArrowIconBlack width={14} height={14} />
                </Box>
                {langOpen && (
                  <Box className="pf-agent-Service__dropdown">
                    {languageRows.map((row) => {
                      const isActive = row.id === languageId;
                      return (
                        <Box
                          key={row.id || "lang-all"}
                          className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""
                            }`}
                          onClick={() => selectLanguage(row)}
                        >
                          {row.name}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            ) : null}

            {!isCompanyTab ? (
              <Box
                ref={nationalityDropdownRef}
                className="pf-agent-Service__custom-select"
                style={{ position: "relative" }}
              >
                <Box
                  className="pf-agent-Service__select-btn"
                  onClick={handleNationToggle}
                >
                  <Typography className="pf-agent-Service__name">
                    {nationalityLabel}
                  </Typography>
                  <DownArrowIconBlack width={14} height={14} />
                </Box>
                {nationOpen && (
                  <Box className="pf-agent-Service__dropdown">
                    {nationalityRows.map((row) => {
                      const isActive = row.id === nationalityId;
                      return (
                        <Box
                          key={row.id || "nat-all"}
                          className={`pf-agent-Service__dropdown-item ${
                            isActive ? "active" : ""
                          }`}
                          onClick={() => selectNationality(row)}
                        >
                          {row.name}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>
            ) : null}

            <Button
              disableRipple
              variant="contained"
              className="pf-agent-agency__search-btn"
              onClick={() => runSearch()}
              disabled={
                !mastersReady ||
                (isCompanyTab ? companiesLoading : agentsLoading)
              }
            >
              Search
            </Button>
          </Box>
          {mastersError ? (
            <Typography variant="caption" color="error" sx={{ px: 2, pb: 1, display: "block" }}>
              {mastersError}
            </Typography>
          ) : null}
        </Box>

        {!isCompanyTab && showAgentError ? (
          <Box className="pf-agent-agency__grid" py={4}>
            <Typography color="error">{agentsError}</Typography>
            <Button
              variant="contained"
              onClick={() => setAgentListVersion((v) => v + 1)}
              sx={{ mt: 2 }}
            >
              Try again
            </Button>
          </Box>
        ) : null}

        {!isCompanyTab && showAgentSkeleton ? (
          <Box className="pf-agent-agency__grid">
            {Array.from({ length: AGENT_SKELETON_COUNT }).map((_, i) => (
              <AgentDetailsCardSkeleton key={`agent-skel-${i}`} />
            ))}
          </Box>
        ) : null}

        {!isCompanyTab && !showAgentSkeleton && !showAgentError ? (
          <Box className="pf-agent-agency__grid">
            {showAgentEmpty ? (
              <Box py={4}>
                <Typography>No agents match your filters.</Typography>
              </Box>
            ) : (
              agents.map((agent) => (
                <AgentDetailsCard
                  key={agent.agentId ?? agent.name}
                  {...agent}
                  onClick={() => handleAgentClick(agent)}
                />
              ))
            )}
          </Box>
        ) : null}

        {isCompanyTab && showCompanyError ? (
          <Box className="pf-agent-agency__grid" py={4}>
            <Typography color="error">{companiesError}</Typography>
            <Button
              variant="contained"
              onClick={() => setCompanyListVersion((v) => v + 1)}
              sx={{ mt: 2 }}
            >
              Try again
            </Button>
          </Box>
        ) : null}

        {isCompanyTab && showCompanySkeleton ? (
          <Box className="pf-agent-agency__grid pf-agent-agency__grid--companies">
            {Array.from({ length: COMPANY_SKELETON_COUNT }).map((_, i) => (
              <CompanyDetailsCardSkeleton key={`company-skel-${i}`} />
            ))}
          </Box>
        ) : null}

        {isCompanyTab && !showCompanySkeleton && !showCompanyError ? (
          <Box className="pf-agent-agency__grid pf-agent-agency__grid--companies">
            {showCompanyEmpty ? (
              <Box py={4}>
                <Typography>No companies match your filters.</Typography>
              </Box>
            ) : (
              companies.map((company) => (
                <CompanyDetailsCard
                  key={company.companyId ?? company.name}
                  {...company}
                  onClick={() => handleCompanyClick(company)}
                />
              ))
            )}
          </Box>
        ) : null}

        {showPagination ? (
          <Box className="pf-agent-agency__pagination">
            <PFPagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          </Box>
        ) : null}
      </PFContainer>
    </main>
  );
}

export default AgentandAgency;
