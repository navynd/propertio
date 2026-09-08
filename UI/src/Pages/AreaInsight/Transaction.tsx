import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Box, Typography } from "@mui/material";
import PFContainer from "../../Components/container/PFContainer";
import { BreadcrumbsComponentSecondLevel } from "../../Components/parts/component";
import { DownArrowIconBlack, DownArrowIcon, LocationIcon, SearchIcon } from "../../Components/parts/icon";
import transactionBanner from "../../assets/img/transactionbanner.png";
import "../../assets/styles/AreaInsight/Transaction.scss";
import PFPagination from "../../Components/pagination/PFPagination";
import Loader from "../../Components/loader/loader";
import {
    getHistoricalTransactions,
    getListingFilterMasterData,
    type HistoricalTransactionRow,
    type HistoricalTransactionsData,
    type HistoricalTransactionsParams,
    type HistoricalTransactionSortBy,
    type HistoricalTransactionTimeframe,
    type NamedValueMaster,
    type PropertyTypeMaster,
} from "../../services/apiService";

type RentSold = "rented" | "sold";

const TIME_RANGES = [
    "YTD",
    "1 week",
    "1 month",
    "3 months",
    "6 months",
    "1 year",
    "3 years",
] as const;

const TIME_LABEL_TO_API: Record<(typeof TIME_RANGES)[number], HistoricalTransactionTimeframe> = {
    YTD: "ytd",
    "1 week": "1w",
    "1 month": "1m",
    "3 months": "3m",
    "6 months": "6m",
    "1 year": "1y",
    "3 years": "3y",
};

const BED_OPTIONS: { label: string; value: string }[] = [
    { label: "Bed", value: "" },
    { label: "Studio", value: "studio" },
    { label: "1", value: "1" },
    { label: "2", value: "2" },
    { label: "3", value: "3" },
    { label: "4", value: "4" },
    { label: "5", value: "5" },
    { label: "6", value: "6" },
    { label: "7", value: "7" },
    { label: "7+", value: "7+" },
];

const SORT_OPTIONS = ["Newest", "Oldest", "Price: High to low", "Price: Low to high"] as const;

const SORT_LABEL_TO_API: Record<(typeof SORT_OPTIONS)[number], HistoricalTransactionSortBy> = {
    Newest: "newest",
    Oldest: "oldest",
    "Price: High to low": "price-high",
    "Price: Low to high": "price-low",
};

type FilterKey = "property" | "bed" | "price";

type DisplayContractStatus = "off-plan" | "ready" | "new" | "renewed";

type AppliedFilters = {
    rentSold: RentSold;
    search: string;
    timeRange: string;
    propertyValue: string;
    bedValue: string;
    priceValue: string;
};

const DEFAULT_APPLIED_FILTERS: AppliedFilters = {
    rentSold: "rented",
    search: "",
    timeRange: "1 week",
    propertyValue: "",
    bedValue: "",
    priceValue: "",
};

const TRANSACTION_PAGE_SIZE = 10;

function formatAed(value: number): string {
    return new Intl.NumberFormat("en-AE", {
        minimumFractionDigits: value % 1 ? 2 : 0,
        maximumFractionDigits: 2,
    }).format(value);
}

function parsePriceFilter(value: string): { priceMin?: number; priceMax?: number } {
    if (!value) return {};
    const minMatch = value.match(/min:(\d+)/);
    const maxMatch = value.match(/max:(\d+)/);
    const out: { priceMin?: number; priceMax?: number } = {};
    if (minMatch) out.priceMin = Number(minMatch[1]);
    if (maxMatch) out.priceMax = Number(maxMatch[1]);
    return out;
}

function buildRentPriceOptions(): { label: string; value: string }[] {
    return [
        { label: "Price", value: "" },
        { label: "Under 50k / year", value: "max:50000" },
        { label: "50k – 100k / year", value: "min:50000:max:100000" },
        { label: "100k+ / year", value: "min:100000" },
    ];
}

