import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { app } from './serverApp.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
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

  app.listen(PORT, () => {
    console.log(`ZXC[STREAM] full-stack server running on http://localhost:${PORT}`);
  });
}

// Only start standalone server if not running inside a Vercel serverless environment
if (!process.env.VERCEL) {
  startServer();
}

export { app };
export default app;
