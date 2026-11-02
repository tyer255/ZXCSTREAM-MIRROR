import type { VercelRequest, VercelResponse } from '@vercel/node';
// @ts-ignore - pre-bundled ESM server app generated during build
import app from './_bundle.js';

export default function handler(req: VercelRequest, res: VercelResponse) {
  return app(req, res);
}
