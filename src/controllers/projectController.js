import { randomUUID } from 'node:crypto';
import { HttpError } from '../utils/httpError.js';

export function createProjectController(projectRepository, userRepository, taskRepository) {
  const projectStatuses = ['PLANNING', 'IN_PROGRESS', 'COMPLETED'];

  async function validatePeople(leaderId, memberIds) {
    if (leaderId) {
      const leader = await userRepository.findById(leaderId);
      if (!leader || leader.role !== 'LIDER') {
        throw new HttpError(400, 'INVALID_PROJECT_LEADER', 'El responsable del proyecto debe ser un líder');
      }
    }
    if (!Array.isArray(memberIds)) {
      throw new HttpError(400, 'INVALID_PROJECT_MEMBERS', 'Los miembros del proyecto deben ser una lista');
    }
    for (const memberId of memberIds) {
      const member = await userRepository.findById(memberId);
      if (!member || !['PROGRAMADOR', 'DISEÑADOR'].includes(member.role)) {
        throw new HttpError(400, 'INVALID_PROJECT_MEMBER', 'Los miembros deben ser programadores o diseñadores');
      }
    }
  }

  return {
    list: async (_request, response) => {
      const projects = await projectRepository.findAll();
      response.json({
        data: projects,
        message: 'Proyectos obtenidos correctamente'
      });
    },
    create: async (request, response) => {
      const { name, description = '', leaderId = null, memberIds = [] } = request.body;
      if (typeof name !== 'string' || !name.trim()) {
        throw new HttpError(400, 'INVALID_PROJECT_INPUT', 'El nombre del proyecto es obligatorio');
      }
      await validatePeople(leaderId, memberIds);
      const project = await projectRepository.create({
        id: randomUUID(),
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        leaderId,
        memberIds,
        status: 'PLANNING',
        isDeleted: false,
        createdBy: request.user.id,
        createdAt: new Date().toISOString()
      });
      response.status(201).json({ data: project, message: 'Proyecto creado correctamente' });
    },
    update: async (request, response) => {
      const { name, description = '', status = 'PLANNING', leaderId = null, memberIds = [] } = request.body;
      if (typeof name !== 'string' || !name.trim() || !projectStatuses.includes(status)) {
        throw new HttpError(400, 'INVALID_PROJECT_INPUT', 'El proyecto no tiene datos válidos');
      }
      await validatePeople(leaderId, memberIds);
      const project = await projectRepository.updateById(request.params.id, {
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        status,
        leaderId,
        memberIds
      });
      if (!project) throw new HttpError(404, 'PROJECT_NOT_FOUND', 'El proyecto no existe');
      response.json({ data: project, message: 'Proyecto actualizado correctamente' });
    },
    remove: async (request, response) => {
      if (await taskRepository.countActiveByProjectId(request.params.id) > 0) {
        throw new HttpError(409, 'PROJECT_HAS_TASKS', 'No puedes eliminar un proyecto con tareas activas');
      }
      const deleted = await projectRepository.deleteById(request.params.id);
      if (!deleted) {
        throw new HttpError(404, 'PROJECT_NOT_FOUND', 'El proyecto no existe');
      }
      response.status(204).send();
    }
  };
}