function buildSalePriceOptions(priceRange: NamedValueMaster[]): { label: string; value: string }[] {
    const values = priceRange
        .map((item) => Number(item.value))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);

    const options: { label: string; value: string }[] = [{ label: "Price", value: "" }];

    const picks = [500_000, 1_000_000, 2_000_000, 5_000_000].filter((p) =>
        values.some((v) => v >= p * 0.9)
    );

    picks.forEach((max) => {
        options.push({
            label: `Up to ${formatAed(max)}`,
            value: `max:${max}`,
        });
    });

    const top = values[values.length - 1];
    if (top) {
        options.push({
            label: `Above ${formatAed(top)}`,
            value: `min:${top}`,
        });
    }

    return options.length > 2 ? options : buildRentPriceOptions();
}

function contractStatusClass(status: string): DisplayContractStatus {
    const s = status.toLowerCase();
    if (s === "off-plan" || s === "ready" || s === "new" || s === "renewed") {
        return s;
    }
    return "ready";
}

function contractStatusLabel(status: string): string {
    const s = status.toLowerCase();
    if (s === "off-plan") return "OFF-PLAN";
    if (s === "renewed") return "RENEWED";
    if (s === "new") return "NEW";
    return "READY";
}

const Transaction: React.FC = () => {
    const [rentSold, setRentSold] = useState<RentSold>(DEFAULT_APPLIED_FILTERS.rentSold);
    const [searchQuery, setSearchQuery] = useState(DEFAULT_APPLIED_FILTERS.search);
    const [timeRange, setTimeRange] = useState(DEFAULT_APPLIED_FILTERS.timeRange);
    const [propertyValue, setPropertyValue] = useState(DEFAULT_APPLIED_FILTERS.propertyValue);
    const [bedValue, setBedValue] = useState(DEFAULT_APPLIED_FILTERS.bedValue);
    const [priceValue, setPriceValue] = useState(DEFAULT_APPLIED_FILTERS.priceValue);
    const [appliedFilters, setAppliedFilters] = useState<AppliedFilters>(DEFAULT_APPLIED_FILTERS);
    const [openFilter, setOpenFilter] = useState<FilterKey | null>(null);
    const [sortBy, setSortBy] = useState<(typeof SORT_OPTIONS)[number]>("Newest");
    const [openSort, setOpenSort] = useState(false);
    const [txPage, setTxPage] = useState(1);

    const [propertyTypeOptions, setPropertyTypeOptions] = useState<PropertyTypeMaster[]>([]);
    const [masterPriceRange, setMasterPriceRange] = useState<NamedValueMaster[]>([]);

    const [apiData, setApiData] = useState<HistoricalTransactionsData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const sortRef = useRef<HTMLDivElement>(null);
    const filtersRef = useRef<HTMLDivElement>(null);

    const isRentedDraft = rentSold === "rented";
    const isRentedApplied = appliedFilters.rentSold === "rented";

    const propertyOptions = useMemo(() => {
        const opts = [{ label: "Property type", value: "" }];
        propertyTypeOptions.forEach((pt) => {
            const id = pt._id || pt.id;
            if (id && pt.name) {
                opts.push({ label: pt.name, value: id });
            }
        });
        return opts;
    }, [propertyTypeOptions]);

    const priceOptions = useMemo(
        () =>
            isRentedDraft
                ? buildRentPriceOptions()
                : buildSalePriceOptions(masterPriceRange),
        [isRentedDraft, masterPriceRange]
    );

    const propertyLabel = useMemo(
        () => propertyOptions.find((o) => o.value === propertyValue)?.label ?? "Property type",
        [propertyOptions, propertyValue]
    );
    const bedLabel = useMemo(
        () => BED_OPTIONS.find((o) => o.value === bedValue)?.label ?? "Bed",
        [bedValue]
    );
    const priceLabel = useMemo(
        () => priceOptions.find((o) => o.value === priceValue)?.label ?? "Price",
        [priceOptions, priceValue]
    );

    useEffect(() => {
        let mounted = true;
        getListingFilterMasterData()
            .then((resp) => {
                if (!mounted) return;
                const types = (resp.data?.propertyTypes ?? []).filter(
                    (item) => !!(item._id || item.id) && !!item.name?.trim()
                );
                setPropertyTypeOptions(types);
                setMasterPriceRange(resp.data?.priceRange ?? []);
            })
            .catch(() => {
                if (!mounted) return;
                setPropertyTypeOptions([]);
                setMasterPriceRange([]);
            });
        return () => {
            mounted = false;
        };
    }, []);

    useEffect(() => {
        if (!openFilter) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (
                filtersRef.current &&
                !filtersRef.current.contains(event.target as Node)
            ) {
                setOpenFilter(null);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openFilter]);

    useEffect(() => {
        if (!openSort) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
                setOpenSort(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [openSort]);

    const buildRequestParams = useCallback((): HistoricalTransactionsParams => {
        const { rentSold: appliedRentSold, search, timeRange: appliedTimeRange, propertyValue: appliedProperty, bedValue: appliedBed, priceValue: appliedPrice } = appliedFilters;
        const timeframeKey = TIME_RANGES.find((t) => t === appliedTimeRange) ?? "1 week";
        const timeframe = TIME_LABEL_TO_API[timeframeKey] ?? "1w";
        const price = parsePriceFilter(appliedPrice);
        const rented = appliedRentSold === "rented";

        const params: HistoricalTransactionsParams = {
            dealType: rented ? "rent" : "sale",
            city: "Dubai",
            timeframe,
            sortBy: SORT_LABEL_TO_API[sortBy],
            page: txPage,
            limit: TRANSACTION_PAGE_SIZE,
        };

        if (search) params.location = search;
        if (appliedProperty) params.propertyTypeId = appliedProperty;
        if (appliedBed) {
            params.bedrooms = appliedBed as HistoricalTransactionsParams["bedrooms"];
        }
        if (price.priceMin != null) params.priceMin = price.priceMin;
        if (price.priceMax != null) params.priceMax = price.priceMax;

        return params;
    }, [appliedFilters, sortBy, txPage]);

    const fetchTransactions = useCallback(() => {
        const abortController = new AbortController();
        const params = buildRequestParams();
        setLoading(true);
        setError(null);

        getHistoricalTransactions(params, abortController.signal)
            .then((resp) => {
                if (abortController.signal.aborted) return;
                setApiData(resp?.data ?? null);
            })
            .catch((err) => {
                if (abortController.signal.aborted) return;
                console.error("[historical transactions]", err);
                setApiData(null);
                setError("Unable to load transactions. Please try again.");
            })
            .finally(() => {
                if (!abortController.signal.aborted) {
                    setLoading(false);
                }
            });

        return () => abortController.abort();
    }, [buildRequestParams]);

    useEffect(() => {
        const cleanup = fetchTransactions();
        return cleanup;
    }, [fetchTransactions]);

    const handleApplyFilters = () => {
        setAppliedFilters({
            rentSold,
            search: searchQuery.trim(),
            timeRange,
            propertyValue,
            bedValue,
            priceValue,
        });
        setTxPage(1);
    };

    const handleRentSoldTabChange = (next: RentSold) => {
        if (next === rentSold) return;
        setRentSold(next);
        setPriceValue("");
        setAppliedFilters((prev) => ({
            ...prev,
            rentSold: next,
            priceValue: "",
        }));
        setTxPage(1);
    };

    const transactions: HistoricalTransactionRow[] = apiData?.transactions ?? [];
    const summary = apiData?.summary;
    const txTotalPages = apiData?.pagination?.totalPages ?? 1;

    const changePercent = summary?.transactionCountChangePercent;
    const changeLabel =
        changePercent != null
            ? `${changePercent >= 0 ? "+" : ""}${changePercent}% ${changePercent >= 0 ? "▲" : "▼"}`
            : null;

    const renderDropdown = (
        key: FilterKey,
        options: { label: string; value: string }[],
        value: string,
        setValue: (v: string) => void,
        displayLabel: string
    ) => {
        const isOpen = openFilter === key;
        return (
            <Box
                className="pf-transaction__select pf-agent-Service__custom-select"
                style={{ position: "relative" }}
            >
                <Box
                    className="pf-transaction__select-btn pf-agent-Service__select-btn"
                    onClick={() => setOpenFilter((prev) => (prev === key ? null : key))}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setOpenFilter((prev) => (prev === key ? null : key));
                        }
                    }}
                    aria-expanded={isOpen}
                    aria-haspopup="listbox"
                >
                    <Typography className="pf-transaction__select-label pf-agent-Service__name selected">
                        {displayLabel}
                    </Typography>
                    <span className="pf-transaction__select-chevron">
                        <DownArrowIconBlack width={12} height={12} fill="#ffffff" />
                    </span>
                </Box>
                {isOpen && (
                    <Box className="pf-transaction__dropdown pf-agent-Service__dropdown" role="listbox">
                        {options.map((o, idx) => {
                            const isActive = value === o.value;
                            return (
                                <Box
                                    key={`${o.value || "all"}-${idx}`}
                                    className={`pf-transaction__dropdown-item pf-agent-Service__dropdown-item ${isActive ? "active" : ""}`}
                                    onClick={() => {
                                        setValue(o.value);
                                        setOpenFilter(null);
                                    }}
                                    role="option"
                                    aria-selected={isActive}
                                >
                                    {o.label}
                                </Box>
                            );
                        })}
                    </Box>
                )}
            </Box>
        );
    };

    const amountColumnLabel = isRentedApplied ? "Rented for" : "Sold for";

    const resultsLoader = loading ? (
        <Box className="pf-transaction__loader" aria-live="polite" aria-busy="true">
            <Loader size={80} margin={0} />
        </Box>
    ) : null;

    return (
        <>
            <div className="pf-transaction">
                <div
                    className="pf-transaction__bg"
                    style={{ backgroundImage: `url(${transactionBanner})` }}
                    aria-hidden
                />
                <div className="pf-transaction__overlay" aria-hidden />

                <div className="pf-transaction__content">
                    <PFContainer>
                        <div className="pf-transaction__breadcrumb">
                            <BreadcrumbsComponentSecondLevel
                                breadcrumbTitle="Home"
                                breadcrumbSubTitle1="Area Insights"
                                breadcrumbSubTitle2="Historical Transactions"
                                breadcrumbLinkTitleTo="/"
                                breadcrumbLinkSubTitle1To="/areainsight"
                            />
                        </div>

                        <h1 className="pf-transaction__title">Transactions</h1>

                        <div className="pf-transaction__panel">
                            <div className="pf-transaction__filters-row">
                                <div
                                    className="pf-transaction__rent-sold"
                                    role="tablist"
                                    aria-label="Transaction type"
                                >
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={isRentedDraft}
                                        className={`pf-transaction__rent-sold-btn ${isRentedDraft ? "is-active" : ""}`}
                                        onClick={() => handleRentSoldTabChange("rented")}
                                    >
                                        Rented
                                    </button>
                                    <button
                                        type="button"
                                        role="tab"
                                        aria-selected={!isRentedDraft}
                                        className={`pf-transaction__rent-sold-btn ${!isRentedDraft ? "is-active" : ""}`}
                                        onClick={() => handleRentSoldTabChange("sold")}
                                    >
                                        Sold
                                    </button>
                                </div>

                                <div className="pf-transaction__search">
                                    <SearchIcon className="pf-transaction__search-icon" />
                                    <input
                                        type="search"
                                        className="pf-transaction__search-input"
                                        placeholder="Enter Location or company name"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        aria-label="Search location or company"
                                    />
                                </div>

                                <div className="pf-transaction__filters-inline" ref={filtersRef}>
                                    {renderDropdown(
                                        "property",
                                        propertyOptions,
                                        propertyValue,
                                        setPropertyValue,
                                        propertyLabel
                                    )}
                                    {renderDropdown("bed", BED_OPTIONS, bedValue, setBedValue, bedLabel)}
                                    {renderDropdown(
                                        "price",
                                        priceOptions,
                                        priceValue,
                                        setPriceValue,
                                        priceLabel
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className="pf-transaction__more-filters"
                                    onClick={handleApplyFilters}
                                    disabled={loading}
                                >
                                    Apply
                                </button>
                            </div>

                            <div
                                className="pf-transaction__time-row"
                                role="group"
                                aria-label="Time range"
                            >
                                {TIME_RANGES.map((label) => {
                                    const isActive = timeRange === label;
                                    return (
                                        <button
                                            key={label}
                                            type="button"
                                            className={`pf-transaction__time-pill ${isActive ? "is-active" : ""}`}
                                            onClick={() => setTimeRange(label)}
                                            aria-pressed={isActive}
                                        >
                                            {label}
                                        </button>
                                    );
                                })}
                            </div>

                            <div
                                className={`pf-transaction__cards ${loading ? "pf-transaction__cards--loading" : ""}`}
                            >
                                {isRentedApplied ? (
                                    <>
                                        <div className="pf-transaction__stat-card">
                                            <div className="pf-transaction__stat-value">
                                                <span className="pf-transaction__stat-currency">د.إ</span>
                                                <span className="pf-transaction__stat-number">
                                                    {summary?.newRentals?.avgDealAmountFormatted ?? "—"}
                                                </span>
                                            </div>
                                            <p className="pf-transaction__stat-label">Avg. Rent/year</p>
                                            <span className="pf-transaction__stat-badge">New rentals</span>
                                        </div>

                                        <div className="pf-transaction__stat-card">
                                            <div className="pf-transaction__stat-value pf-transaction__stat-value--plain">
                                                <span className="pf-transaction__stat-number">
                                                    {summary?.transactionCountFormatted ?? "0"}
                                                </span>
                                            </div>
                                            <p className="pf-transaction__stat-label">Transactions</p>
                                            {changeLabel && (
                                                <span
                                                    className={`pf-transaction__stat-badge ${(changePercent ?? 0) >= 0 ? "pf-transaction__stat-badge--up" : ""}`}
                                                >
                                                    {changeLabel}
                                                </span>
                                            )}
                                        </div>

                                        <div className="pf-transaction__stat-card">
                                            <div className="pf-transaction__stat-value">
                                                <span className="pf-transaction__stat-currency">د.إ</span>
                                                <span className="pf-transaction__stat-number">
                                                    {summary?.renewedRent?.avgDealAmountFormatted ?? "—"}
                                                </span>
                                            </div>
                                            <p className="pf-transaction__stat-label">Avg. Rent/year</p>
                                            <span className="pf-transaction__stat-badge">Renewed rent</span>
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="pf-transaction__stat-card">
                                            <div className="pf-transaction__stat-value">
                                                <span className="pf-transaction__stat-currency">د.إ</span>
                                                <span className="pf-transaction__stat-number">
                                                    {summary?.avgDealAmountFormatted ?? "—"}
                                                </span>
                                            </div>
                                            <p className="pf-transaction__stat-label">Avg. Sale price</p>
                                        </div>

                                        <div className="pf-transaction__stat-card">
                                            <div className="pf-transaction__stat-value pf-transaction__stat-value--plain">
                                                <span className="pf-transaction__stat-number">
                                                    {summary?.transactionCountFormatted ?? "0"}
                                                </span>
                                            </div>
                                            <p className="pf-transaction__stat-label">Transactions</p>
                                            {changeLabel && (
                                                <span
                                                    className={`pf-transaction__stat-badge ${(changePercent ?? 0) >= 0 ? "pf-transaction__stat-badge--up" : ""}`}
                                                >
                                                    {changeLabel}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </PFContainer>
                </div>
            </div>

            <section className="pf-transaction-history" aria-label="Transaction history">
                <h2 className="pf-transaction-history__title">Transaction history</h2>
                <PFContainer>
                    <div className="pf-transaction-history__card pf-transaction-history__card--relative">
                        {resultsLoader}
                        <div className="pf-transaction-history__sort-row" ref={sortRef}>
                            <span className="pf-transaction-history__sort-label">Sort Transactions by:</span>
                            <div className="pf-transaction-history__sort">
                                <button
                                    type="button"
                                    className="pf-transaction-history__sort-btn"
                                    onClick={() => setOpenSort((o) => !o)}
                                    aria-expanded={openSort}
                                    aria-haspopup="listbox"
                                >
                                    <span>{sortBy}</span>
                                    <DownArrowIcon
                                        width={12}
                                        height={12}
                                        fill="#333"
                                        className={openSort ? "is-open" : ""}
                                    />
                                </button>
                                {openSort && (
                                    <ul className="pf-transaction-history__sort-menu" role="listbox">
                                        {SORT_OPTIONS.map((opt) => (
                                            <li
                                                key={opt}
                                                role="option"
                                                aria-selected={sortBy === opt}
                                                className={sortBy === opt ? "is-active" : ""}
                                                onClick={() => {
                                                    setSortBy(opt);
                                                    setTxPage(1);
                                                    setOpenSort(false);
                                                }}
                                            >
                                                {opt}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>

                        <div className="pf-transaction-history__table-wrap">
                            <div
                                className="pf-transaction-history__table"
                                role="table"
                                aria-label="Transaction history table"
                            >
                                <div
                                    className="pf-transaction-history__grid-row pf-transaction-history__grid-row--head"
                                    role="row"
                                >
                                    <div role="columnheader">Location</div>
                                    <div role="columnheader">
                                        {amountColumnLabel}{" "}
                                        <span className="pf-transaction-history__table-sub-text">(AED)</span>
                                    </div>
                                    <div role="columnheader">
                                        {amountColumnLabel}{" "}
                                        <span className="pf-transaction-history__table-sub-text">
                                            (AED per sqft)
                                        </span>
                                    </div>
                                    <div role="columnheader">Date</div>
                                    <div role="columnheader">Contract status</div>
                                    <div role="columnheader">Property type</div>
                                    <div role="columnheader">Bedrooms</div>
                                    <div role="columnheader">
                                        Size{" "}
                                        <span className="pf-transaction-history__table-sub-text">(sqft)</span>
                                    </div>
                                </div>

                                {!loading && error && (
                                    <div className="pf-transaction-history__grid-row" role="row">
                                        <div role="cell" style={{ gridColumn: "1 / -1", padding: "24px" }}>
                                            {error}
                                        </div>
                                    </div>
                                )}

                                {!loading && !error && transactions.length === 0 && (
                                    <div className="pf-transaction-history__grid-row" role="row">
                                        <div role="cell" style={{ gridColumn: "1 / -1", padding: "24px" }}>
                                            No transactions found for the selected filters.
                                        </div>
                                    </div>
                                )}

                                {!loading &&
                                    !error &&
                                    transactions.map((row) => {
                                        const statusKey = contractStatusClass(row.contractStatus);
                                        return (
                                            <div
                                                key={row.id}
                                                className="pf-transaction-history__grid-row"
                                                role="row"
                                            >
                                                <div role="cell">
                                                    <div className="pf-transaction-history__location">
                                                        <span className="pf-transaction-history__location-name">
                                                            {row.locationName}
                                                        </span>
                                                        <span className="pf-transaction-history__location-sub">
                                                            <LocationIcon width={11} height={14} />
                                                            {row.locationSub}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div role="cell">
                                                    {row.amountFormatted || formatAed(row.amount)}
                                                </div>
                                                <div role="cell">
                                                    {row.amountPerSqftFormatted ??
                                                        (row.amountPerSqft != null
                                                            ? formatAed(row.amountPerSqft)
                                                            : "—")}
                                                </div>
                                                <div role="cell">{row.dateLabel}</div>
                                                <div role="cell">
                                                    <span
                                                        className={`pf-transaction-history__status pf-transaction-history__status--${statusKey}`}
                                                    >
                                                        {contractStatusLabel(row.contractStatus)}
                                                    </span>
                                                </div>
                                                <div role="cell">{row.propertyType}</div>
                                                <div role="cell">{row.bedroomsLabel}</div>
                                                <div role="cell">
                                                    {row.sizeSqftFormatted || formatAed(row.sizeSqft)}
                                                </div>
                                            </div>
                                        );
                                    })}
                            </div>
                        </div>

                        <div className="pf-transaction-history__pagination">
                            <PFPagination
                                currentPage={txPage}
                                totalPages={txTotalPages}
                                onPageChange={setTxPage}
                                className="pf-transaction-history__pagination-bar"
                            />
                        </div>
                    </div>
                </PFContainer>
            </section>
        </>
    );
};

export default Transaction;
