import path from 'node:path';
import { JsonFileRepository } from './jsonFileRepository.js';
import { config } from '../../config/env.js';

export class UserRepository {
  constructor(repository = new JsonFileRepository(path.join(config.dataDirectory, 'users.json'))) {
    this.repository = repository;
  }

  async findByEmail(email) {
    const users = await this.repository.readAll();
    return users.find((user) => user.email === email) ?? null;
  }

  async findById(id) {
    const users = await this.repository.readAll();
    return users.find((user) => user.id === id) ?? null;
  }

  async findAll() {
    const users = await this.repository.readAll();
    return users.filter((user) => !user.isDeleted);
  }

  async countAdministrators() {
    const users = await this.repository.readAll();
    return users.filter((user) => user.role === 'ADMINISTRADOR' && !user.isDeleted).length;
  }

  async create(user) {
    const users = await this.repository.readAll();
    users.push(user);
    await this.repository.writeAll(users);
    return user;
  }
}
