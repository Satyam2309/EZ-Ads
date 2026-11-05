/**
 * OpenAPI 3.0 specification for the EZ Ads API.
 * Served as Swagger UI at /api/docs (swagger-ui-express) and raw JSON at /api/docs.json.
 * Grows phase by phase — auth + discovery + campaigns are the current contract.
 */
export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'EZ Ads API',
    version: '0.2.0',
    description:
      'Influencer marketing marketplace API. Influencers authenticate via Meta/Instagram OAuth (professional accounts only). Brands use email/password with JWT httpOnly cookie sessions. Simulated payments are always labeled simulated.'
  },
  servers: [{ url: 'http://localhost:5000', description: 'Local development' }],
  tags: [
    { name: 'System' },
    { name: 'Auth' },
    { name: 'Influencers' },
    { name: 'Campaigns' },
    { name: 'Shortlists' }
  ],
  components: {
    securitySchemes: {
      sessionCookie: { type: 'apiKey', in: 'cookie', name: 'ezads_token' }
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          ok: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Validation failed' }
            }
          }
        }
      },
      Health: {
        type: 'object',
        properties: {
          ok: { type: 'boolean' },
          service: { type: 'string' },
          db: { type: 'string', enum: ['disconnected', 'connected', 'connecting', 'disconnecting'] },
          oauthMode: { type: 'string' },
          time: { type: 'string', format: 'date-time' }
        }
      }
    }
  },
  paths: {
    '/api/health': {
      get: {
        tags: ['System'],
        summary: 'Service + database + OAuth mode status',
        responses: {
          200: {
            description: 'Service status',
            content: { 'application/json': { schema: { $ref: '#/components/schemas/Health' } } }
          }
        }
      }
    },
    '/api/auth/instagram/start': {
      get: {
        tags: ['Auth'],
        summary: 'Begin Instagram OAuth (Phase 3)',
        description:
          'Redirects to Meta Business Login for Instagram. Requires instagram professional account. Falls back to clearly-labeled mock flow when credentials are absent.',
        responses: { 302: { description: 'Redirect to Meta authorization screen' } }
      }
    },
    '/api/influencers/search': {
      get: {
        tags: ['Influencers'],
        summary: 'Discovery search (Phase 4)',
        description: 'Filter by niche, platform, followers, engagement, budget, location, format; sort + paginate.',
        parameters: [
          { name: 'q', in: 'query', schema: { type: 'string' } },
          { name: 'niche', in: 'query', schema: { type: 'string' } },
          { name: 'minFollowers', in: 'query', schema: { type: 'integer' } },
          { name: 'maxFollowers', in: 'query', schema: { type: 'integer' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } }
        ],
        responses: {
          200: { description: 'Paginated influencers', content: { 'application/json': { schema: { type: 'object' } } } }
        }
      }
    },
    '/api/campaigns': {
      get: {
        tags: ['Campaigns'],
        summary: 'List campaigns (Phase 5)',
        responses: { 200: { description: 'Paginated campaigns', content: { 'application/json': { schema: { type: 'object' } } } } }
      },
      post: {
        tags: ['Campaigns'],
        summary: 'Create campaign — brand only (Phase 5)',
        security: [{ sessionCookie: [] }],
        responses: {
          201: { description: 'Created' },
          401: { description: 'Not authenticated', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          403: { description: 'Not a brand', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } }
        }
      }
    }
  }
};
