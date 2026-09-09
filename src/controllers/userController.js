import { randomUUID } from 'node:crypto';
import { hashPassword } from '../auth/password.js';
import { HttpError } from '../utils/httpError.js';

export function createUserController(userRepository, toPublicUser) {
  const allowedRoles = ['LIDER', 'PROGRAMADOR', 'DISEÑADOR'];

  async function validateLeader(leaderId) {
    if (!leaderId) return;
    const leader = await userRepository.findById(leaderId);
    if (!leader || leader.role !== 'LIDER') {
      throw new HttpError(400, 'INVALID_LEADER', 'El responsable debe ser un líder válido');
    }
  }

  return {
    list: async (_request, response) => {
      const users = await userRepository.findAll();
      response.json({
        data: users.map(toPublicUser),
        message: 'Usuarios obtenidos correctamente'
      });
    },
    create: async (request, response) => {
      const { name, email, password, role } = request.body;
      if (!name?.trim() || !email?.trim() || !password || !allowedRoles.includes(role)) {
        throw new HttpError(400, 'INVALID_USER_INPUT', 'Nombre, email, contraseña y rol son obligatorios');
      }
      if (await userRepository.findByEmail(email.trim().toLowerCase())) {
        throw new HttpError(409, 'EMAIL_ALREADY_EXISTS', 'El email ya está registrado');
      }
      const leaderId = role === 'LIDER' ? null : (request.body.leaderId || null);
      await validateLeader(leaderId);
      const now = new Date().toISOString();
      const user = await userRepository.create({
        id: randomUUID(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: await hashPassword(password),
        role,
        isActive: true,
        isDeleted: false,
        leaderId,
        createdBy: request.user.id,
        createdAt: now,
        updatedAt: now
      });
      response.status(201).json({ data: toPublicUser(user), message: 'Usuario creado correctamente' });
    },
    update: async (request, response) => {
      const existingUser = await userRepository.findById(request.params.id);
      if (!existingUser) throw new HttpError(404, 'USER_NOT_FOUND', 'El usuario no existe');
      const { name, email, role, leaderId = null, password } = request.body;
      if (!name?.trim() || !email?.trim() || !allowedRoles.includes(role)) {
        throw new HttpError(400, 'INVALID_USER_INPUT', 'Nombre, email y rol son obligatorios');
      }
      const normalizedEmail = email.trim().toLowerCase();
      const duplicate = await userRepository.findByEmail(normalizedEmail);
      if (duplicate && duplicate.id !== existingUser.id) {
        throw new HttpError(409, 'EMAIL_ALREADY_EXISTS', 'El email ya está registrado');
      }
      const normalizedLeaderId = role === 'LIDER' ? null : leaderId;
      await validateLeader(normalizedLeaderId);
      const changes = {
        name: name.trim(),
        email: normalizedEmail,
        role,
        leaderId: normalizedLeaderId
      };
      if (password) changes.passwordHash = await hashPassword(password);
      const user = await userRepository.updateById(existingUser.id, changes);
      response.json({ data: toPublicUser(user), message: 'Usuario actualizado correctamente' });
    },
    toggleActive: async (request, response) => {
      const existingUser = await userRepository.findById(request.params.id);
      if (!existingUser) throw new HttpError(404, 'USER_NOT_FOUND', 'El usuario no existe');
      if (existingUser.id === request.user.id) {
        throw new HttpError(400, 'SELF_STATUS_CHANGE_DENIED', 'No puedes cambiar tu propio estado');
      }
      const user = await userRepository.updateById(existingUser.id, { isActive: !existingUser.isActive });
      response.json({ data: toPublicUser(user), message: user.isActive ? 'Usuario activado' : 'Usuario desactivado' });
    },
    remove: async (request, response) => {
      const existingUser = await userRepository.findById(request.params.id);
      if (!existingUser) throw new HttpError(404, 'USER_NOT_FOUND', 'El usuario no existe');
      if (existingUser.id === request.user.id) {
        throw new HttpError(400, 'SELF_DELETE_DENIED', 'No puedes eliminar tu propio usuario');
      }
      if (existingUser.role === 'ADMINISTRADOR' && await userRepository.countAdministrators() <= 1) {
        throw new HttpError(400, 'LAST_ADMIN_DENIED', 'No puedes eliminar al último administrador');
      }
      await userRepository.deleteById(existingUser.id);
      response.status(204).send();
    }
  };
}