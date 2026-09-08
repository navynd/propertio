const asyncHandler = require('express-async-handler');

const Properties = require('../../models/propertiesModal');
const MortgageQuote = require('../../models/mortgageQuoteModel');
const { sendEmail } = require('../../services/emailService');
const { success, failure, isEmail, formatPhoneNumber } = require('../../utils/helpers');
const { logger } = require('../../utils/logger');

const { MORTGAGE_TEAM_EMAIL } = process.env;

const { calculateAmortization, getMinDownPaymentPct } = require('../../utils/mortgageAmortization');

/**
 * Mortgage calculator used by web + mobile.
 * Applies UAE minimum down payment rules, normalises the payload,
 * runs amortization, and returns values for sliders + donut chart.
 * @swagger
 * /mortgages/calculate:
 *   post:
 *     summary: Calculate mortgage payments and affordability
 *     description: >
 *       Public mortgage calculator endpoint used by web and mobile clients.
 *       Computes loan amount, monthly payment, interest/principal breakdown, and
 *       counts active properties within the selected budget.
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
 *               - interestRate
 *             properties:
 *               purchasePrice:
 *                 type: number
 *                 minimum: 330000
 *                 description: Property purchase price in AED
 *                 example: 1500000
 *               residencyStatus:
 *                 type: string
 *                 enum: [uae-national, uae-resident, non-resident]
 *                 description: Residency category used for minimum down payment rules
 *                 example: uae-resident
 *               downPayment:
 *                 type: number
 *                 description: >
 *                   Absolute down payment amount in AED. Optional. If omitted or below the required
 *                   minimum, it will be automatically corrected to the minimum based on UAE Central Bank rules.
 *                 example: 300000
 *               loanPeriod:
 *                 type: number
 *                 description: Loan duration in years (1 - 25)
 *                 example: 25
 *               interestRate:
 *                 type: number
 *                 description: Annual interest rate in percent (1 - 10)
 *                 example: 4.5
 *     responses:
 *       200:
 *         description: Mortgage calculation successful
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
const calculateMortgage = asyncHandler(async (req, res) => {
  try {
    const { purchasePrice, residencyStatus, downPayment, loanPeriod, interestRate } = req.body || {};

    const purchasePriceNum = Number(purchasePrice);
    const loanPeriodNum = Number(loanPeriod);
    const interestRateNum = Number(interestRate);

    if (!purchasePriceNum || purchasePriceNum < 330000) {
      return failure(res, 400, 'purchasePrice must be at least 330000', 'VALIDATION_ERROR');
    }

    const allowedResidency = ['uae-national', 'uae-resident', 'non-resident'];
    if (!residencyStatus || !allowedResidency.includes(residencyStatus)) {
      return failure(res, 400, 'Invalid residencyStatus', 'VALIDATION_ERROR');
    }

    if (!loanPeriodNum || loanPeriodNum < 1 || loanPeriodNum > 25) {
      return failure(res, 400, 'loanPeriod must be between 1 and 25 years', 'VALIDATION_ERROR');
    }

    if (!interestRateNum || interestRateNum < 1 || interestRateNum > 10) {
      return failure(res, 400, 'interestRate must be between 1 and 10 percent', 'VALIDATION_ERROR');
    }

    // 1) Enforce minimum down payment based on residency and price
    const minDownPaymentPct = getMinDownPaymentPct(residencyStatus, purchasePriceNum);
    const minDownPayment = (minDownPaymentPct / 100) * purchasePriceNum;

    // If no downPayment or invalid → use minimum.
    // If below minimum or above purchase price → clamp into valid range.
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
      return failure(res, 400, 'loanAmount must be greater than 0', 'VALIDATION_ERROR');
    }

    // 2) Core mortgage math
    const amortization = calculateAmortization(loanAmount, interestRateNum, loanPeriodNum);

    const downPaymentPctRounded = Math.round((effectiveDownPayment / purchasePriceNum) * 100);
    const loanAmountPctRounded = 100 - downPaymentPctRounded;

    // 3) Count active properties that are within the selected budget
    const propertiesInBudget = await Properties.countDocuments({
      status: 'active',
      price: { $lte: purchasePriceNum },
    });

    // 4) Round monetary values once, at the edge of the API
    const roundedMonthlyPayment = Math.round(amortization.monthlyPayment);
    const roundedTotalInterest = Math.round(amortization.totalInterest);
    const roundedTotalPayment = Math.round(amortization.totalPayment);

    // 5) Shape response for frontend (input echo, derived breakdown, slider config)
    const result = {
      input: {
        purchasePrice: purchasePriceNum,
        residencyStatus,
        downPayment: Math.round(effectiveDownPayment),
        loanPeriod: loanPeriodNum,
        interestRate: interestRateNum,
      },
      calculated: {
        downPaymentPct: downPaymentPctRounded,
        loanAmount: Math.round(loanAmount),
        loanAmountPct: loanAmountPctRounded,
        minDownPayment: Math.round(minDownPayment),
        minDownPaymentPct,
      },
      output: {
        monthlyPayment: roundedMonthlyPayment,
        totalInterest: roundedTotalInterest,
        totalPayment: roundedTotalPayment,
        // Percentages are relative to totalPayment, so they
        // always add up to ~100% and can be used directly
        // in the principal vs interest donut chart.
        interestPct: Number(amortization.interestPct.toFixed(2)),
        principalPct: Number(amortization.principalPct.toFixed(2)),
        principal: Math.round(loanAmount),
        interest: roundedTotalInterest,
        propertiesInBudget,
      },
      sliderConfig: {
        purchasePrice: { min: 330000, max: 200000000 },
        downPayment: { min: Math.round(minDownPayment), max: purchasePriceNum },
        loanAmount: { min: 0, max: purchasePriceNum },
        loanPeriod: { min: 1, max: 25 },
        interestRate: { min: 1, max: 10 },
      },
    };

    return success(res, 'Mortgage calculation successful', result, 200);
  } catch (error) {
    logger.error('Mortgage calculation error', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    return failure(res, 500, 'Failed to calculate mortgage', 'SERVER_ERROR');
  }
});

/**
 * Upfront costs breakdown used by the "Estimated upfront costs" modal.
 * Recomputes mortgage payment from the payload, then applies UAE fee rules
 * (DLD, trustee, registration, agency, bank, admin) and returns a single total.
 * @swagger
 * /mortgages/upfront-costs:
 *   post:
 *     summary: Calculate estimated upfront purchase costs
 *     description: >
 *       Returns a breakdown of estimated upfront costs for a mortgage transaction
 *       in the UAE, including DLD fees, trustee fees, agency commission, and bank fees.
 *       This endpoint is used for the "Estimated upfront costs" modal.
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - purchasePrice
 *               - downPayment
 *               - loanAmount
 *               - loanPeriod
 *               - interestRate
 *             properties:
 *               purchasePrice:
 *                 type: number
 *                 description: Property purchase price in AED
 *                 example: 1500000
 *               downPayment:
 *                 type: number
 *                 description: Down payment amount in AED
 *                 example: 300000
 *               loanAmount:
 *                 type: number
 *                 description: Total loan amount in AED
 *                 example: 1200000
 *               loanPeriod:
 *                 type: number
 *                 description: Loan duration in years
 *                 example: 25
 *               interestRate:
 *                 type: number
 *                 description: Annual interest rate in percent
 *                 example: 4.5
 *               residencyStatus:
 *                 type: string
 *                 enum: [uae-national, uae-resident, non-resident]
 *                 description: Optional Residency category (returned in calculationsBasedOn)
 *                 example: uae-resident
 *     responses:
 *       200:
 *         description: Upfront costs calculated successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
const calculateUpfrontCosts = asyncHandler(async (req, res) => {
  try {
    const {
      purchasePrice,
      downPayment,
      loanAmount,
      loanPeriod,
      interestRate,
      residencyStatus,
    } = req.body || {};

    const purchasePriceNum = Number(purchasePrice);
    const downPaymentNum = Number(downPayment);
    const loanAmountNum = Number(loanAmount);
    const loanPeriodNum = Number(loanPeriod);
    const interestRateNum = Number(interestRate);

    if (!purchasePriceNum || purchasePriceNum <= 0) {
      return failure(res, 400, 'purchasePrice is required', 'VALIDATION_ERROR');
    }
    if (!downPaymentNum || downPaymentNum <= 0) {
      return failure(res, 400, 'downPayment is required', 'VALIDATION_ERROR');
    }
    if (!loanAmountNum || loanAmountNum <= 0) {
      return failure(res, 400, 'loanAmount is required', 'VALIDATION_ERROR');
    }
    if (!loanPeriodNum || loanPeriodNum <= 0) {
      return failure(res, 400, 'loanPeriod is required', 'VALIDATION_ERROR');
    }
    if (!interestRateNum || interestRateNum <= 0) {
      return failure(res, 400, 'interestRate is required', 'VALIDATION_ERROR');
    }

    // Recalculate mortgage payment using the same amortization helper
    const amortization = calculateAmortization(loanAmountNum, interestRateNum, loanPeriodNum);

    // UAE-standard fee assumptions
    const landDepartmentFee = purchasePriceNum * 0.04;
    const registrationTrusteeFee = purchasePriceNum <= 500000 ? 2100 : 4200;
    const mortgageRegistrationFee = loanAmountNum * 0.0025 + 290;
    const realEstateAgencyFee = purchasePriceNum * 0.02;
    const mortgageArrangementFee = loanAmountNum * 0.01;
    const adminFee = 3150;

    const totalPurchaseCosts =
      landDepartmentFee +
      registrationTrusteeFee +
      mortgageRegistrationFee +
      realEstateAgencyFee +
      mortgageArrangementFee +
      adminFee;

    const totalUpfront = downPaymentNum + totalPurchaseCosts;

    const responseData = {
      paymentBreakdown: {
        downPayment: Math.round(downPaymentNum),
        totalPurchaseCosts: Math.round(totalPurchaseCosts),
        landDepartmentFee: Math.round(landDepartmentFee),
        registrationTrusteeFee: Math.round(registrationTrusteeFee),
        mortgageRegistrationFee: Math.round(mortgageRegistrationFee),
        realEstateAgencyFee: Math.round(realEstateAgencyFee),
        mortgageArrangementFee: Math.round(mortgageArrangementFee),
        adminFee: Math.round(adminFee),
      },
      calculationsBasedOn: {
        monthlyPayment: Math.round(amortization.monthlyPayment),
        interestRate: interestRateNum,
        loanAmount: Math.round(loanAmountNum),
        loanDuration: `${loanPeriodNum} years`,
        residencyStatus: residencyStatus || null,
      },
      totalAmountRequiredUpfront: Math.round(totalUpfront),
    };

    return success(res, 'Upfront costs calculated successfully', responseData, 200);
  } catch (error) {
    logger.error('Upfront costs calculation error', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    return failure(res, 500, 'Failed to calculate upfront costs', 'SERVER_ERROR');
  }
});

/**
 * @swagger
 * /mortgages/get-quote:
 *   post:
 *     summary: Submit a mortgage quote request
 *     description: >
 *       Public 3-step "Get a mortgage quote" form submission.
 *       Saves a MortgageQuote lead, sends confirmation email to the user,
 *       and notifies the internal mortgage team. No authentication required.
 *     tags: [Public]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - loanType
 *               - residenceStatus
 *               - employmentStatus
 *               - name
 *               - email
 *               - mobileNumber
 *             properties:
 *               loanType:
 *                 type: string
 *                 enum: [buy, refinance]
 *                 example: buy
 *               residenceStatus:
 *                 type: string
 *                 enum: [uae-national, uae-resident, non-resident]
 *                 description: Residency status; alias for residencyStatus. Either field is accepted.
 *                 example: uae-resident
 *               residencyStatus:
 *                 type: string
 *                 enum: [uae-national, uae-resident, non-resident]
 *                 description: Preferred residency field name; overrides residenceStatus when both are present.
 *                 example: uae-resident
 *               buyingProcess:
 *                 type: string
 *                 enum: [found-property, looking-for-property, just-exploring]
 *                 description: Where the user is in their buying journey
 *                 example: found-property
 *               propertyPrice:
 *                 type: number
 *                 description: Optional property price in AED
 *                 example: 1500000
 *               employmentStatus:
 *                 type: string
 *                 enum: [salaried, self-employed]
 *                 example: salaried
 *               monthlySalary:
 *                 type: number
 *                 description: Required when employmentStatus is "salaried"
 *                 example: 25000
 *               name:
 *                 type: string
 *                 example: John Doe
 *               email:
 *                 type: string
 *                 format: email
 *                 example: john.doe@example.com
 *               countryCode:
 *                 type: string
 *                 description: Country dialing code (default +971)
 *                 example: "+971"
 *               mobileNumber:
 *                 type: string
 *                 description: Mobile phone number without country code or in free-text format
 *                 example: "501234567"
 *               calculatorSnapshot:
 *                 type: object
 *                 description: Optional snapshot of the latest calculator values
 *                 properties:
 *                   purchasePrice:
 *                     type: number
 *                   residencyStatus:
 *                     type: string
 *                     enum: [uae-national, uae-resident, non-resident]
 *                   downPayment:
 *                     type: number
 *                   downPaymentPct:
 *                     type: number
 *                   loanAmount:
 *                     type: number
 *                   loanPeriod:
 *                     type: number
 *                   interestRate:
 *                     type: number
 *                   monthlyPayment:
 *                     type: number
 *                   totalInterest:
 *                     type: number
 *     responses:
 *       200:
 *         description: Quote request submitted successfully
 *       400:
 *         description: Validation error
 *       500:
 *         description: Server error
 */
