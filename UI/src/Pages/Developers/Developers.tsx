import { useMemo, useState, useRef, useEffect } from "react";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentFirstLevel } from "../../Components/parts/component";
import "../../assets/styles/Developers.scss";
import {
  Box,
  Button,
  FormControl,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Typography,
} from "@mui/material";
import { DownArrowIconBlack, SearchIcon } from "../../Components/parts/icon";
import DeveloperCard, {
  developerLogos,
  type DeveloperCardProps,
  DeveloperCardSkeleton,
} from "./components/DeveloperCard";
import PFPagination from "../../Components/pagination/PFPagination";
import {
  getListingSearchCityMasterData,
  searchDevelopers,
  getSupportedUrlsMasterData,
  type SupportedUrls,
} from "../../services/apiService";

type LocationOption = { label: string; value: string };

type SupportedUrlMap = Record<string, unknown>;

function normalizeSupportedUrls(items: SupportedUrls | null | undefined): SupportedUrlMap | null {
  if (!items) return null;
  if (Array.isArray(items)) {
    return (items as Array<Record<string, unknown>>).reduce((acc: SupportedUrlMap, cur) => {
      Object.assign(acc, cur);
      return acc;
    }, {});
  }
  if (typeof items === "object") return items as SupportedUrlMap;
  return null;
}

