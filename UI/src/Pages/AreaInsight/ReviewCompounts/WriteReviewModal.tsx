import { useState, useEffect, useCallback } from "react";
import { Button, Typography, Rating, Checkbox, FormControlLabel } from "@mui/material";
import "../../../assets/styles/AreaInsight/Review/WriteReviewModal.scss";
import { ModalCloseIcon } from "../../../Components/parts/icon";

const RATING_CATEGORIES = [
    { id: "maintenance", label: "Maintenance" },
    { id: "staff", label: "Staff / Security" },
    { id: "gym", label: "Gym / pool" },
    { id: "children", label: "Children friendly" },
    { id: "noise", label: "Noise in and around property" },
    { id: "traffic", label: "Traffic near property" },
    { id: "parking", label: "Guest parking" },
] as const;

type CategoryId = (typeof RATING_CATEGORIES)[number]["id"];

const defaultRatings = (): Record<CategoryId, number> => ({
    maintenance: 2,
    staff: 2,
    gym: 2,
    children: 2,
    noise: 2,
    traffic: 2,
    parking: 2,
});

export interface WriteReviewModalProps {
    open: boolean;
    onClose: () => void;
    /** Pre-fills “Review for” (e.g. building name) */
    buildingName?: string;
    onSubmit?: (payload: {
        ratings: Record<CategoryId, number>;
        firstName: string;
        email: string;
        reviewFor: string;
        title: string;
        body: string;
        agreedToTerms: boolean;
    }) => void;
}

function WriteReviewModal({
    open,
    onClose,
    buildingName = "Tiara Residences",
    onSubmit,
}: WriteReviewModalProps) {
    const [ratings, setRatings] = useState<Record<CategoryId, number>>(defaultRatings);
    const [firstName, setFirstName] = useState("");
    const [email, setEmail] = useState("");
    const [reviewFor, setReviewFor] = useState(buildingName);
    const [reviewTitle, setReviewTitle] = useState("");
    const [reviewBody, setReviewBody] = useState("");
    const [agreedToTerms, setAgreedToTerms] = useState(false);

    useEffect(() => {
        if (!open) return;
        setRatings(defaultRatings());
        setFirstName("");
        setEmail("");
        setReviewFor(buildingName);
        setReviewTitle("");
        setReviewBody("");
        setAgreedToTerms(false);
    }, [open, buildingName]);

    useEffect(() => {
        if (!open) return;
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = prev;
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, onClose]);

    const handleRatingChange = useCallback((id: CategoryId, value: number | null) => {
        setRatings((r) => ({ ...r, [id]: value ?? 0 }));
    }, []);

    const handleSubmit = () => {
        onSubmit?.({
            ratings,
            firstName,
            email,
            reviewFor,
            title: reviewTitle,
            body: reviewBody,
            agreedToTerms,
        });
        onClose();
    };

    if (!open) return null;

    return (
        <div
            className="write-review-modal-overlay"
            role="presentation"
            onClick={onClose}
        >
            <div
                className="write-review-modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="write-review-modal-title"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="write-review-modal-header">
                    <button
                        type="button"
                        className="write-review-modal-close-icon"
                        onClick={onClose}
                        aria-label="Close"
                    >
                        <ModalCloseIcon width={16} height={16} />
                    </button>
                </div>

                <div className="write-review-modal-content">
                    <Typography
                        id="write-review-modal-title"
                        component="h2"
                        className="write-review-modal-title"
                    >
                        Write a review
                    </Typography>

                    <div className="write-review-modal-panel">
                        <div className="write-review-modal-ratings-card">
                            <h3 className="write-review-modal-ratings-heading">
                                Rate the property
                            </h3>
                            <ul className="write-review-modal-ratings-list">
                                {RATING_CATEGORIES.map((cat) => (
                                    <li
                                        key={cat.id}
                                        className="write-review-modal-rating-row"
                                    >
                                        <span className="write-review-modal-rating-label">
                                            {cat.label}
                                        </span>
                                        <Rating
                                            name={cat.id}
                                            value={ratings[cat.id]}
                                            onChange={(_, v) => handleRatingChange(cat.id, v)}
                                            size="medium"
                                            sx={{
                                                "& .MuiRating-iconFilled": {
                                                    color: "#FFCB2B",
                                                },
                                                "& .MuiRating-iconEmpty": {
                                                    color: "rgba(0,0,0,0.16)",
                                                },
                                            }}
                                        />
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="write-review-modal-form-side">
                            <div className="write-review-modal-field-row">
                                <div className="write-review-modal-field">
                                    <label
                                        className="write-review-modal-label"
                                        htmlFor="write-review-first-name"
                                    >
                                        First name
                                    </label>
                                    <input
                                        id="write-review-first-name"
                                        type="text"
                                        className="write-review-modal-input"
                                        placeholder="Enter first name"
                                        value={firstName}
                                        onChange={(e) => setFirstName(e.target.value)}
                                        autoComplete="given-name"
                                    />
                                </div>
                                <div className="write-review-modal-field">
                                    <label
                                        className="write-review-modal-label"
                                        htmlFor="write-review-email"
                                    >
                                        Email Address (optional)
                                    </label>
                                    <input
                                        id="write-review-email"
                                        type="email"
                                        className="write-review-modal-input"
                                        placeholder="Enter email address"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        autoComplete="email"
                                    />
                                </div>
                            </div>

                            <div className="write-review-modal-field">
                                <label
                                    className="write-review-modal-label"
                                    htmlFor="write-review-for"
                                >
                                    Review for
                                </label>
                                <input
                                    id="write-review-for"
                                    type="text"
                                    className="write-review-modal-input"
                                    value={reviewFor}
                                    onChange={(e) => setReviewFor(e.target.value)}
                                />
                            </div>

                            <div className="write-review-modal-field write-review-modal-field--block">
                                <span className="write-review-modal-section-label">
                                    Write a review
                                </span>
                                <label
                                    className="write-review-modal-label write-review-modal-label--sr"
                                    htmlFor="write-review-title"
                                >
                                    Review title
                                </label>
                                <input
                                    id="write-review-title"
                                    type="text"
                                    className="write-review-modal-input"
                                    placeholder="Enter title"
                                    value={reviewTitle}
                                    onChange={(e) => setReviewTitle(e.target.value)}
                                />
                                <label
                                    className="write-review-modal-label write-review-modal-label--sr"
                                    htmlFor="write-review-body"
                                >
                                    Review text
                                </label>
                                <textarea
                                    id="write-review-body"
                                    className="write-review-modal-textarea"
                                    placeholder="Write your review here"
                                    rows={5}
                                    value={reviewBody}
                                    onChange={(e) => setReviewBody(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <p className="write-review-modal-cert">
                        I certify that this review is based on my own experience and is my
                        genuine opinion of this property.
                    </p>

                    <FormControlLabel
                        className="write-review-modal-terms"
                        control={
                            <Checkbox
                                checked={agreedToTerms}
                                onChange={(_, c) => setAgreedToTerms(c)}
                                size="small"
                                sx={{
                                    color: "rgba(0,0,0,0.35)",
                                    "&.Mui-checked": { color: "#ea3934" },
                                }}
                            />
                        }
                        label={
                            <span className="write-review-modal-terms-text">
                                I agree to Terms and Conditions of Molumulk.
                            </span>
                        }
                    />
                </div>

                <div className="write-review-modal-footer">
                    <Button
                        type="button"
                        variant="contained"
                        className="write-review-modal-result-btn"
                        onClick={handleSubmit}
                        disabled={!agreedToTerms}
                    >
                        Submit
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default WriteReviewModal;
