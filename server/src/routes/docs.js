import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from '../docs/openapi.js';

const router = Router();

// Raw spec for tooling/codegen
router.get('/docs.json', (_req, res) => {
  res.json(openApiSpec);
});

// Interactive Swagger UI
router.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec, { customSiteTitle: 'EZ Ads API Docs' }));

export default router;
