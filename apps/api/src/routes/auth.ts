import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { prisma } from '../services/db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

interface LoginBody {
  email: string;
  password: string;
}

interface LoginResponse {
  token: string;
  user: {
    id: string;
    email: string;
  };
}

/**
 * POST /auth/login
 * JWT-based authentication
 */
async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
) {
  try {
    const { email, password } = request.body;

    if (!email || !password) {
      return reply.code(400).send({ error: 'Email and password are required' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);

    if (!isValid) {
      return reply.code(401).send({ error: 'Invalid credentials' });
    }

    // Generate JWT token
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      request.log.error('JWT_SECRET not configured');
      return reply.code(500).send({ error: 'Server configuration error' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: '7d' }
    );

    const response: LoginResponse = {
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    };

    return reply.send(response);
  } catch (error) {
    request.log.error(error, 'Error during login');
    return reply.code(500).send({ error: 'Login failed' });
  }
}

/**
 * Helper function to verify JWT token
 * Can be used as a preHandler hook for protected routes
 */
export async function verifyToken(
  request: FastifyRequest,
  reply: FastifyReply
) {
  try {
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return reply.code(401).send({ error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.substring(7);
    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      return reply.code(500).send({ error: 'Server configuration error' });
    }

    const decoded = jwt.verify(token, jwtSecret) as { userId: string; email: string };

    // Attach user info to request for use in route handlers
    (request as any).user = decoded;

    return;
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return reply.code(401).send({ error: 'Invalid token' });
    }
    request.log.error(error, 'Error verifying token');
    return reply.code(500).send({ error: 'Token verification failed' });
  }
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post('/auth/login', login);
}

