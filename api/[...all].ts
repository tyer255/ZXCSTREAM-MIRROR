import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../serverApp.ts';

export default function handler(req: VercelRequest, res: VercelResponse) {
  // Restore true requested URL if rewritten or altered by Vercel serverless gateway
  const matchedPath = req.headers['x-matched-path'] as string | undefined;
  const originalUri = (req.headers['x-forwarded-uri'] || req.headers['x-original-uri']) as string | undefined;

  if (matchedPath && matchedPath.startsWith('/api')) {
    req.url = matchedPath;
  } else if (originalUri && originalUri.startsWith('/api')) {
    req.url = originalUri;
  } else if (req.query && req.query.all) {
    const segments = Array.isArray(req.query.all) ? req.query.all.join('/') : String(req.query.all);
    const rawUrl = req.url || '';
    const qIndex = rawUrl.indexOf('?');
    const queryString = qIndex !== -1 ? rawUrl.slice(qIndex) : '';
    req.url = `/api/${segments}${queryString}`;
  }

  return app(req, res);
}
