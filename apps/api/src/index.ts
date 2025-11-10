import Fastify from 'fastify';
import cors from '@fastify/cors';
import { resultsRoutes } from './routes/results';
import { authRoutes } from './routes/auth';
import { executionPlansRoutes } from './routes/executionplans';
import loadTestExecutionsRoutes from './routes/loadtestexecutions';

const server = Fastify({
  logger: true,
});

// Register CORS
server.register(cors, {
  origin: true, // Allow all origins in development
});

// Register routes
server.register(resultsRoutes);
server.register(authRoutes);
server.register(executionPlansRoutes);
server.register(loadTestExecutionsRoutes);

// Health check endpoint
server.get('/health', async (request, reply) => {
  return { status: 'ok', timestamp: new Date().toISOString() };
});

// Start server
const start = async () => {
  try {
    const port = parseInt(process.env.PORT || '3000', 10);
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`🚀 Server listening on http://${host}:${port}`);
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();

