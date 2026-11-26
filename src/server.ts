import app from './app.js';
import { env } from './config/env.js';
import { prisma } from './lib/prisma.js';
export default app;

if (!process.env.VERCEL) {
  const server = app.listen(env.port, () => {
    console.log(`Dijitali Maths server running on ${env.appOrigin} (port ${env.port})`);
  });

  const shutdown = (signal: string) => {
    console.log(`Received ${signal}; closing server.`);
    server.close((error) => {
      if (error) {
        console.error('Server shutdown failed.');
        process.exit(1);
      }
      void prisma.$disconnect().then(() => process.exit(0)).catch(() => process.exit(1));
    });
    setTimeout(() => process.exit(1), 10_000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

