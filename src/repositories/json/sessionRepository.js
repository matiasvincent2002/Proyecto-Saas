import path from 'node:path';
import { JsonFileRepository } from './jsonFileRepository.js';
import { config } from '../../config/env.js';

export class SessionRepository {
  constructor(repository = new JsonFileRepository(path.join(config.dataDirectory, 'sessions.json'))) {
    this.repository = repository;
  }

  async create(session) {
    const sessions = await this.repository.readAll();
    sessions.push(session);
    await this.repository.writeAll(sessions);
    return session;
  }

  async findActiveByTokenHash(tokenHash, now = new Date()) {
    const sessions = await this.repository.readAll();
    return sessions.find((session) => (
      session.tokenHash === tokenHash
      && !session.revokedAt
      && new Date(session.expiresAt) > now
    )) ?? null;
  }

  async revokeById(id, revokedAt = new Date().toISOString()) {
    const sessions = await this.repository.readAll();
    const session = sessions.find((item) => item.id === id);
    if (!session) {
      return false;
    }
    session.revokedAt = revokedAt;
    await this.repository.writeAll(sessions);
    return true;
  }
}
