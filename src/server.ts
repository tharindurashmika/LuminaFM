import 'dotenv/config';
import { app } from './app';
import { checkDatabaseConnection } from './index';

const PORT = process.env.PORT || 3000;

async function bootstrap() {
  console.log('[LuminaFM] Starting API Server...');
  await checkDatabaseConnection();

  app.listen(PORT, () => {
    console.log(`[LuminaFM] Core Service listening on port ${PORT}`);
    console.log(`[LuminaFM] REST Endpoints active at http://localhost:${PORT}/api/`);
  });
}

if (process.env.NODE_ENV !== 'test') {
  bootstrap().catch((err) => {
    console.error('[LuminaFM] Fatal bootstrap failure:', err);
    process.exit(1);
  });
}

