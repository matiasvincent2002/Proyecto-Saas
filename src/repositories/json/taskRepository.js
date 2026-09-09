import path from 'node:path';
import { JsonFileRepository } from './jsonFileRepository.js';
import { config } from '../../config/env.js';

export class TaskRepository {
  constructor(repository = new JsonFileRepository(path.join(config.dataDirectory, 'tasks.json'))) {
    this.repository = repository;
  }

  async findAll() {
    const tasks = await this.repository.readAll();
    return tasks.filter((task) => !task.isDeleted);
  }

  async findVisibleForUser(user) {
    const tasks = await this.findAll();
    if (['PROGRAMADOR', 'DISEÑADOR'].includes(user.role)) {
      return tasks.filter((task) => task.assigneeId === user.id);
    }
    return tasks;
  }

  async findById(id) {
    const tasks = await this.repository.readAll();
    return tasks.find((task) => task.id === id && !task.isDeleted) ?? null;
  }

  async countActiveByProjectId(projectId) {
    const tasks = await this.findAll();
    return tasks.filter((task) => task.projectId === projectId).length;
  }

  async create(task) {
    const tasks = await this.repository.readAll();
    tasks.push(task);
    await this.repository.writeAll(tasks);
    return task;
  }

  async updateStatus(id, status, actor, reason = '') {
    const tasks = await this.repository.readAll();
    const task = tasks.find((item) => item.id === id && !item.isDeleted);
    if (!task) return null;
    task.status = status;
    task.updatedAt = new Date().toISOString();
    task.reviewHistory = task.reviewHistory ?? [];
    task.reviewHistory.push({
      status,
      reason,
      userId: actor.id,
      role: actor.role,
      createdAt: task.updatedAt
    });
    await this.repository.writeAll(tasks);
    return task;
  }

  async updateById(id, changes) {
    const tasks = await this.repository.readAll();
    const task = tasks.find((item) => item.id === id && !item.isDeleted);
    if (!task) return null;
    Object.assign(task, changes, { updatedAt: new Date().toISOString() });
    await this.repository.writeAll(tasks);
    return task;
  }

  async deleteById(id) {
    const tasks = await this.repository.readAll();
    const task = tasks.find((item) => item.id === id && !item.isDeleted);
    if (!task) return false;
    task.isDeleted = true;
    task.deletedAt = new Date().toISOString();
    await this.repository.writeAll(tasks);
    return true;
  }
}