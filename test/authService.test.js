import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../src/auth/password.js';
import { AuthService } from '../src/services/authService.js';

function createRepositories(user) {
  const sessions = [];
  return {
    userRepository: {
      async findByEmail() {
        return user;
      },
      async findById() {
        return user;
      }
    },
    sessionRepository: {
      async create(session) {
        sessions.push(session);
      },
      async findActiveByTokenHash(tokenHash, now = new Date()) {
        return sessions.find((session) => (
          session.tokenHash === tokenHash
          && !session.revokedAt
          && new Date(session.expiresAt) > now
        )) ?? null;
      },
      async revokeById(id, revokedAt) {
        const session = sessions.find((item) => item.id === id);
        if (session) {
          session.revokedAt = revokedAt;
        }
      }
    }
  };
}

test('crea, autentica y revoca una sesión opaca', async () => {
  const user = {
    id: randomUUID(),
    name: 'Admin Piloto',
    email: 'admin@example.com',
    passwordHash: await hashPassword('secret'),
    role: 'ADMINISTRADOR',
    isActive: true,
    isDeleted: false
  };
  const repositories = createRepositories(user);
  const authService = new AuthService(repositories.userRepository, repositories.sessionRepository);

  const result = await authService.login(user.email, 'secret');
  assert.ok(result.token);
  assert.equal(result.user.passwordHash, undefined);

  const authenticated = await authService.authenticate(result.token);
  assert.equal(authenticated.user.id, user.id);

  await authService.logout(result.token);
  await assert.rejects(() => authService.authenticate(result.token), { code: 'INVALID_SESSION' });
});
