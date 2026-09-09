import { randomUUID } from 'node:crypto';
import { comparePassword } from '../auth/password.js';
import { createOpaqueToken, hashToken } from '../auth/token.js';
import { config } from '../config/env.js';
import { HttpError } from '../utils/httpError.js';

export class AuthService {
  constructor(userRepository, sessionRepository, now = () => new Date()) {
    this.userRepository = userRepository;
    this.sessionRepository = sessionRepository;
    this.now = now;
  }

  async login(email, password) {
    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      throw new HttpError(400, 'INVALID_CREDENTIALS_INPUT', 'Correo y contraseña son obligatorios');
    }
    const user = await this.userRepository.findByEmail(email.toLowerCase());
    if (!user || user.isDeleted || !user.isActive || !(await comparePassword(password, user.passwordHash))) {
      throw new HttpError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');
    }

    const { token, tokenHash } = createOpaqueToken();
    const createdAt = this.now();
    const session = {
      id: randomUUID(),
      tokenHash,
      userId: user.id,
      createdAt: createdAt.toISOString(),
      expiresAt: new Date(createdAt.getTime() + config.sessionTtlMilliseconds).toISOString(),
      revokedAt: null
    };

    await this.sessionRepository.create(session);
    return { token, user: this.toPublicUser(user), expiresAt: session.expiresAt };
  }

  async logout(token) {
    const session = await this.sessionRepository.findActiveByTokenHash(hashToken(token));
    if (session) {
      await this.sessionRepository.revokeById(session.id, this.now().toISOString());
    }
  }

  async authenticate(token) {
    const session = await this.sessionRepository.findActiveByTokenHash(hashToken(token), this.now());
    if (!session) {
      throw new HttpError(401, 'INVALID_SESSION', 'La sesión no es válida o ha expirado');
    }
    const user = await this.userRepository.findById(session.userId);
    if (!user || user.isDeleted || !user.isActive) {
      throw new HttpError(401, 'INVALID_SESSION', 'La sesión no es válida');
    }
    return { session, user };
  }

  toPublicUser(user) {
    const { passwordHash, ...publicUser } = user;
    return publicUser;
  }
}
