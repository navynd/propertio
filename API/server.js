const dotenv = require('dotenv');
dotenv.config();

const fs = require('fs');
const http = require('http');
const https = require('https');
const app = require('./src/app');
const { connectToDatabase } = require('./src/config/db');
const { logger } = require('./src/utils/logger');
const { startUnitStatusReleaseCron } = require('./src/crons/unitStatusReleaseCron');
const { startUnitCountsReconciliationCron } = require('./src/crons/unitCountsReconciliationCron');
const { startSearchAlertsPushCron } = require('./src/crons/searchAlertsPushCron');


const sslPath = '/etc/letsencrypt/live/api.estatehub.tj';

const port = process.env.PORT || 5000;
const isUnitStatusReleaseCronEnabled =
  (process.env.CRON_UNIT_STATUS_RELEASE_ENABLED || 'false')
    .toLowerCase() === 'true';
const isUnitCountsReconciliationCronEnabled =
  (process.env.CRON_UNIT_COUNTS_RECONCILIATION_ENABLED || 'false')
    .toLowerCase() === 'true';

const isSearchAlertsPushCronEnabled =
  (process.env.CRON_SEARCH_ALERTS_PUSH_ENABLED || 'false')
    .toLowerCase() === 'true';

async function startServer() {
  try {
    await connectToDatabase();

    if (isUnitStatusReleaseCronEnabled) {
      startUnitStatusReleaseCron();
      logger.info('Unit status release cron enabled via env');
    } else {
      logger.info('Unit status release cron disabled via env');
    }

    if (isUnitCountsReconciliationCronEnabled) {
      startUnitCountsReconciliationCron();
      logger.info('Unit counts reconciliation cron enabled via env');
    } else {
      logger.info('Unit counts reconciliation cron disabled via env');
    }

    if (isSearchAlertsPushCronEnabled) {
      startSearchAlertsPushCron();
      logger.info('Search alerts push cron enabled via env');
    } else {
      logger.info('Search alerts push cron disabled via env');
    }

    let server;

    // Check if SSL certs exist (for server env)
    if (fs.existsSync(`${sslPath}/privkey.pem`) && fs.existsSync(`${sslPath}/fullchain.pem`)) {
      const options = {
        key: fs.readFileSync(`${sslPath}/privkey.pem`),
        cert: fs.readFileSync(`${sslPath}/fullchain.pem`)
      };
      server = https.createServer(options, app);
      logger.info(`Running with HTTPS on port ${port}`);
    } else {
      // Fallback for local dev
      server = http.createServer(app);
      logger.info(`Running with HTTP (no SSL found) on port ${port}`);
    }

    server.listen(port, () => {
      logger.info(`API server listening on port ${port}`);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT received. Shutting down gracefully...');
      server.close(() => {
        logger.info('Server closed');
        process.exit(0);
      });
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

startServer();
