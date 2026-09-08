/**
 * @fileoverview Rent vs buy calculator — public API handler.
 *
 * ## Purpose
 * Compare **cumulative cash outflows** for renting vs buying over a user-chosen
 * horizon (`comparisonYears`, default 25). The UI uses this for:
 * - Bar / line charts (`yearlyComparison`: cumulative series + per-year monthly hints)
 * - “Payment breakdown” style panels (`paymentBreakdown.monthly`: first-month P&I split + owner costs)
 * - Optional “net cost after sale” (`totals.netBuyCostAfterSale`, `saleAssumptions`)
 *
 * ## What this is NOT
 * - Not NPV / discounting future cash flows to today (everything is nominal AED totals).
 * - Not opportunity cost of investing the down payment elsewhere.
 * - Not exact bank quotes: fees and rates are **models** aligned with `mortgageController`
 *   upfront-cost assumptions, not a specific lender’s product sheet.
 *
 * ## Rent side (cumulative)
 * - Starting monthly rent: `monthlyRent` OR `annualRent / 12`.
 * - Each calendar year, rent steps once: year `y` uses
 *     monthlyRent * (1 + rentIncreaseAnnualPct/100)^(y-1)
 *   (same percentage as `advanced.annualRentGrowthRate` if the top-level field is omitted.)
 * - Optional flat `annualRenterInsurance` → added monthly to the rent side.
 *
 * ## Buy side — initial (one-time at t=0)
 * - `effectiveDownPayment` (clamped to UAE minimum via `getMinDownPaymentPct`, same as mortgage calc).
 * - If `advanced.includePurchaseFees !== false`: add **purchase fees excluding down payment**
 *   (`computePurchaseFeesExDownPayment`) — same line items as `POST /mortgages/upfront-costs`.
 * - `cumulativeBuyOperating` starts at: down payment + those fees.
 *
 * ## Buy side — recurring (each month within horizon)
 * - **Mortgage P&I**: level payment from `calculateAmortization` in `mortgageAmortization.js`.
 *   - **Single-rate mode**: one `interestRate` for the full `loanPeriod`.
 *   - **Two-phase mode** (`advanced.fixedMortgagePeriod` + `fixedInterestRate` + `reversionRate`):
 *     Months `1..fixedMonths`: PMT₁ amortises the **full** loan at fixed rate over **full** term.
 *     After `fixedMonths`: remaining balance is repriced; PMT₂ amortises that balance over
 *     **remaining** months at `reversionRate`. (Common simplified “fixed then revert” model.)
 * - After `loanPeriod` months, mortgage payment is treated as 0 (loan assumed paid off);
 *   horizon can still run longer for rent vs continuing owner opex only.
 * - **Maintenance**: `(homeValueAtStartOfYear * maintenancePct/100) / 12` where home value grows
 *   annually by `homeAppreciationPctPerYear` / `annualHomePriceGrowthRate` (can be negative).
 * - **Insurance / service / mortgage protection**: annual amounts ÷ 12, flat in our model.
 *
 * ## End of horizon — sale (optional interpretation for “net buy cost”)
 * - `grossSalePrice = purchasePrice * (1 + appreciation)^horizonYears`
 * - `netSaleBeforeLoan = grossSalePrice * (1 - sellingCostPct/100)` (commission + selling costs model)
 * - `loanBalanceEnd`: remaining principal after `min(horizonMonths, loanTermMonths)` payments
 *   (single-rate closed form, or two-phase month-by-month simulation).
 * - `cashFromSaleAfterLoan = netSaleBeforeLoan - loanBalanceEnd`
 * - `netBuyCostAfterSale = cumulativeBuyOperating - cashFromSaleAfterLoan`
 *   (cash spent on buying, minus estimated cash back if you sell at the assumed price).
 *
 * ## Response map (high level)
 * - `totals.cumulativeRent` / `totals.cumulativeBuy`: nominal totals over horizon (buy includes upfront).
 * - `yearlyComparison[]`: end-of-year snapshots for charts; includes monthly rent/mortgage hints for tooltips.
 * - `purchaseFees`: mirrors upfront-costs breakdown when enabled.
 * - `paymentBreakdown.monthly`: **first** scheduled month P&I split; maintenance uses **year 1** value.
 * - `paymentBreakdown.overHorizon`: **Payment Breakdown** modal shape (initial / recurring / net sale /
 *   net costs, break-even year). Rent-side upfront fees default to 0 unless
 *   `advanced.rentAgentFeeAed` / `advanced.rentGovernmentFeeAed` are set (PF shows non-zero examples).
 * - Lighter route: `POST /mortgages/rent-vs-buy/payment-breakdown` — same body; returns
 *   `input`, `paymentBreakdown`, `saleAssumptions`, `purchaseFees` only (shared `runRentVsBuyCalculation`).
 *
 * @see ../utils/mortgageAmortization.js
 * @see ./mortgageController.js (calculateMortgage, calculateUpfrontCosts)
 */

const asyncHandler = require('express-async-handler');

const { success, failure } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');
const {
  calculateAmortization,
  getMinDownPaymentPct,
} = require('../../utils/mortgageAmortization');

// ─── UAE purchase fees (same assumptions as /mortgages/upfront-costs) ───
// Down payment is NOT included here; it is added separately as `effectiveDownPayment`.

const computePurchaseFeesExDownPayment = (purchasePrice, loanAmount) => {
  const landDepartmentFee = purchasePrice * 0.04;
  const registrationTrusteeFee = purchasePrice <= 500000 ? 2100 : 4200;
  const mortgageRegistrationFee = loanAmount * 0.0025 + 290;
  const realEstateAgencyFee = purchasePrice * 0.02;
  const mortgageArrangementFee = loanAmount * 0.01;
  const adminFee = 3150;

  return {
    landDepartmentFee,
    registrationTrusteeFee,
    mortgageRegistrationFee,
    realEstateAgencyFee,
    mortgageArrangementFee,
    adminFee,
    totalPurchaseCosts:
      landDepartmentFee +
      registrationTrusteeFee +
      mortgageRegistrationFee +
      realEstateAgencyFee +
      mortgageArrangementFee +
      adminFee,
  };
};

