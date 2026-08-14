import { NextResponse } from 'next/server';

// API v1 root — returns the OpenAPI-style spec
export const dynamic = 'force-dynamic';

const SPEC = {
  openapi: '3.0.0',
  info: {
    title: 'RetroVault API',
    version: '1.0.0',
    description: 'RESTful API for programmatic access to your RetroVault collection data.',
    contact: { url: 'https://github.com/theretrovault/retrovault' },
  },
  servers: [{ url: '/api/v1', description: 'RetroVault local instance' }],
  security: [{ apiKey: [] }],
  components: {
    securitySchemes: {
      apiKey: {
        type: 'apiKey',
        in: 'header',
        name: 'X-RetroVault-Key',
        description: 'API key generated in Settings → API Keys. Also accepts Authorization: Bearer <key>.',
      }
    }
  },
  paths: {
    '/inventory': {
      get: {
        summary: 'List all games in your catalog',
        parameters: [
          { name: 'platform', in: 'query', description: 'Filter by platform name' },
          { name: 'owned', in: 'query', description: 'true = owned only, false = unowned only' },
          { name: 'q', in: 'query', description: 'Search by title' },
          { name: 'limit', in: 'query', description: 'Max results (default 100, max 1000)' },
          { name: 'offset', in: 'query', description: 'Pagination offset' },
          { name: 'has_price', in: 'query', description: 'true = only games with market price data' },
          { name: 'sort', in: 'query', description: 'Sort field: title, platform, marketLoose, lastFetched' },
        ]
      }
    },
    '/collection': {
      get: { summary: 'Collection summary stats and KPIs' }
    },
    '/sales': {
      get: { summary: 'Sales and acquisition history', parameters: [
        { name: 'type', in: 'query', description: 'sales | acquisitions | both (default)' },
        { name: 'limit', in: 'query' }, { name: 'offset', in: 'query' },
      ]}
    },
    '/watchlist': {
      get: { summary: 'Target Radar watchlist items' }
    },
    '/grails': {
      get: { summary: 'Holy Grail wish list', parameters: [
        { name: 'status', in: 'query', description: 'hunting | found | all (default)' }
      ]}
    },
    '/achievements': {
      get: { summary: 'Achievement unlock status and progress' }
    },
    '/health': {
      get: { summary: 'System health and collection data quality metrics' }
    },
    '/keys': {
      get: { summary: 'List your API keys (write key required)' },
      post: { summary: 'Create a new API key (write key required)', requestBody: {
        content: { 'application/json': { schema: { properties: {
          name: { type: 'string' }, permissions: { type: 'string', enum: ['read', 'write'] }
        }}}}
      }},
      delete: { summary: 'Revoke an API key (write key required)', parameters: [
        { name: 'id', in: 'query', required: true }
      ]}
    },
  }
};

export async function GET() {
  return NextResponse.json(SPEC, {
    headers: { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' }
  });
}
