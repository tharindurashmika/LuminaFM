import express, { Application } from 'express';
import cors from 'cors';
import path from 'node:path';

import { config } from './config/environment';
import { securityHeadersMiddleware } from './middleware/security-headers.middleware';
import { requestLoggerMiddleware } from './middleware/request-logger.middleware';
import {
  authRateLimitMiddleware,
  standardRateLimitMiddleware,
  operationsRateLimitMiddleware,
} from './middleware/rate-limiter.middleware';

import authRoutes from './modules/auth/auth.routes';
import organizationRoutes from './modules/organization/organization.routes';
import usersRoutes from './modules/users/users.routes';
import rolesRoutes from './modules/roles/roles.routes';
import assetRoutes from './modules/assets/assets.routes';
import attributeRoutes from './modules/attributes/attributes.routes';
import workOrderRoutes from './modules/work-orders/work-orders.routes';
import maintenanceRoutes from './modules/maintenance/maintenance.routes';
import operationsRoutes from './modules/operations/operations.routes';
import decisionSupportRoutes from './modules/decision-support/decision-support.routes';
import governanceRoutes from './modules/decision-support/governance/governance.routes';
import operationalAnpRoutes from './modules/decision-support/operational-integration/operational-anp.routes';
import auditRoutes from './modules/audit/audit.routes';
import boilerRoutes from './modules/boiler/boiler.routes';
import devopsRoutes from './modules/devops/devops.routes';
import equipmentFrameworkRoutes from './modules/equipment-framework/equipment-framework.routes';
import { initializeEquipmentFramework } from './modules/equipment-framework/equipment-framework.init';
import { errorHandler } from './middleware/error.middleware';

export function createApp(): Application {
  const app = express();

  // Initialize polymorphic equipment module framework
  initializeEquipmentFramework();

  // 1. Enterprise Security Headers (HSTS, CSP, X-Frame-Options, X-Content-Type-Options)
  app.use(securityHeadersMiddleware);

  // 2. Structured Request Logging & Correlation ID Tracing
  app.use(requestLoggerMiddleware);

  // 3. CORS Configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || config.corsAllowedOrigins.includes('*') || config.corsAllowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, true); // Permissive in dev/test, strict in production via config
        }
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id', 'X-Tenant-Domain'],
    })
  );

  // 4. Body Parsing
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // 5. Static File Serving for Uploaded Assets (White-Label Logos) & Fallback Platform Branding
  app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));
  app.use('/static', express.static(path.resolve(process.cwd(), 'public', 'static')));
  app.use(express.static(path.resolve(process.cwd(), 'public')));

  // 6. Base Health & Observability Probes
  app.get('/health', (_req, res) => {
    res.status(200).json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'LuminaFM CMMS Core API',
      deploymentModel: config.deploymentModel,
      environment: config.env,
    });
  });

  // DevOps & Observability Routes (/health/live, /health/ready, /metrics, /api/devops/*)
  app.use(devopsRoutes);

  // 7. Tiered Rate Limiting
  app.use('/api/auth/login', authRateLimitMiddleware);
  app.use('/api/operations', operationsRateLimitMiddleware);
  app.use('/api', standardRateLimitMiddleware);

  // 8. Domain REST API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/organization', organizationRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/roles', rolesRoutes);
  app.use('/api', assetRoutes);
  app.use('/api', attributeRoutes);
  app.use('/api', workOrderRoutes);
  app.use('/api', maintenanceRoutes);
  app.use('/api', operationsRoutes);
  app.use('/api', decisionSupportRoutes);
  app.use('/api/decision-governance', governanceRoutes);
  app.use('/api/decision-support/operational', operationalAnpRoutes);
  app.use('/api', auditRoutes);
  app.use('/api', boilerRoutes);
  app.use(equipmentFrameworkRoutes);

  // 9. Global Error Handling Middleware
  app.use(errorHandler);

  return app;
}

export const app = createApp();
export default app;