/**
 * Closed-form remaining balance after `elapsedMonths` level payments at `annualRatePct`,
 * assuming the payment was computed to fully amortise over `totalMonths` at that same rate.
 * Used to jump from end-of-fixed-period balance to phase-2 PMT without simulating month-by-month.
 */
const remainingLoanBalance = (principal, annualRatePct, totalMonths, elapsedMonths) => {
  const p = Math.min(Math.max(0, elapsedMonths), totalMonths);
  if (p >= totalMonths) return 0;
  const r = annualRatePct / 100 / 12;
  const n = totalMonths;
  if (r === 0) {
    return principal - (principal / n) * p;
  }
  const powN = (1 + r) ** n;
  const powP = (1 + r) ** p;
  return principal * (powN - powP) / (powN - 1);
};

/**
 * Split first month’s payment into principal vs interest (for tooltips / “Other” style UI).
 * interest = openingBalance * monthlyRate; principal = PMT - interest.
 */
const firstMonthPIBreakdown = (loanAmount, annualRatePct, loanPeriodYears, monthlyPayment) => {
  const principal = Number(loanAmount);
  const monthlyRate = annualRatePct / 100 / 12;
  const interestPortion = principal * monthlyRate;
  const principalPortion = monthlyPayment - interestPortion;
  return {
    principalPortion,
    interestPortion,
    totalPI: monthlyPayment,
  };
};

/**
 * Remaining balance after `n` payments on a **two-phase** mortgage (simulation).
 * Phase 1: months [0, fixedMonths) — rate r1, constant payment pmt1.
 * Phase 2: months [fixedMonths, totalMonths) — rate r2, constant payment pmt2.
 * Each month: interest = balance * (rate/12); principal = payment - interest; balance -= principal.
 * Used for `loanBalanceEnd` when the loan uses fixed-then-revert rates (no single closed form across both rates).
 */
const balanceAfterNPaymentsTwoPhase = (L, totalMonths, fixedMonths, r1, r2, pmt1, pmt2, n) => {
  let bal = L;
  const r1m = r1 / 100 / 12;
  const r2m = r2 / 100 / 12;
  const cap = Math.min(Math.max(0, n), totalMonths);
  for (let i = 0; i < cap; i += 1) {
    if (bal <= 0) break;
    if (i < fixedMonths) {
      const interest = bal * r1m;
      bal -= pmt1 - interest;
    } else {
      const interest = bal * r2m;
      bal -= pmt2 - interest;
    }
  }
  return Math.max(0, bal);
};

/**
 * Rent vs buy calculator — see @fileoverview above for full methodology.
 *
 * @swagger
 * /rent-vs-buy/calculate:
 *   post:
 *     summary: Rent vs buy comparison over a fixed horizon
 *     description: >
 *       Compares cumulative cost of renting versus buying using the same amortization model as
 *       `/mortgages/calculate`, optional UAE purchase fees (as upfront costs), recurring owner costs,
 *       and optional net buy cost after sale (appreciation and selling costs). Returns monthly mortgage
 *       payment, 25-year (configurable) cumulative totals, yearly series for charts, and a monthly
 *       payment breakdown suitable for a modal (P&I split plus maintenance, insurance, service charges).
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purchasePrice
 *               - residencyStatus
 *               - loanPeriod
 *             properties:
 *               purchasePrice:
 *                 type: number
 *                 minimum: 330000
 *                 description: Property purchase price in AED
 *               residencyStatus:
 *                 type: string
 *                 enum: [uae-national, uae-resident, non-resident]
 *                 description: Used for minimum down payment when downPayment is omitted or low
 *               downPayment:
 *                 type: number
 *                 description: Down payment in AED; clamped to UAE minimum rules when below minimum
 *               loanPeriod:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 25
 *                 description: Mortgage term in years (alias mortgageLoanPeriod)
 *               mortgageLoanPeriod:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 25
 *                 description: Same as loanPeriod when provided
 *               interestRate:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *                 description: >
 *                   Annual nominal interest rate in percent. Required unless advanced.fixedMortgagePeriod,
 *                   advanced.fixedInterestRate and advanced.reversionRate are all set (two-phase mortgage).
 *               monthlyRent:
 *                 type: number
 *                 minimum: 1
 *                 description: Starting monthly rent in AED (omit if annualRent is sent)
 *               annualRent:
 *                 type: number
 *                 minimum: 1
 *                 description: Annual rent in AED; monthly rent = annualRent / 12 when monthlyRent is omitted
 *               comparisonYears:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 40
 *                 default: 25
 *                 description: Horizon for totals and yearly series (e.g. 25)
 *               rentIncreaseAnnualPct:
 *                 type: number
 *                 minimum: -20
 *                 maximum: 20
 *                 default: 3
 *                 description: Annual rent increase % (alias advanced.annualRentGrowthRate)
 *               advanced:
 *                 type: object
 *                 description: Optional sliders / advanced options (maintenance, insurance, fees, sale assumptions)
 *                 properties:
 *                   fixedMortgagePeriod:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 25
 *                     description: Years at fixed interest rate before reverting (with fixedInterestRate + reversionRate)
 *                   fixedInterestRate:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 10
 *                     description: Annual % during fixed period
 *                   reversionRate:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 10
 *                     description: Annual % after fixed period ends (loan repriced on remaining balance)
 *                   annualRentGrowthRate:
 *                     type: number
 *                     minimum: -20
 *                     maximum: 20
 *                     description: Same as rentIncreaseAnnualPct when top-level field omitted
 *                   annualHomePriceGrowthRate:
 *                     type: number
 *                     minimum: -20
 *                     maximum: 20
 *                     description: Same as homeAppreciationPctPerYear when that field omitted
 *                   maintenancePctOfPricePerYear:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 10
 *                     default: 1
 *                     description: Annual maintenance as % of current home value (steps yearly with appreciation)
 *                   annualHomeInsurance:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                   annualServiceCharges:
 *                     type: number
 *                     minimum: 0
 *                     description: e.g. building / service charges (AED per year)
 *                     default: 0
 *                   annualRenterInsurance:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                     description: Added to rent side (AED per year), flat over the horizon
 *                   includePurchaseFees:
 *                     type: boolean
 *                     default: true
 *                     description: Add UAE fee stack (DLD, trustee, mortgage reg, agency, bank, admin) at purchase
 *                   homeAppreciationPctPerYear:
 *                     type: number
 *                     minimum: -20
 *                     maximum: 20
 *                     default: 3
 *                     description: Used for maintenance base and end-of-horizon sale price
 *                   sellingCostPctOfSale:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 10
 *                     default: 2
 *                     description: Commission and selling costs as % of gross sale price
 *                   mortgageProtectionMonthly:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                     description: Optional monthly mortgage protection / life insurance premium (AED)
 *                   rentAgentFeeAed:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                     description: One-time rent-side agent fees (AED); included in paymentBreakdown.overHorizon.initial.rent
 *                   rentGovernmentFeeAed:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                     description: One-time rent-side government fees (AED); included in paymentBreakdown.overHorizon.initial.rent
 *     responses:
 *       200:
 *         description: Comparison calculated successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
const rentVsBuyFail = (status, message, code = 'VALIDATION_ERROR') => ({
  ok: false,
  status,
  message,
  code,
});

/**
 * Shared core for `POST /mortgages/rent-vs-buy` and `POST /mortgages/rent-vs-buy/payment-breakdown`.
 * @returns {{ ok: true, result: object } | { ok: false, status: number, message: string, code: string }}
 */
