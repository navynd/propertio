import { Box, CircularProgress, Typography } from "@mui/material";
import type React from "react";
import { CommonModal } from "../../../Components/parts/Modal";
import type { MortgageUpfrontCostsResponseData } from "../../../services/apiService";

interface UpfrontCostModalProps {
  open: boolean;
  onClose: () => void;
  data: MortgageUpfrontCostsResponseData | null;
  loading?: boolean;
}

function formatAed(n: number): string {
  return `${Math.round(n).toLocaleString("en-US")} AED`;
}

function UpfrontCostModal({
  open,
  onClose,
  data,
  loading = false,
}: UpfrontCostModalProps) {
  const handleClose = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onClose();
  };

  const pb = data?.paymentBreakdown;
  const calc = data?.calculationsBasedOn;

  const feeRows: Array<{ label: string; value: number | undefined }> = pb
    ? [
        { label: "Land department fee", value: pb.landDepartmentFee },
        { label: "Registration trustee fee", value: pb.registrationTrusteeFee },
        {
          label: "Mortgage registration fee",
          value: pb.mortgageRegistrationFee,
        },
        { label: "Real estate agency fee", value: pb.realEstateAgencyFee },
        {
          label: "Mortgage arrangement fee",
          value: pb.mortgageArrangementFee,
        },
        { label: "Admin fee", value: pb.adminFee },
      ]
    : [];

  return (
    <CommonModal
      open={open}
      handleClose={handleClose}
      className="pf-modal common_modal upfront-cost-modal"
      closeButtonClassName="closeButtonClassName"
      boxclassName="upfrontmodal_boxes"
    >
      <Box className="pf-modal__content" onClick={(e) => e.stopPropagation()}>
        <Box className="pf-modal__body">
          <Typography
            component="h2"
            className="pf-modal__title upfront-cost-modal__title"
          >
            Estimated upfront costs
          </Typography>

          <Box className="frontmodal_box">
            <Box className="upfront-cost-modal__panel">
              <Typography className="upfront-cost-modal__heading">
                Payment breakdown
              </Typography>

              {loading && (
                <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
                  <CircularProgress size={32} />
                </Box>
              )}

              {!loading && (
                <>
                  <Box className="upfront-cost-modal__summary">
                    <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--label">
                      Down payment
                    </Typography>
                    <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--value">
                      {pb ? formatAed(pb.downPayment) : "—"}
                    </Typography>
                  </Box>

                  <Box className="upfront-cost-modal__table">
                    <Box className="upfront-cost-modal__row upfront-cost-modal__row--emphasize">
                      <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--label">
                        Total purchase costs
                      </Typography>
                      <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--value">
                        {pb ? formatAed(pb.totalPurchaseCosts) : "—"}
                      </Typography>
                    </Box>
                    <Box className="upfront-cost-modal__content">
                      {feeRows.map((row) => (
                        <Box
                          key={row.label}
                          className="upfront-cost-modal__row"
                        >
                          <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--label">
                            {row.label}
                          </Typography>
                          <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--value">
                            {typeof row.value === "number"
                              ? formatAed(row.value)
                              : "—"}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  </Box>

                  <Typography className="upfront-cost-modal__heading upfront-cost-modal__heading--secondary">
                    Calculations based on
                  </Typography>

                  <Box className="upfront-cost-modal__table upfront-cost-modal__table--calc">
                    <Box className="upfront-cost-modal__row">
                      <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--label">
                        Monthly payment
                      </Typography>
                      <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--value">
                        {calc
                          ? formatAed(calc.monthlyPayment)
                          : "—"}
                      </Typography>
                    </Box>
                    <Box className="upfront-cost-modal__row">
                      <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--label">
                        Interest rate
                      </Typography>
                      <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--value">
                        {calc != null ? `${calc.interestRate}%` : "—"}
                      </Typography>
                    </Box>
                    <Box className="upfront-cost-modal__row">
                      <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--label">
                        Loan amount
                      </Typography>
                      <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--value">
                        {calc ? formatAed(calc.loanAmount) : "—"}
                      </Typography>
                    </Box>
                    <Box className="upfront-cost-modal__row">
                      <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--label">
                        Loan duration
                      </Typography>
                      <Typography className="upfront-cost-modal__cell upfront-cost-modal__cell--value">
                        {calc?.loanDuration ?? "—"}
                      </Typography>
                    </Box>
                  </Box>
                </>
              )}
            </Box>
          </Box>

          <Box className="upfront-cost-modal__footer">
            <Typography className="upfront-cost-modal__footer-label">
              Total amount required upfront
            </Typography>
            <Typography className="upfront-cost-modal__footer-value">
              {!loading && data
                ? formatAed(data.totalAmountRequiredUpfront)
                : loading
                  ? "…"
                  : "—"}
            </Typography>
          </Box>
        </Box>
      </Box>
    </CommonModal>
  );
}

export default UpfrontCostModal;
