const asyncHandler = require('express-async-handler');

const { success, failure } = require('../../utils/helpers');
const { getHistoricalTransactions } = require('../../services/historicalTransactionsService');

/**
 * @swagger
 * /transactions/historical:
 *   get:
 *     summary: Historical property transactions (closed deals)
 *     tags: [Public]
 *     parameters:
 *       - in: query
 *         name: dealType
 *         schema:
 *           type: string
 *           enum: [rent, sale, rented, sold]
 *       - in: query
 *         name: city
 *         schema:
 *           type: string
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *       - in: query
 *         name: agency
 *         schema:
 *           type: string
 *       - in: query
 *         name: propertyTypeId
 *         schema:
 *           type: string
 *       - in: query
 *         name: bedrooms
 *         schema:
 *           type: string
 *           enum: [studio, 1, 2, 3, 4, 5, 6, 7, 7+]
 *       - in: query
 *         name: priceMin
 *         schema:
 *           type: number
 *       - in: query
 *         name: priceMax
 *         schema:
 *           type: number
 *       - in: query
 *         name: timeframe
 *         schema:
 *           type: string
 *           enum: [1w, 1m, 3m, 6m, 1y, ytd, 3y]
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [newest, oldest, price-high, price-low]
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Historical transactions fetched
 *       400:
 *         description: Validation error
 */
const getHistoricalTransactionsHandler = asyncHandler(async (req, res) => {
  try {
    const data = await getHistoricalTransactions(req.query);

    if (data.error) {
      return failure(res, 400, data.error, 'VALIDATION_ERROR');
    }

    return success(res, 'Historical transactions fetched successfully', data);
  } catch (error) {
    console.error('Get historical transactions error:', error);
    return failure(
      res,
      500,
      'Internal server error',
      'SERVER_ERROR',
      process.env.NODE_ENV === 'development' ? { error: error.message } : undefined,
    );
  }
});

module.exports = {
  getHistoricalTransactionsHandler,
};