function runRentVsBuyCalculation(reqBody) {
  try {
    // ─── 1) Parse body: support UI aliases (annualRent, mortgageLoanPeriod, growth rates in advanced) ───
    const {
      purchasePrice,
      residencyStatus,
      downPayment,
      loanPeriod,
      mortgageLoanPeriod,
      interestRate,
      monthlyRent,
      annualRent,
      comparisonYears,
      rentIncreaseAnnualPct,
      advanced = {},
    } = reqBody || {};

    const purchasePriceNum = Number(purchasePrice);
    const loanPeriodNum = Number(loanPeriod ?? mortgageLoanPeriod);

    const fixedMortgagePeriodYears =
      advanced.fixedMortgagePeriod != null ? Number(advanced.fixedMortgagePeriod) : null;
    const fixedInterestRateNum =
      advanced.fixedInterestRate != null ? Number(advanced.fixedInterestRate) : null;
    const reversionRateNum = advanced.reversionRate != null ? Number(advanced.reversionRate) : null;

    // Two-phase: all three advanced fields present → fixed-rate window then reversion rate (no top-level interestRate required).
    const useTwoPhase =
      fixedMortgagePeriodYears != null &&
      fixedMortgagePeriodYears > 0 &&
      fixedInterestRateNum != null &&
      !Number.isNaN(fixedInterestRateNum) &&
      reversionRateNum != null &&
      !Number.isNaN(reversionRateNum);

    let interestRateNum = interestRate != null && interestRate !== '' ? Number(interestRate) : NaN;
    if (useTwoPhase) {
      interestRateNum = fixedInterestRateNum;
    }

    let monthlyRentNum = monthlyRent != null && monthlyRent !== '' ? Number(monthlyRent) : NaN;
    if ((Number.isNaN(monthlyRentNum) || monthlyRentNum <= 0) && annualRent != null && annualRent !== '') {
      monthlyRentNum = Number(annualRent) / 12;
    }

    const horizonYears = comparisonYears != null ? Number(comparisonYears) : 25;
    let rentIncreasePct = 3;
    if (rentIncreaseAnnualPct != null && rentIncreaseAnnualPct !== '') {
      rentIncreasePct = Number(rentIncreaseAnnualPct);
    } else if (advanced.annualRentGrowthRate != null && advanced.annualRentGrowthRate !== '') {
      rentIncreasePct = Number(advanced.annualRentGrowthRate);
    }

    const maintenancePct =
      advanced.maintenancePctOfPricePerYear != null
        ? Number(advanced.maintenancePctOfPricePerYear)
        : 1;
    const annualHomeInsurance =
      advanced.annualHomeInsurance != null ? Number(advanced.annualHomeInsurance) : 0;
    const annualServiceCharges =
      advanced.annualServiceCharges != null ? Number(advanced.annualServiceCharges) : 0;
    const annualRenterInsurance =
      advanced.annualRenterInsurance != null ? Number(advanced.annualRenterInsurance) : 0;
    const includePurchaseFees = advanced.includePurchaseFees !== false;
    let appreciationPct = 3;
    if (advanced.homeAppreciationPctPerYear != null && advanced.homeAppreciationPctPerYear !== '') {
      appreciationPct = Number(advanced.homeAppreciationPctPerYear);
    } else if (
      advanced.annualHomePriceGrowthRate != null &&
      advanced.annualHomePriceGrowthRate !== ''
    ) {
      appreciationPct = Number(advanced.annualHomePriceGrowthRate);
    }
    const sellingCostPct =
      advanced.sellingCostPctOfSale != null ? Number(advanced.sellingCostPctOfSale) : 2;
    const mortgageProtectionMonthly =
      advanced.mortgageProtectionMonthly != null
        ? Number(advanced.mortgageProtectionMonthly)
        : 0;
    const rentAgentFeeAed =
      advanced.rentAgentFeeAed != null ? Number(advanced.rentAgentFeeAed) : 0;
    const rentGovernmentFeeAed =
      advanced.rentGovernmentFeeAed != null ? Number(advanced.rentGovernmentFeeAed) : 0;

    // ─── 2) Validate numeric ranges (keep in sync with Swagger and mortgage calculator) ───

    if (!purchasePriceNum || purchasePriceNum < 330000) {
      return rentVsBuyFail(400, 'purchasePrice must be at least 330000');
    }

    const allowedResidency = ['uae-national', 'uae-resident', 'non-resident'];
    if (!residencyStatus || !allowedResidency.includes(residencyStatus)) {
      return rentVsBuyFail(400, 'Invalid residencyStatus');
    }

    if (!loanPeriodNum || loanPeriodNum < 1 || loanPeriodNum > 25) {
      return rentVsBuyFail(400, 'loanPeriod must be between 1 and 25 years');
    }

    if (useTwoPhase) {
      if (fixedMortgagePeriodYears < 1 || fixedMortgagePeriodYears > loanPeriodNum) {
        return rentVsBuyFail(400, 'advanced.fixedMortgagePeriod must be between 1 and loanPeriod');
      }
      if (!fixedInterestRateNum || fixedInterestRateNum < 1 || fixedInterestRateNum > 10) {
        return rentVsBuyFail(400, 'advanced.fixedInterestRate must be between 1 and 10 percent');
      }
      if (!reversionRateNum || reversionRateNum < 1 || reversionRateNum > 10) {
        return rentVsBuyFail(400, 'advanced.reversionRate must be between 1 and 10 percent');
      }
    } else {
      const ir = interestRate != null && interestRate !== '' ? Number(interestRate) : NaN;
      if (!ir || ir < 1 || ir > 10) {
        return rentVsBuyFail(
          400,
          'interestRate must be between 1 and 10 percent (or send advanced fixed period + rates)',
        );
      }
      interestRateNum = ir;
    }

    if (!monthlyRentNum || monthlyRentNum <= 0 || Number.isNaN(monthlyRentNum)) {
      return rentVsBuyFail(400, 'Provide monthlyRent or annualRent (annualRent/12 = monthly)');
    }

    if (!horizonYears || horizonYears < 1 || horizonYears > 40) {
      return rentVsBuyFail(400, 'comparisonYears must be between 1 and 40');
    }

    if (rentIncreasePct < -20 || rentIncreasePct > 20) {
      return rentVsBuyFail(
        400,
        'rent growth must be between -20 and 20 percent (rentIncreaseAnnualPct or advanced.annualRentGrowthRate)',
      );
    }

    if (maintenancePct < 0 || maintenancePct > 10) {
      return rentVsBuyFail(400, 'advanced.maintenancePctOfPricePerYear must be between 0 and 10');
    }

    if (appreciationPct < -20 || appreciationPct > 20) {
      return rentVsBuyFail(400, 'home price growth must be between -20 and 20 percent');
    }

    if (sellingCostPct < 0 || sellingCostPct > 10) {
      return rentVsBuyFail(400, 'advanced.sellingCostPctOfSale must be between 0 and 10');
    }

    if (rentAgentFeeAed < 0 || rentGovernmentFeeAed < 0) {
      return rentVsBuyFail(400, 'Rent upfront fee amounts must be >= 0');
    }

    // ─── 3) Down payment + loan amount (same clamp rules as POST /mortgages/calculate) ───

    const minDownPaymentPct = getMinDownPaymentPct(residencyStatus, purchasePriceNum);
    const minDownPayment = (minDownPaymentPct / 100) * purchasePriceNum;

    let effectiveDownPayment = Number(downPayment);
    if (!effectiveDownPayment || effectiveDownPayment <= 0) {
      effectiveDownPayment = minDownPayment;
    }
    if (effectiveDownPayment < minDownPayment) {
      effectiveDownPayment = minDownPayment;
    }
    if (effectiveDownPayment > purchasePriceNum) {
      effectiveDownPayment = purchasePriceNum;
    }

    const loanAmount = purchasePriceNum - effectiveDownPayment;
    if (loanAmount <= 0) {
      return rentVsBuyFail(400, 'loanAmount must be greater than 0');
    }

    const loanTermMonths = loanPeriodNum * 12;
    const horizonMonths = horizonYears * 12;

    // ─── 4) Mortgage payment(s): single rate OR fixed period + reversion ───
    // PMT₁ always amortises full principal over full loanPeriod at phase-1 rate.
    // PMT₂ amortises remaining balance after fixedMonths at reversion rate over remaining months.

    let amortization = calculateAmortization(loanAmount, interestRateNum, loanPeriodNum);
    let monthlyPI = amortization.monthlyPayment;
    let fixedMonths = 0;
    let monthlyPIPhase2 = monthlyPI;
    let rateForFirstMonthBreakdown = interestRateNum;

    if (useTwoPhase) {
      const r1 = fixedInterestRateNum;
      const r2 = reversionRateNum;
      fixedMonths = Math.min(Math.round(fixedMortgagePeriodYears * 12), loanTermMonths);
      amortization = calculateAmortization(loanAmount, r1, loanPeriodNum);
      monthlyPI = amortization.monthlyPayment;
      rateForFirstMonthBreakdown = r1;
      const balanceAfterFixed = remainingLoanBalance(loanAmount, r1, loanTermMonths, fixedMonths);
      const remMonths = loanTermMonths - fixedMonths;
      if (remMonths > 0 && balanceAfterFixed > 0) {
        const amort2 = calculateAmortization(balanceAfterFixed, r2, remMonths / 12);
        monthlyPIPhase2 = amort2.monthlyPayment;
      } else {
        monthlyPIPhase2 = 0;
      }
    }

    const feeBreakdown = computePurchaseFeesExDownPayment(purchasePriceNum, loanAmount);
    const purchaseFeesTotal = includePurchaseFees ? feeBreakdown.totalPurchaseCosts : 0;

    // ─── 5) Time loop: accumulate rent vs buy cash outflows month by month ───
    // Rent steps once per year; buy maintenance uses start-of-year home value (steps with appreciation).

    const upfrontBuy = effectiveDownPayment + purchaseFeesTotal;
    const rentIncrease = rentIncreasePct / 100;
    const appreciation = appreciationPct / 100;
    const renterInsuranceMonthly = annualRenterInsurance / 12;

    let cumulativeRent = 0;
    let cumulativeBuyOperating = upfrontBuy;
    const yearlySeries = [];

    const insuranceMonthly = annualHomeInsurance / 12;
    const serviceMonthly = annualServiceCharges / 12;

    // For payment-breakdown modal (principal / interest split over horizon; rent ex-insurance)
    let loanBalRun = loanAmount;
    let sumPrincipalPaid = 0;
    let sumInterestPaid = 0;
    let sumRentPaymentsOnly = 0;
    let sumMaintenancePaid = 0;

    for (let m = 1; m <= horizonMonths; m += 1) {
      const yearIndex = Math.ceil(m / 12); // 1-based calendar year within horizon
      const rentThisMonth = monthlyRentNum * (1 + rentIncrease) ** (yearIndex - 1);
      sumRentPaymentsOnly += rentThisMonth;
      cumulativeRent += rentThisMonth + renterInsuranceMonthly;

      const calendarYear = yearIndex;
      const homeValueStartOfYear = purchasePriceNum * (1 + appreciation) ** (calendarYear - 1);
      const maintenanceMonthly = (homeValueStartOfYear * (maintenancePct / 100)) / 12;
      sumMaintenancePaid += maintenanceMonthly;

      const piThisMonth =
        m <= loanTermMonths
          ? useTwoPhase
            ? m <= fixedMonths
              ? monthlyPI
              : monthlyPIPhase2
            : monthlyPI
          : 0;

      if (piThisMonth > 0 && loanBalRun > 0) {
        const rateAnnual = useTwoPhase
          ? m <= fixedMonths
            ? fixedInterestRateNum
            : reversionRateNum
          : interestRateNum;
        const rm = rateAnnual / 100 / 12;
        const interestPortion = loanBalRun * rm;
        const principalPortion = piThisMonth - interestPortion;
        loanBalRun -= principalPortion;
        sumPrincipalPaid += principalPortion;
        sumInterestPaid += interestPortion;
      }

      cumulativeBuyOperating +=
        piThisMonth + maintenanceMonthly + insuranceMonthly + serviceMonthly + mortgageProtectionMonthly;

      if (m % 12 === 0) {
        const rentMonthlyBase = rentThisMonth;
        const rentMonthlyTotal = rentMonthlyBase + renterInsuranceMonthly;
        const mortgagePaymentMonthly = piThisMonth;
        const buyMonthlyTotal =
          mortgagePaymentMonthly +
          maintenanceMonthly +
          insuranceMonthly +
          serviceMonthly +
          mortgageProtectionMonthly;

        yearlySeries.push({
          year: yearIndex,
          cumulativeRent: Math.round(cumulativeRent),
          cumulativeBuy: Math.round(cumulativeBuyOperating),
          rentMonthlyBase: Math.round(rentMonthlyBase),
          rentMonthlyTotal: Math.round(rentMonthlyTotal),
          mortgagePaymentMonthly: Math.round(mortgagePaymentMonthly),
          buyMonthlyTotal: Math.round(buyMonthlyTotal),
          buyMonthlyBreakdown: {
            maintenance: Math.round(maintenanceMonthly),
            homeInsurance: Math.round(insuranceMonthly),
            serviceCharges: Math.round(serviceMonthly),
            mortgageProtection: Math.round(mortgageProtectionMonthly),
          },
        });
      }
    }

    // ─── 6) Sale scenario at end of horizon (for net buy cost — see @fileoverview) ───

    const grossSalePrice = purchasePriceNum * (1 + appreciation) ** horizonYears;
    const netSaleBeforeLoan = grossSalePrice * (1 - sellingCostPct / 100);
    const monthsWithLoan = Math.min(horizonMonths, loanTermMonths);
    const loanBalanceEnd = useTwoPhase
      ? balanceAfterNPaymentsTwoPhase(
          loanAmount,
          loanTermMonths,
          fixedMonths,
          fixedInterestRateNum,
          reversionRateNum,
          monthlyPI,
          monthlyPIPhase2,
          monthsWithLoan,
        )
      : remainingLoanBalance(loanAmount, interestRateNum, loanTermMonths, monthsWithLoan);
    const cashFromSale = netSaleBeforeLoan - loanBalanceEnd;
    const netBuyCostAfterSale = cumulativeBuyOperating - cashFromSale;

    // ─── 7) Modal-style “monthly” breakdown: month 1 P&I + year-1 owner opex (documented in response.note) ───

    const firstPI = firstMonthPIBreakdown(
      loanAmount,
      rateForFirstMonthBreakdown,
      loanPeriodNum,
      monthlyPI,
    );
    const homeValueYear1 = purchasePriceNum;
    const maintenanceMonthlyYear1 = (homeValueYear1 * (maintenancePct / 100)) / 12;

    const paymentBreakdownMonthly = {
      rentPayment: Math.round(monthlyRentNum + renterInsuranceMonthly),
      mortgagePrincipal: Math.round(firstPI.principalPortion),
      mortgageInterest: Math.round(firstPI.interestPortion),
      mortgageTotalPI: Math.round(firstPI.totalPI),
      maintenance: Math.round(maintenanceMonthlyYear1),
      homeInsurance: Math.round(insuranceMonthly),
      serviceCharges: Math.round(serviceMonthly),
      mortgageProtection: Math.round(mortgageProtectionMonthly),
      ownerOccupierTotal: Math.round(
        firstPI.totalPI +
          maintenanceMonthlyYear1 +
          insuranceMonthly +
          serviceMonthly +
          mortgageProtectionMonthly,
      ),
    };

    // ─── 8) Response: echo normalised inputs + series for charts + fee breakdown ───
    // twoPhase: totalInterest/totalPI over full loan are omitted (would need full dual-rate schedule).

    const mortgageBlock = {
      monthlyPayment: Math.round(monthlyPI),
      twoPhase: useTwoPhase,
    };
    if (useTwoPhase) {
      mortgageBlock.fixedMortgagePeriodYears = fixedMortgagePeriodYears;
      mortgageBlock.monthlyPaymentAfterReversion = Math.round(monthlyPIPhase2);
      mortgageBlock.fixedInterestRate = fixedInterestRateNum;
      mortgageBlock.reversionRate = reversionRateNum;
      mortgageBlock.totalInterestOverLoan = null;
      mortgageBlock.totalPIOverLoan = null;
      mortgageBlock.interestPct = null;
      mortgageBlock.principalPct = null;
    } else {
      mortgageBlock.totalInterestOverLoan = Math.round(amortization.totalInterest);
      mortgageBlock.totalPIOverLoan = Math.round(amortization.totalPayment);
      mortgageBlock.interestPct = Number(amortization.interestPct.toFixed(2));
      mortgageBlock.principalPct = Number(amortization.principalPct.toFixed(2));
    }

    // ─── Payment Breakdown modal (Molumulk–style totals over `comparisonYears`) ───
    // Amounts are positive AED outflows unless noted; clients may display as negative.
    const rentInitialTotal = rentAgentFeeAed + rentGovernmentFeeAed;
    const renterInsuranceTotal = renterInsuranceMonthly * horizonMonths;
    const homeInsuranceOverHorizon = annualHomeInsurance * horizonYears;
    const mortgageProtectionOverHorizon = mortgageProtectionMonthly * horizonMonths;
    const insurancesTotalBuy = homeInsuranceOverHorizon + mortgageProtectionOverHorizon;
    const communityServiceOverHorizon = annualServiceCharges * horizonYears;
    const sellingFeesAmount = grossSalePrice * (sellingCostPct / 100);

    const buyGovernmentFees = includePurchaseFees
      ? feeBreakdown.landDepartmentFee + feeBreakdown.registrationTrusteeFee
      : 0;
    const buyBankFees = includePurchaseFees
      ? feeBreakdown.mortgageRegistrationFee +
        feeBreakdown.mortgageArrangementFee +
        feeBreakdown.adminFee
      : 0;
    const buyAgentFees = includePurchaseFees ? feeBreakdown.realEstateAgencyFee : 0;
    const initialBuyTotal =
      effectiveDownPayment + (includePurchaseFees ? feeBreakdown.totalPurchaseCosts : 0);
    const recurringRentTotal = sumRentPaymentsOnly + renterInsuranceTotal;
    const recurringBuyTotal =
      sumPrincipalPaid +
      sumInterestPaid +
      insurancesTotalBuy +
      communityServiceOverHorizon +
      sumMaintenancePaid;
    const netCostRentTotal = rentInitialTotal + cumulativeRent;
    // First year-end where cumulative buy (incl. buy upfront) is less than cumulative rent (incl. rent upfront)
    let breakEvenYear = null;
    for (let i = 0; i < yearlySeries.length; i += 1) {
      const cumRentWithInitial = rentInitialTotal + yearlySeries[i].cumulativeRent;
      if (yearlySeries[i].cumulativeBuy < cumRentWithInitial) {
        breakEvenYear = yearlySeries[i].year;
        break;
      }
    }

    const paymentBreakdownOverHorizon = {
      horizonYears,
      currency: 'AED',
      initial: {
        rent: {
          agentFees: Math.round(rentAgentFeeAed),
          governmentFees: Math.round(rentGovernmentFeeAed),
          total: Math.round(rentInitialTotal),
        },
        buy: {
          downPayment: Math.round(effectiveDownPayment),
          agentFees: Math.round(buyAgentFees),
          bankFees: Math.round(buyBankFees),
          governmentFees: Math.round(buyGovernmentFees),
          total: Math.round(initialBuyTotal),
        },
      },
      recurring: {
        rent: {
          rentPayments: Math.round(sumRentPaymentsOnly),
          renterInsurance: Math.round(renterInsuranceTotal),
          total: Math.round(recurringRentTotal),
        },
        buy: {
          principal: Math.round(sumPrincipalPaid),
          interest: Math.round(sumInterestPaid),
          homeInsurance: Math.round(homeInsuranceOverHorizon),
          mortgageProtection: Math.round(mortgageProtectionOverHorizon),
          insurancesTotal: Math.round(insurancesTotalBuy),
          communityServiceCosts: Math.round(communityServiceOverHorizon),
          maintenanceCosts: Math.round(sumMaintenancePaid),
          total: Math.round(recurringBuyTotal),
        },
      },
      netSale: {
        buyOnly: {
          estimatedSellingPrice: Math.round(grossSalePrice),
          sellingFees: Math.round(sellingFeesAmount),
          netSalePriceBeforeLoanPayoff: Math.round(netSaleBeforeLoan),
          estimatedLoanBalanceEnd: Math.round(loanBalanceEnd),
          cashFromSaleAfterLoan: Math.round(cashFromSale),
        },
      },
      summary: {
        netCostRent: Math.round(netCostRentTotal),
        netCostBuyAfterSale: Math.round(netBuyCostAfterSale),
        breakEvenYear,
        breakEvenNote:
          'First year (1..horizon) where cumulative buy outflows fall below cumulative rent outflows, both including upfront fees. Null if buying never becomes cheaper on this basis.',
      },
    };

    const result = {
      input: {
        purchasePrice: purchasePriceNum,
        residencyStatus,
        downPayment: Math.round(effectiveDownPayment),
        loanPeriod: loanPeriodNum,
        interestRate: useTwoPhase ? null : interestRateNum,
        loanAmount: Math.round(loanAmount),
        monthlyRent: Math.round(monthlyRentNum * 100) / 100,
        annualRent:
          annualRent != null && annualRent !== ''
            ? Number(annualRent)
            : Math.round(monthlyRentNum * 12),
        comparisonYears: horizonYears,
        rentIncreaseAnnualPct: rentIncreasePct,
        advanced: {
          ...(useTwoPhase
            ? {
                fixedMortgagePeriod: fixedMortgagePeriodYears,
                fixedInterestRate: fixedInterestRateNum,
                reversionRate: reversionRateNum,
              }
            : {}),
          maintenancePctOfPricePerYear: maintenancePct,
          annualHomeInsurance,
          annualServiceCharges,
          annualRenterInsurance,
          includePurchaseFees,
          homeAppreciationPctPerYear: appreciationPct,
          annualHomePriceGrowthRate:
            advanced.annualHomePriceGrowthRate != null
              ? Number(advanced.annualHomePriceGrowthRate)
              : undefined,
          annualRentGrowthRate:
            advanced.annualRentGrowthRate != null
              ? Number(advanced.annualRentGrowthRate)
              : undefined,
          sellingCostPctOfSale: sellingCostPct,
          mortgageProtectionMonthly,
          rentAgentFeeAed,
          rentGovernmentFeeAed,
        },
      },
      mortgage: mortgageBlock,
      totals: {
        cumulativeRent: Math.round(cumulativeRent),
        cumulativeBuy: Math.round(cumulativeBuyOperating),
        netBuyCostAfterSale: Math.round(netBuyCostAfterSale),
        differenceRentMinusBuy: Math.round(cumulativeRent - cumulativeBuyOperating),
        differenceRentMinusNetBuy: Math.round(cumulativeRent - netBuyCostAfterSale),
      },
      saleAssumptions: {
        grossSalePriceEnd: Math.round(grossSalePrice),
        netSaleBeforeLoanPayoff: Math.round(netSaleBeforeLoan),
        estimatedLoanBalanceEnd: Math.round(loanBalanceEnd),
        cashFromSaleAfterLoan: Math.round(cashFromSale),
      },
      purchaseFees: includePurchaseFees
        ? {
            total: Math.round(feeBreakdown.totalPurchaseCosts),
            landDepartmentFee: Math.round(feeBreakdown.landDepartmentFee),
            registrationTrusteeFee: Math.round(feeBreakdown.registrationTrusteeFee),
            mortgageRegistrationFee: Math.round(feeBreakdown.mortgageRegistrationFee),
            realEstateAgencyFee: Math.round(feeBreakdown.realEstateAgencyFee),
            mortgageArrangementFee: Math.round(feeBreakdown.mortgageArrangementFee),
            adminFee: Math.round(feeBreakdown.adminFee),
          }
        : null,
      yearlyComparison: yearlySeries,
      paymentBreakdown: {
        monthly: paymentBreakdownMonthly,
        overHorizon: paymentBreakdownOverHorizon,
        note:
          'monthly: first scheduled mortgage month + year-1 owner costs. overHorizon: full modal-style totals; rent upfront fees default to 0 unless advanced.rentAgentFeeAed / rentGovernmentFeeAed are set.',
      },
      sliderConfig: {
        purchasePrice: { min: 330000, max: 200000000 },
        downPayment: { min: Math.round(minDownPayment), max: purchasePriceNum },
        loanPeriod: { min: 1, max: 25 },
        interestRate: { min: 1, max: 10 },
        monthlyRent: { min: 500, max: 500000 },
        comparisonYears: { min: 1, max: 40 },
        rentIncreaseAnnualPct: { min: -20, max: 20 },
      },
    };

    return { ok: true, result };
  } catch (error) {
    logger.error('Rent vs buy calculation error', {
      error: error.message,
      stack: error.stack,
      body: reqBody,
    });
    return rentVsBuyFail(500, 'Failed to calculate rent vs buy', 'SERVER_ERROR');
  }
}