function resolveSupportedUrlPath(url: unknown, baseImg?: string | null): string {
  if (!url) return "";
  const s = String(url);
  if (/^https?:\/\//i.test(s)) return s;
  if (!baseImg) return s;
  return `${String(baseImg).replace(/\/$/, "")}/${s.replace(/^\//, "")}`;
}

function Developers() {
  const [searchValue, setSearchValue] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(false);
  const [locationLabel, setLocationLabel] = useState("");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [locationOptions, setLocationOptions] = useState<LocationOption[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);

  const [developers, setDevelopers] = useState<DeveloperCardProps[]>([]);
  const [developersLoading, setDevelopersLoading] = useState(false);
  const [developersError, setDevelopersError] = useState<string | null>(null);
  const [totalDevelopers, setTotalDevelopers] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [developerImgBase, setDeveloperImgBase] = useState<string>("");

  const [appliedName, setAppliedName] = useState("");
  const [appliedLocationId, setAppliedLocationId] = useState("");

  const handleToggle = () => {
    setOpen((prev) => !prev);
  };
  const handleSelect = (value: string) => {
    const opt = locationOptions.find((item) => item.value === value);
    setSelectedLocationId(value);
    setLocationLabel(opt?.label || "");
    setOpen(false);
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open]);
  const selectProps = {
    IconComponent: (iconProps: any) => (
      <DownArrowIconBlack
        {...iconProps}
        fill="#707070"
        className={`pf-developers__select-icon ${iconProps.className || ""}`}
      />
    ),
    MenuProps: {
      classes: { paper: "pf-dropdown" },
      MenuListProps: { disablePadding: true },
    },
  } as const;

  useEffect(() => {
    let cancelled = false;
    setLocationsLoading(true);
    void Promise.all([getListingSearchCityMasterData("project"), getSupportedUrlsMasterData()])
      .then(([locResp, suResp]) => {
        if (cancelled) return;
        if (locResp?.status === false) throw new Error(String(locResp.message ?? "Locations failed"));
        if (suResp?.status === false) throw new Error(String(suResp.message ?? "Supported URLs failed"));

        const cities = locResp?.data?.cities ?? [];
        const opts = (Array.isArray(cities) ? cities : [])
          .filter((c) => c?._id && c?.displayName)
          .map((c) => ({ value: String(c._id), label: String(c.displayName) }));
        setLocationOptions(opts);

        const supportedMap = normalizeSupportedUrls(suResp?.data?.items);
        const base = (supportedMap?.developerUrl as any)?.img;
        setDeveloperImgBase(typeof base === "string" ? base : "");
      })
      .catch(() => {
        if (!cancelled) {
          setLocationOptions([]);
          setDeveloperImgBase("");
        }
      })
      .finally(() => {
        if (!cancelled) setLocationsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setDevelopersError(null);
    setDevelopersLoading(true);
    void searchDevelopers({
      name: appliedName || undefined,
      locationId: appliedLocationId || undefined,
      page,
      limit: 12,
    })
      .then((resp) => {
        if (cancelled) return;
        if (resp?.status === false) {
          throw new Error(typeof resp.message === "string" ? resp.message : "Developers load failed");
        }
        const items = resp?.data?.items ?? [];
        const pagination = resp?.data?.pagination;
        const mapped: DeveloperCardProps[] = (Array.isArray(items) ? items : []).map((d, i) => ({
          developerId: typeof d?._id === "string" ? d._id : undefined,
          name: String(d?.name ?? "Developer"),
          foundedIn: typeof d?.foundedYear === "number" ? d.foundedYear : null,
          description: String(d?.description ?? ""),
          projectsCount: typeof d?.totalProjects === "number" ? d.totalProjects : 0,
          logo:
            resolveSupportedUrlPath(d?.logo, developerImgBase) ||
            developerLogos[i % developerLogos.length],
        }));
        setDevelopers(mapped);
        setTotalDevelopers(typeof pagination?.total === "number" ? pagination.total : mapped.length);
        setTotalPages(typeof pagination?.totalPages === "number" && pagination.totalPages > 0 ? pagination.totalPages : 1);
      })
      .catch((e) => {
        if (cancelled) return;
        setDevelopers([]);
        setTotalDevelopers(0);
        setTotalPages(1);
        setDevelopersError(e instanceof Error ? e.message : "Could not load developers");
      })
      .finally(() => {
        if (!cancelled) setDevelopersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appliedName, appliedLocationId, page, developerImgBase]);

  return (
    <main className="pf-developers pf-developers-bg">
      <PFContainer>
        <BreadcrumbsComponentFirstLevel
          breadcrumbTitle="Home"
          breadcrumbSubTitle1="Find developers"
          breadcrumbLinkTitleTo="/"
        />

        <Box className="pf-developers__header">
          <h1 className="pf-developers__title">
            Top Real Estate Developers in UAE
          </h1>
        </Box>

        <Box className="pf-developers__card">
          <Box className="pf-developers__toolbar">
            <Box className="pf-developers__title-row">
              <Typography className="pf-developers__label">
                Developers
              </Typography>
              <Box className="pf-developers__count">
                {totalDevelopers} developers
              </Box>
            </Box>

            <Box className="pf-developers__actions">
              <TextField
                className="pf-developers__field pf-developers__search-field"
                placeholder="Search for a developer"
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                size="small"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon className="pf-developers__search-icon" />
                    </InputAdornment>
                  ),
                }}
              />

              {/* Location select dropdown */}
              <Box ref={dropdownRef} className="pf-agent-Service__custom-select" style={{ position: "relative" }}>
                {/* Button */}
                <Box
                  className="pf-agent-Service__select-btn"
                  onClick={handleToggle}
                >
                  <Typography
                    className={`pf-agent-Service__name ${location ? "selected" : "placeholder"
                      }`}
                  >
                    {locationLabel || "Location"}
                  </Typography>
                  <DownArrowIconBlack width={13} height={13} />
                </Box>

                {/* Dropdown */}
                {open && (
                  <Box className="pf-agent-Service__dropdown">
                    {locationOptions.map((item) => {
                      const isActive = selectedLocationId === item.value;
                      return (
                        <Box
                          key={item.label}
                          className={`pf-saved-alerts__dropdown-item ${isActive ? "active" : ""
                            }`}
                          onClick={() => handleSelect(item.value)}
                        >
                          {item.label}
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Box>

              <Button
                className="pf-developers__search-btn"
                variant="contained"
                disableElevation
                onClick={() => {
                  setAppliedName(searchValue.trim());
                  setAppliedLocationId(selectedLocationId);
                  setPage(1);
                }}
                disabled={developersLoading}
              >
                Search
              </Button>
            </Box>
          </Box>
        </Box>

        <Box className="pf-developers__grid">
          {developersError ? (
            <Typography color="error" sx={{ py: 2 }}>
              {developersError}
            </Typography>
          ) : null}
          {developersLoading && !developersError ? (
            <>
              {Array.from({ length: 12 }).map((_, i) => (
                <DeveloperCardSkeleton key={`developer-skel-${i}`} />
              ))}
            </>
          ) : null}
          {!developersLoading && !developersError && developers.length === 0 ? (
            <Typography sx={{ py: 2 }}>No developers found.</Typography>
          ) : null}
          {!developersLoading &&
          !developersError &&
          developers.map((developer) => (
            <DeveloperCard key={`${developer.developerId ?? developer.name}`} {...developer} />
          ))}
        </Box>

        {!developersLoading &&
        !developersError &&
        developers.length > 0 &&
        totalPages > 0 ? (
          <PFPagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={setPage}
            className="pf-developers__pagination"
          />
        ) : null}
      </PFContainer>
    </main>
  );
}

export default Developers;
{/* <FormControl
                className="pf-developers__field pf-developers__select-field"
                variant="outlined"
                size="small"
              >
                <Select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  displayEmpty
                  inputProps={{ "aria-label": "Select location" }}
                  className="pf-developers__select"
                  IconComponent={selectProps.IconComponent}
                  MenuProps={selectProps.MenuProps}
                >
                  {locationOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl> */}