/**
 * 3-step "Get a mortgage quote" funnel.
 * Validates the lead payload, stores it as a MortgageQuote document,
 * and sends confirmation + internal notification emails.
 */
const getQuote = asyncHandler(async (req, res) => {
  try {
    const {
      loanType,
      residenceStatus,
      residencyStatus,
      buyingProcess,
      propertyPrice,
      employmentStatus,
      monthlySalary,
      name,
      email,
      countryCode,
      mobileNumber,
      calculatorSnapshot,
    } = req.body || {};

    const effectiveResidencyStatus = residencyStatus || residenceStatus;
    const allowedLoanTypes = ['buy', 'refinance'];
    const allowedResidency = ['uae-national', 'uae-resident', 'non-resident'];
    const allowedEmployment = ['salaried', 'self-employed'];

    if (!loanType || !allowedLoanTypes.includes(loanType)) {
      return failure(res, 400, 'Invalid loanType', 'VALIDATION_ERROR');
    }

    if (!effectiveResidencyStatus || !allowedResidency.includes(effectiveResidencyStatus)) {
      return failure(res, 400, 'Invalid residencyStatus', 'VALIDATION_ERROR');
    }

    if (!employmentStatus || !allowedEmployment.includes(employmentStatus)) {
      return failure(res, 400, 'Invalid employmentStatus', 'VALIDATION_ERROR');
    }

    if (employmentStatus === 'salaried') {
      const salaryNum = Number(monthlySalary);
      if (!salaryNum || salaryNum <= 0) {
        return failure(
          res,
          400,
          'monthlySalary is required and must be greater than 0 for salaried employmentStatus',
          'VALIDATION_ERROR',
        );
      }
    }

    if (!name || !name.toString().trim()) {
      return failure(res, 400, 'name is required', 'VALIDATION_ERROR');
    }

    if (!email || !isEmail(email)) {
      return failure(res, 400, 'A valid email is required', 'VALIDATION_ERROR');
    }

    if (!mobileNumber || !mobileNumber.toString().trim()) {
      return failure(res, 400, 'mobileNumber is required', 'VALIDATION_ERROR');
    }

    const normalizedCountryCode = countryCode || '+971';
    const normalizedMobile = formatPhoneNumber(`${normalizedCountryCode}${mobileNumber}`);

    if (!normalizedMobile) {
      return failure(res, 400, 'Invalid mobile number', 'VALIDATION_ERROR');
    }

    let snapshot = undefined;
    if (calculatorSnapshot && typeof calculatorSnapshot === 'object') {
      const {
        purchasePrice,
        residencyStatus: snapshotResidencyStatus,
        downPayment,
        downPaymentPct,
        loanAmount,
        loanPeriod,
        interestRate,
        monthlyPayment,
        totalInterest,
      } = calculatorSnapshot;

      snapshot = {
        purchasePrice: purchasePrice != null ? Number(purchasePrice) : undefined,
        residencyStatus: snapshotResidencyStatus || effectiveResidencyStatus,
        downPayment: downPayment != null ? Number(downPayment) : undefined,
        downPaymentPct: downPaymentPct != null ? Number(downPaymentPct) : undefined,
        loanAmount: loanAmount != null ? Number(loanAmount) : undefined,
        loanPeriod: loanPeriod != null ? Number(loanPeriod) : undefined,
        interestRate: interestRate != null ? Number(interestRate) : undefined,
        monthlyPayment: monthlyPayment != null ? Number(monthlyPayment) : undefined,
        totalInterest: totalInterest != null ? Number(totalInterest) : undefined,
      };
    }

    const quote = await MortgageQuote.create({
      loanType,
      residencyStatus: effectiveResidencyStatus,
      buyingProcess,
      propertyPrice: propertyPrice != null ? Number(propertyPrice) : undefined,
      employmentStatus,
      monthlySalary: monthlySalary != null ? Number(monthlySalary) : undefined,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      countryCode: normalizedCountryCode,
      mobileNumber: normalizedMobile,
      calculatorSnapshot: snapshot,
      status: 'new',
    });

    const userSubject = 'Your mortgage quote request received';
    const userHtml = `
      <p>Hi ${quote.name},</p>
      <p>Your mortgage quote request has been submitted successfully.</p>
      <p>Our team will review your details and contact you shortly at <strong>${quote.email}</strong>.</p>
    `;

    try {
      await sendEmail(quote.email, userSubject, userHtml);
    } catch (emailError) {
      logger.error('Mortgage quote confirmation email failed', {
        error: emailError.message,
        quoteId: quote._id,
      });
    }

    if (MORTGAGE_TEAM_EMAIL) {
      try {
        const adminSubject = `New mortgage quote request from ${quote.name}`;
        const adminHtml = `
          <p>A new mortgage quote request has been submitted.</p>
          <pre>${JSON.stringify(
            {
              id: quote._id,
              name: quote.name,
              email: quote.email,
              mobileNumber: quote.mobileNumber,
              loanType: quote.loanType,
              residencyStatus: quote.residencyStatus,
              employmentStatus: quote.employmentStatus,
              buyingProcess: quote.buyingProcess,
              propertyPrice: quote.propertyPrice,
              calculatorSnapshot: quote.calculatorSnapshot,
              submittedAt: quote.submittedAt,
            },
            null,
            2,
          )}</pre>
        `;
        await sendEmail(MORTGAGE_TEAM_EMAIL, adminSubject, adminHtml);
      } catch (adminEmailError) {
        logger.error('Mortgage team notification email failed', {
          error: adminEmailError.message,
          quoteId: quote._id,
        });
      }
    }

    return success(res, 'Quote request submitted successfully', {
      quoteId: quote._id,
      sentTo: quote.email,
    });
  } catch (error) {
    logger.error('Create mortgage quote error', {
      error: error.message,
      stack: error.stack,
      body: req.body,
    });
    return failure(res, 500, 'Failed to submit mortgage quote request', 'SERVER_ERROR');
  }
});

module.exports = {
  calculateMortgage,
  calculateUpfrontCosts,
  getQuote,
};
