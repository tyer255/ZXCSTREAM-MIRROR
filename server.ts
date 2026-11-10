import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { app } from './serverApp.ts';

// Catch socket resets and client aborts during video streaming
process.on('uncaughtException', (err: any) => {
  const code = err?.code || err?.cause?.code;
  const msg = ((err?.message || '') + ' ' + (err?.cause?.message || '')).toLowerCase();
  if (
    code === 'ECONNRESET' ||
    code === 'EPIPE' ||
    code === 'ERR_STREAM_PREMATURE_CLOSE' ||
    code === 'UND_ERR_BODY_TIMEOUT' ||
    msg.includes('terminated') ||
    msg.includes('econnreset') ||
    msg.includes('premature close') ||
    msg.includes('socket hang up')
  ) {
    return;
  }
  console.error('[UNCAUGHT EXCEPTION]', err);
});

process.on('unhandledRejection', (reason: any) => {
  const code = reason?.code || reason?.cause?.code;
  const msg = ((reason?.message || '') + ' ' + (reason?.cause?.message || '')).toLowerCase();
  if (
    code === 'ECONNRESET' ||
    code === 'EPIPE' ||
    code === 'ERR_STREAM_PREMATURE_CLOSE' ||
    code === 'UND_ERR_BODY_TIMEOUT' ||
    msg.includes('terminated') ||
    msg.includes('econnreset') ||
    msg.includes('premature close') ||
    msg.includes('socket hang up')
  ) {
    return;
  }
  console.error('[UNHANDLED REJECTION]', reason);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.DEFAULT_APP_PORT
  ? parseInt(process.env.DEFAULT_APP_PORT, 10)
  : 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: PORT },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ZXC[STREAM] full-stack server running on http://0.0.0.0:${PORT}`);
  });
}

// Only start standalone server if not running inside a Vercel serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
