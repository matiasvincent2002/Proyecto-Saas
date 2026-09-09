import { randomUUID } from 'node:crypto';
import { HttpError } from '../utils/httpError.js';

export function createTaskController(taskRepository, userRepository) {
  async function validateAssignee(assigneeId) {
    if (!assigneeId) return;
    const assignee = await userRepository.findById(assigneeId);
    if (!assignee || !['PROGRAMADOR', 'DISEÑADOR'].includes(assignee.role)) {
      throw new HttpError(400, 'INVALID_TASK_ASSIGNEE', 'Las tareas solo pueden asignarse a programadores o diseñadores');
    }
  }

  return {
    list: async (request, response) => {
      const tasks = await taskRepository.findVisibleForUser(request.user);
      response.json({
        data: tasks,
        message: 'Tareas obtenidas correctamente'
      });
    },
    create: async (request, response) => {
      if (['PROGRAMADOR', 'DISEÑADOR'].includes(request.user.role)) {
        throw new HttpError(403, 'TASK_CREATE_DENIED', 'Los trabajadores no pueden crear tareas');
      }
      const { title, description = '', projectId = null, assigneeId = null } = request.body;
      if (typeof title !== 'string' || !title.trim()) {
        throw new HttpError(400, 'INVALID_TASK_INPUT', 'El título de la tarea es obligatorio');
      }
      await validateAssignee(assigneeId);
      const task = await taskRepository.create({
        id: randomUUID(),
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        projectId,
        assigneeId,
        status: 'TODO',
        isDeleted: false,
        createdBy: request.user.id,
        createdAt: new Date().toISOString()
      });
      response.status(201).json({ data: task, message: 'Tarea creada correctamente' });
    },
    updateStatus: async (request, response) => {
      const allowedStatuses = ['TODO', 'IN_PROGRESS', 'PENDING_REVIEW', 'COMPLETED'];
      const { status } = request.body;
      if (!allowedStatuses.includes(status)) {
        throw new HttpError(400, 'INVALID_TASK_STATUS', 'El estado de la tarea no es válido');
      }
      const workerRoles = ['PROGRAMADOR', 'DISEÑADOR'];
      const reviewerRoles = ['ADMINISTRADOR', 'LIDER'];
      if (workerRoles.includes(request.user.role) && status !== 'PENDING_REVIEW') {
        throw new HttpError(403, 'TASK_REVIEW_REQUIRED', 'La tarea debe pasar por revisión antes de aprobarse');
      }
      if (status === 'COMPLETED' && !reviewerRoles.includes(request.user.role)) {
        throw new HttpError(403, 'TASK_APPROVAL_REQUIRED', 'Solo un líder o administrador puede aprobar la tarea');
      }
      const existingTask = await taskRepository.findById(request.params.id);
      if (!existingTask) throw new HttpError(404, 'TASK_NOT_FOUND', 'La tarea no existe');
      if (workerRoles.includes(request.user.role) && existingTask.assigneeId !== request.user.id) {
        throw new HttpError(403, 'TASK_ACCESS_DENIED', 'Solo puedes actualizar tus tareas asignadas');
      }
      const task = await taskRepository.updateStatus(request.params.id, status);
      if (!task) {
        throw new HttpError(404, 'TASK_NOT_FOUND', 'La tarea no existe');
      }
      response.json({ data: task, message: 'Estado actualizado correctamente' });
    },
    update: async (request, response) => {
      if (['PROGRAMADOR', 'DISEÑADOR'].includes(request.user.role)) {
        throw new HttpError(403, 'TASK_UPDATE_DENIED', 'Los trabajadores no pueden editar tareas');
      }
      const { title, description = '', projectId = null, assigneeId = null } = request.body;
      if (typeof title !== 'string' || !title.trim()) {
        throw new HttpError(400, 'INVALID_TASK_INPUT', 'El título de la tarea es obligatorio');
      }
      await validateAssignee(assigneeId);
      const existingTask = await taskRepository.findById(request.params.id);
      if (!existingTask) throw new HttpError(404, 'TASK_NOT_FOUND', 'La tarea no existe');
      if (['PROGRAMADOR', 'DISEÑADOR'].includes(request.user.role) && existingTask.assigneeId !== request.user.id) {
        throw new HttpError(403, 'TASK_ACCESS_DENIED', 'Solo puedes modificar tus tareas asignadas');
      }
      const task = await taskRepository.updateById(request.params.id, {
        title: title.trim(),
        description: typeof description === 'string' ? description.trim() : '',
        projectId,
        assigneeId
      });
      if (!task) {
        throw new HttpError(404, 'TASK_NOT_FOUND', 'La tarea no existe');
      }
      response.json({ data: task, message: 'Tarea actualizada correctamente' });
    },
    remove: async (request, response) => {
      if (!['ADMINISTRADOR', 'LIDER'].includes(request.user.role)) {
        throw new HttpError(403, 'TASK_DELETE_DENIED', 'Solo un líder o administrador puede eliminar tareas');
      }
      const deleted = await taskRepository.deleteById(request.params.id);
      if (!deleted) {
        throw new HttpError(404, 'TASK_NOT_FOUND', 'La tarea no existe');
      }
      response.status(204).send();
    }
  };
}