import type { FastifyRequest, FastifyReply } from 'fastify';
import { loginSchema } from '@alsun/schemas';
import type { AuthService } from '../../services/auth/auth.service';
import { setSession, clearSession, getSessionUser } from '../../lib/session';

export class AuthController {
  constructor(private readonly auth: AuthService) {}

  login = async (request: FastifyRequest, reply: FastifyReply) => {
    const { username, password } = loginSchema.parse(request.body);
    const user = this.auth.login(username, password); // throws 401 on mismatch
    setSession(reply, user);
    return { authenticated: true, username: user };
  };

  logout = async (_request: FastifyRequest, reply: FastifyReply) => {
    clearSession(reply);
    return { authenticated: false };
  };

  me = async (request: FastifyRequest) => {
    const user = getSessionUser(request);
    return user ? { authenticated: true, username: user } : { authenticated: false };
  };
}
