/**
 * Shared mortgage math for:
 * - `POST /mortgages/calculate` (mortgageController)
 * - `POST /mortgages/rent-vs-buy` (rentVsBuyController)
 *
 * ## Level-payment (annuity) mortgage
 * Monthly nominal rate: `r = annualRatePct / 100 / 12`
 * Number of payments: `n = loanPeriodYears * 12`
 *
 * Standard payment formula (when r > 0):
 *   PMT = P * [ r * (1 + r)^n ] / [ (1 + r)^n - 1 ]
 * where P = loan principal (AED).
 *
 * When r === 0: PMT = P / n (straight-line principal).
 *
 * Derived:
 *   totalPayment  = PMT * n
 *   totalInterest = totalPayment - P
 *   principalPct / interestPct = share of totalPayment (for donut charts).
 *
 * ## Minimum down payment (UAE-style rules)
 * Mirrors the same bands used in mortgageController: residency + whether
 * purchase price is above AED 5M. This is a simplified regulatory model for
 * the calculator UI, not bank-specific underwriting.
 */

/** @param {'uae-national'|'uae-resident'|'non-resident'} residencyStatus */
const getMinDownPaymentPct = (residencyStatus, purchasePrice) => {
  if (!purchasePrice || purchasePrice <= 0) return 0;

  const price = Number(purchasePrice);
  const isHighValue = price > 5000000;

  if (residencyStatus === 'uae-national') {
    return isHighValue ? 30 : 15;
  }

  if (residencyStatus === 'uae-resident') {
    return isHighValue ? 30 : 20;
  }

  // non-resident
  return 25;
};

/**
 * Full-term level payment at one annual rate (no fixed/revert split).
 * @param {number} loanAmount - Principal borrowed (AED)
 * @param {number} interestRate - Annual nominal % (e.g. 4.5)
 * @param {number} loanPeriodYears - Full amortisation term in years
 */
const calculateAmortization = (loanAmount, interestRate, loanPeriodYears) => {
  const principal = Number(loanAmount);
  const annualRatePct = Number(interestRate);
  const years = Number(loanPeriodYears);

  const monthlyRate = annualRatePct / 100 / 12;
  const numPayments = years * 12;

  if (!principal || !years || numPayments <= 0) {
    return {
      monthlyPayment: 0,
      totalInterest: 0,
      totalPayment: 0,
      interestPct: 0,
      principalPct: 0,
    };
  }

  let monthlyPayment;

  if (monthlyRate === 0) {
    monthlyPayment = principal / numPayments;
  } else {
    const factor = (1 + monthlyRate) ** numPayments;
    monthlyPayment = principal * ((monthlyRate * factor) / (factor - 1));
  }

  const totalPayment = monthlyPayment * numPayments;
  const totalInterest = totalPayment - principal;

  const interestPct = totalPayment > 0 ? (totalInterest / totalPayment) * 100 : 0;
  const principalPct = totalPayment > 0 ? (principal / totalPayment) * 100 : 0;

  return {
    monthlyPayment,
    totalInterest,
    totalPayment,
    interestPct,
    principalPct,
  };
};

module.exports = {
  calculateAmortization,
  getMinDownPaymentPct,
};
