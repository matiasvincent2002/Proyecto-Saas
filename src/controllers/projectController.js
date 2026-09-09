import { randomUUID } from 'node:crypto';
import { HttpError } from '../utils/httpError.js';

export function createProjectController(projectRepository) {
  return {
    list: async (_request, response) => {
      const projects = await projectRepository.findAll();
      response.json({
        data: projects,
        message: 'Proyectos obtenidos correctamente'
      });
    },
    create: async (request, response) => {
      const { name, description = '' } = request.body;
      if (typeof name !== 'string' || !name.trim()) {
        throw new HttpError(400, 'INVALID_PROJECT_INPUT', 'El nombre del proyecto es obligatorio');
      }
      const project = await projectRepository.create({
        id: randomUUID(),
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        status: 'PLANNING',
        isDeleted: false,
        createdBy: request.user.id,
        createdAt: new Date().toISOString()
      });
      response.status(201).json({ data: project, message: 'Proyecto creado correctamente' });
    },
    update: async (request, response) => {
      const { name, description = '', status = 'PLANNING' } = request.body;
      const allowedStatuses = ['PLANNING', 'IN_PROGRESS', 'COMPLETED'];
      if (typeof name !== 'string' || !name.trim() || !allowedStatuses.includes(status)) {
        throw new HttpError(400, 'INVALID_PROJECT_INPUT', 'El proyecto no tiene datos válidos');
      }
      const project = await projectRepository.updateById(request.params.id, {
        name: name.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        status
      });
      if (!project) throw new HttpError(404, 'PROJECT_NOT_FOUND', 'El proyecto no existe');
      response.json({ data: project, message: 'Proyecto actualizado correctamente' });
    },
    remove: async (request, response) => {
      const deleted = await projectRepository.deleteById(request.params.id);
      if (!deleted) {
        throw new HttpError(404, 'PROJECT_NOT_FOUND', 'El proyecto no existe');
      }
      response.status(204).send();
    }
  };
}