import { useMemo, useState, useEffect, useRef } from "react";
import "../../../assets/styles/components/MoreFilterModal.scss";
import { Button, Typography, Box } from "@mui/material";
import { DownArrowIconBlack, ModalCloseIcon } from "../../../Components/parts/icon";
import type { AmenityMaster, NamedValueMaster } from "../../../services/apiService";


interface MoreFilterModalProps {
    open: boolean;
    onClose: () => void;
    amenitiesOptions?: AmenityMaster[];
    sqftAreaSizeOptions?: NamedValueMaster[];
    completionStatusOptions?: NamedValueMaster[];
    deliveryDateOptions?: NamedValueMaster[];
    resultsCount?: number;
    onApply?: (filters: {
        postHandover: boolean;
        dldRegistered: boolean;
        completionStatus: string;
        deliveryDate: string;
        minArea: string;
        maxArea: string;
        /** Amenity ids */
        amenities: string[];
    }) => void;
    onClear?: () => void;
    initialFilters?: {
        postHandover: boolean;
        dldRegistered: boolean;
        completionStatus: string;
        deliveryDate: string;
        minArea: string;
        maxArea: string;
        /** Amenity ids */
        amenities: string[];
    };
}

function MoreFilterModal({
    open,
    onClose,
    amenitiesOptions,
    sqftAreaSizeOptions,
    completionStatusOptions,
    deliveryDateOptions,
    resultsCount,
    onApply,
    onClear,
    initialFilters,
}: MoreFilterModalProps) {
    const [postHandover, setPostHandover] = useState(false);
    const [dldRegistered, setDldRegistered] = useState(false);

    const [completionStatus, setCompletionStatus] = useState<string>("all");
    const [deliveryDate, setDeliveryDate] = useState<string>("all");

    const [minAreaOpen, setMinAreaOpen] = useState(false);
    const [minArea, setMinArea] = useState("MinArea");
    const [maxAreaOpen, setMaxAreaOpen] = useState(false);
    const [maxArea, setMaxArea] = useState("MaxArea");

    const minAreaRef = useRef<HTMLDivElement | null>(null);
    const maxAreaRef = useRef<HTMLDivElement | null>(null);

    const handleMaxAreaToggle = () => {
        setMaxAreaOpen((prev) => !prev);
        setMinAreaOpen(false);
    };
    const handleMaxAreaSelect = (value: string) => {
        setMaxArea(value);
        setMaxAreaOpen(false);
    };

    const handleMinAreaToggle = () => {
        setMinAreaOpen((prev) => !prev);
        setMaxAreaOpen(false);
    };
    const handleMinAreaSelect = (value: string) => {
        setMinArea(value);
        setMinAreaOpen(false);
    };

    const areaOptions = useMemo(() => {
        const raw = sqftAreaSizeOptions ?? [];
        return (Array.isArray(raw) ? raw : [])
            .filter((o) => o?.name && o?.value)
            .map((o) => ({ label: String(o.name), value: String(o.value) }));
    }, [sqftAreaSizeOptions]);

    const amenities = useMemo(() => {
        const raw = amenitiesOptions ?? [];
        return (Array.isArray(raw) ? raw : [])
            .map((a) => ({
                id: String((a as any)?._id ?? (a as any)?.id ?? "").trim(),
                label: String((a as any)?.name ?? "").trim(),
            }))
            .filter((a) => a.id && a.label);
    }, [amenitiesOptions]);

    const completionChips = useMemo(() => {
        const raw = completionStatusOptions ?? [];
        const options = (Array.isArray(raw) ? raw : [])
            .filter((o) => o?.name && o?.value)
            .map((o) => ({ label: String(o.name), value: String(o.value) }));
        return [...options];
    }, [completionStatusOptions]);

    const deliveryChips = useMemo(() => {
        const raw = deliveryDateOptions ?? [];
        const options = (Array.isArray(raw) ? raw : [])
            .filter((o) => o?.name && o?.value)
            .map((o) => ({ label: String(o.name), value: String(o.value) }));
        return [...options];
    }, [deliveryDateOptions]);

    const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

    // Sync modal internal state with applied filters when opened
    useEffect(() => {
        if (!open) return;
        if (!initialFilters) return;
        setPostHandover(Boolean(initialFilters.postHandover));
        setDldRegistered(Boolean(initialFilters.dldRegistered));
        setCompletionStatus(initialFilters.completionStatus || "all");
        setDeliveryDate(initialFilters.deliveryDate || "all");
        setMinArea(initialFilters.minArea || "MinArea");
        setMaxArea(initialFilters.maxArea || "MaxArea");
        setSelectedAmenities(Array.isArray(initialFilters.amenities) ? initialFilters.amenities : []);
        setMinAreaOpen(false);
        setMaxAreaOpen(false);
    }, [open, initialFilters]);

    const toggleAmenity = (id: string) => {
        setSelectedAmenities((prev) =>
            prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
        );
    };

    // Close area dropdowns when clicking outside
    useEffect(() => {
        if (!open) {
            return;
        }

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;

            const isInsideMin =
                minAreaRef.current && minAreaRef.current.contains(target);
            const isInsideMax =
                maxAreaRef.current && maxAreaRef.current.contains(target);

            if (!isInsideMin && !isInsideMax) {
                setMinAreaOpen(false);
                setMaxAreaOpen(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [open]);

    return (
        open && (
            <div className="morefilter-modal-overlay" onClick={() => { onClose(); }}>
                <div className="morefilter-modal" onClick={(e) => e.stopPropagation()}>
                    <div className="morefilter-modal-header">
                        <div className="morefilter-modal-close-icon" onClick={onClose}>
                            <ModalCloseIcon width="16" height="16" />
                        </div>
                    </div>
                    <div className="morefilter-modal-content">
                        <Typography component="h2" className="morefilter-modal-title">
                            More filters
                        </Typography>

                        {/* Top toggles */}
                        <div className="morefilter-section--toggles">
                            <div
                                className={`morefilter-toggle ${postHandover ? "morefilter-toggle--active" : ""}`}
                                onClick={() => setPostHandover((prev) => !prev)}
                            >
                                <div className="morefilter-toggle-switch" />
                                <span className="morefilter-toggle-label">
                                    Projects with post-handover payments
                                </span>
                            </div>

                            <div
                                className={`morefilter-toggle ${dldRegistered ? "morefilter-toggle--active" : ""}`}
                                onClick={() => setDldRegistered((prev) => !prev)}
                            >
                                <div className="morefilter-toggle-switch" />
                                <span className="morefilter-toggle-label">DLD Registered Projects</span>
                            </div>
                        </div>

                        {/* Completion Status */}
                        <div className="morefilter-section">
                            <Typography className="morefilter-section-title">
                                Completion Status
                            </Typography>
                            <div className="morefilter-chips-row">
                                {completionChips.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        className={`morefilter-chip ${completionStatus === c.value ? "morefilter-chip--active" : ""}`}
                                        onClick={() => setCompletionStatus(c.value)}
                                    >
                                        {c.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Delivery date */}
                        <div className="morefilter-section">
                            <Typography className="morefilter-section-title">
                                Delivery date
                            </Typography>
                            <div className="morefilter-chips-row">
                                {deliveryChips.slice(0, 6).map((d) => (
                                    <button
                                        key={d.value}
                                        type="button"
                                        className={`morefilter-chip ${deliveryDate === d.value ? "morefilter-chip--active" : ""}`}
                                        onClick={() => setDeliveryDate(d.value)}
                                    >
                                        {d.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Property Area Range */}
                        <div className="morefilter-section">
                            <Typography className="morefilter-section-title">
                                Property Area Range
                            </Typography>
                            <div className="morefilter-area-row">
                                <Box
                                    className="pf-agent-Service__custom-select"
                                    style={{ position: "relative" }}
                                    ref={minAreaRef}
                                >
                                    {/* Button */}
                                    <Box
                                        className="pf-agent-Service__select-btn"
                                        onClick={handleMinAreaToggle}
                                    >
                                        <Typography className="pf-agent-Service__name">
                                            {minArea}
                                        </Typography>
                                        <DownArrowIconBlack width={13} height={13} />
                                    </Box>

                                    {/* Dropdown */}
                                    {minAreaOpen && (
                                        <Box className="pf-agent-Service__dropdown">
                                            {areaOptions.map((item) => {
                                                const isActive =
                                                    minArea === item.label ||
                                                    minArea === item.value;
                                                return (
                                                    <Box
                                                        key={item.label}
                                                        className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""
                                                            }`}
                                                        onClick={() => handleMinAreaSelect(item.value)}
                                                    >
                                                        {item.label}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    )}
                                </Box>
                                <span className="morefilter-area-separator">to</span>
                                <Box
                                    className="pf-agent-Service__custom-select"
                                    style={{ position: "relative" }}
                                    ref={maxAreaRef}
                                >
                                    {/* Button */}
                                    <Box
                                        className="pf-agent-Service__select-btn"
                                        onClick={handleMaxAreaToggle}
                                    >
                                        <Typography className="pf-agent-Service__name">
                                            {maxArea}
                                        </Typography>
                                        <DownArrowIconBlack width={13} height={13} />
                                    </Box>

                                    {/* Dropdown */}
                                    {maxAreaOpen && (
                                        <Box className="pf-agent-Service__dropdown">
                                            {areaOptions.map((item) => {
                                                const isActive =
                                                    maxArea === item.label ||
                                                    maxArea === item.value;
                                                return (
                                                    <Box
                                                        key={item.label}
                                                        className={`pf-agent-Service__dropdown-item ${isActive ? "active" : ""
                                                            }`}
                                                        onClick={() => handleMaxAreaSelect(item.value)}
                                                    >
                                                        {item.label}
                                                    </Box>
                                                );
                                            })}
                                        </Box>
                                    )}
                                </Box>
                            </div>
                        </div>

                        {/* Amenities */}
                        <div className="morefilter-amenities-section">
                            <Typography className="morefilter-section-title">
                                Amenities
                            </Typography>
                            <div className="morefilter-amenities-grid">
                                {amenities.map((a) => (
                                    <button
                                        type="button"
                                        key={a.id}
                                        className={`morefilter-chip--amenity ${selectedAmenities.includes(a.id) ? "morefilter-chipamenity--active" : ""
                                            }`}
                                        onClick={() => toggleAmenity(a.id)}
                                    >
                                        {a.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                    </div>
                    {/* Footer buttons (fixed at bottom of modal) */}
                    <div className="morefilter-footer">
                        <Button
                            variant="contained"
                            className="morefilter-result-btn"
                            onClick={() => {
                                onApply?.({
                                    postHandover,
                                    dldRegistered,
                                    completionStatus,
                                    deliveryDate,
                                    minArea,
                                    maxArea,
                                    amenities: selectedAmenities,
                                });
                                onClose();
                            }}
                        >
                            Show {typeof resultsCount === "number" ? resultsCount : 0} Results
                        </Button>
                        <button
                            type="button"
                            className="morefilter-clear-btn"
                            onClick={() => {
                                setPostHandover(false);
                                setDldRegistered(false);
                                setCompletionStatus("all");
                                setDeliveryDate("all");
                                setMinArea("MinArea");
                                setMaxArea("MaxArea");
                                setSelectedAmenities([]);
                                onClear?.();
                            }}
                        >
                            Clear
                        </button>
                    </div>
                </div>
            </div>
        )

    );
}

export default MoreFilterModal;
