import path from 'node:path';
import { JsonFileRepository } from './jsonFileRepository.js';
import { config } from '../../config/env.js';

export class ProjectRepository {
  constructor(repository = new JsonFileRepository(path.join(config.dataDirectory, 'projects.json'))) {
    this.repository = repository;
  }

  async findAll() {
    const projects = await this.repository.readAll();
    return projects.filter((project) => !project.isDeleted);
  }

  async create(project) {
    const projects = await this.repository.readAll();
    projects.push(project);
    await this.repository.writeAll(projects);
    return project;
  }

  async deleteById(id) {
    const projects = await this.repository.readAll();
    const project = projects.find((item) => item.id === id && !item.isDeleted);
    if (!project) return false;
    project.isDeleted = true;
    project.deletedAt = new Date().toISOString();
    await this.repository.writeAll(projects);
    return true;
  }

  async updateById(id, changes) {
    const projects = await this.repository.readAll();
    const project = projects.find((item) => item.id === id && !item.isDeleted);
    if (!project) return null;
    Object.assign(project, changes, { updatedAt: new Date().toISOString() });
    await this.repository.writeAll(projects);
    return project;
  }
}