const calculateRentVsBuy = asyncHandler(async (req, res) => {
  const outcome = runRentVsBuyCalculation(req.body);
  if (!outcome.ok) {
    return failure(res, outcome.status, outcome.message, outcome.code);
  }
  return success(res, 'Rent vs buy calculation successful', outcome.result, 200);
});

/**
 * @swagger
 * /rent-vs-buy/payment-breakdown:
 *   post:
 *     summary: Rent vs buy — payment breakdown only (lighter payload)
 *     description: >
 *       **Use this endpoint** when the app only needs the payment-breakdown modal (initial / recurring /
 *       net sale / summary), not charts or yearly series.
 *
 *
 *       **Request body is identical** to `POST /mortgages/rent-vs-buy` — same validation and defaults.
 *
 *
 *       **Minimum you must send:** `purchasePrice`, `residencyStatus`, and `loanPeriod` (or
 *       `mortgageLoanPeriod`). You must also send **either** `monthlyRent` **or** `annualRent` (if both
 *       are missing or invalid, the API returns 400).
 *
 *
 *       **Interest rate:** send top-level `interestRate` (annual %, 1–10) **unless** you use a two-phase
 *       loan: set all of `advanced.fixedMortgagePeriod`, `advanced.fixedInterestRate`, and
 *       `advanced.reversionRate` — then `interestRate` is not required.
 *
 *
 *       **Horizon:** `comparisonYears` (1–40, default 25) drives how far totals and `overHorizon` run.
 *
 *
 *       **Response envelope:** standard success shape `{ status, message, data }`. `data` contains
 *       `input` (normalised echo), `paymentBreakdown` (`monthly` + `overHorizon` + `note`),
 *       `saleAssumptions` (gross/net sale, loan balance, cash after loan), and `purchaseFees` (fee
 *       lines or null if `advanced.includePurchaseFees` is false).
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purchasePrice
 *               - residencyStatus
 *               - loanPeriod
 *             description: >
 *               Same fields as POST /mortgages/rent-vs-buy. `loanPeriod` may be replaced by
 *               `mortgageLoanPeriod`. Rent must be supplied via `monthlyRent` and/or `annualRent`.
 *             properties:
 *               purchasePrice:
 *                 type: number
 *                 minimum: 330000
 *                 example: 1200000
 *                 description: Property purchase price (AED)
 *               residencyStatus:
 *                 type: string
 *                 enum: [uae-national, uae-resident, non-resident]
 *                 description: Minimum down payment rules when `downPayment` is omitted or low
 *               downPayment:
 *                 type: number
 *                 description: Down payment (AED); clamped to UAE minimum if below minimum
 *               loanPeriod:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 25
 *                 example: 25
 *                 description: Mortgage term in years
 *               mortgageLoanPeriod:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 25
 *                 description: Alias for `loanPeriod`
 *               interestRate:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 10
 *                 example: 4.5
 *                 description: >
 *                   Annual nominal interest rate (%). Omit only when using two-phase `advanced` fields
 *                   (fixed period + fixed rate + reversion rate).
 *               monthlyRent:
 *                 type: number
 *                 minimum: 1
 *                 example: 11667
 *                 description: Starting monthly rent (AED). Omit if `annualRent` is sent.
 *               annualRent:
 *                 type: number
 *                 minimum: 1
 *                 example: 140000
 *                 description: Annual rent (AED); monthly rent = annualRent / 12 if `monthlyRent` omitted
 *               comparisonYears:
 *                 type: number
 *                 minimum: 1
 *                 maximum: 40
 *                 default: 25
 *                 example: 25
 *                 description: Comparison horizon in years (totals and overHorizon use this)
 *               rentIncreaseAnnualPct:
 *                 type: number
 *                 minimum: -20
 *                 maximum: 20
 *                 default: 3
 *                 description: Annual rent step (%). Alias/overridden by `advanced.annualRentGrowthRate`
 *               advanced:
 *                 type: object
 *                 description: Optional — maintenance, insurance, UAE purchase fees, sale assumptions, two-phase mortgage, rent upfront fees
 *                 properties:
 *                   fixedMortgagePeriod:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 25
 *                     description: Years at fixed rate before reversion (use with fixedInterestRate + reversionRate)
 *                   fixedInterestRate:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 10
 *                     description: Annual % during fixed period
 *                   reversionRate:
 *                     type: number
 *                     minimum: 1
 *                     maximum: 10
 *                     description: Annual % after fixed period on remaining balance
 *                   annualRentGrowthRate:
 *                     type: number
 *                     minimum: -20
 *                     maximum: 20
 *                     description: Same as `rentIncreaseAnnualPct` when top-level field omitted
 *                   annualHomePriceGrowthRate:
 *                     type: number
 *                     minimum: -20
 *                     maximum: 20
 *                     description: Same as `homeAppreciationPctPerYear` when that field omitted
 *                   maintenancePctOfPricePerYear:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 10
 *                     default: 1
 *                     description: Maintenance as % of home value per year (value steps yearly with appreciation)
 *                   annualHomeInsurance:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                     description: Owner home insurance (AED/year), flat monthly share
 *                   annualServiceCharges:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                     description: Community / service charges (AED/year)
 *                   annualRenterInsurance:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                     description: Renter insurance (AED/year), added to rent side monthly
 *                   includePurchaseFees:
 *                     type: boolean
 *                     default: true
 *                     description: If true, UAE purchase fee stack is added to buy upfront (mirrors upfront-costs model)
 *                   homeAppreciationPctPerYear:
 *                     type: number
 *                     minimum: -20
 *                     maximum: 20
 *                     default: 3
 *                     description: Annual home price growth % (maintenance base + end sale price)
 *                   sellingCostPctOfSale:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 10
 *                     default: 2
 *                     description: Selling costs + commission as % of gross sale price
 *                   mortgageProtectionMonthly:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                     description: Mortgage protection premium (AED/month)
 *                   rentAgentFeeAed:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                     description: One-time rent agent fees (AED) — maps to overHorizon.initial.rent.agentFees
 *                   rentGovernmentFeeAed:
 *                     type: number
 *                     minimum: 0
 *                     default: 0
 *                     description: One-time rent government fees (AED) — maps to overHorizon.initial.rent.governmentFees
 *     responses:
 *       200:
 *         description: Success — see `data.paymentBreakdown.overHorizon` for modal rows
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Rent vs buy payment breakdown calculated successfully
 *                 data:
 *                   type: object
 *                   description: Slim payload for payment-breakdown UI
 *                   properties:
 *                     input:
 *                       type: object
 *                       description: Normalised inputs echoed back (purchasePrice, loanAmount, comparisonYears, advanced, etc.)
 *                     paymentBreakdown:
 *                       type: object
 *                       properties:
 *                         monthly:
 *                           type: object
 *                           description: First scheduled month — P&I split + year-1 owner costs (see note)
 *                         overHorizon:
 *                           type: object
 *                           description: >
 *                             Full horizon totals — initial (rent/buy), recurring (rent/buy), netSale.buyOnly,
 *                             summary (netCostRent, netCostBuyAfterSale, breakEvenYear, breakEvenNote)
 *                         note:
 *                           type: string
 *                     saleAssumptions:
 *                       type: object
 *                       description: Gross/net sale price, loan balance at horizon, cash after paying loan
 *                     purchaseFees:
 *                       type: object
 *                       nullable: true
 *                       description: UAE purchase fee line items when includePurchaseFees is true; otherwise null
 *       400:
 *         description: Validation error (missing rent, invalid rates, etc.)
 *       500:
 *         description: Server error
 */
const calculateRentVsBuyPaymentBreakdown = asyncHandler(async (req, res) => {
  const outcome = runRentVsBuyCalculation(req.body);
  if (!outcome.ok) {
    return failure(res, outcome.status, outcome.message, outcome.code);
  }
  const { result } = outcome;
  return success(res, 'Rent vs buy payment breakdown calculated successfully', {
    input: result.input,
    paymentBreakdown: result.paymentBreakdown,
    saleAssumptions: result.saleAssumptions,
    purchaseFees: result.purchaseFees,
  });
});

module.exports = {
  calculateRentVsBuy,
  calculateRentVsBuyPaymentBreakdown,
};
