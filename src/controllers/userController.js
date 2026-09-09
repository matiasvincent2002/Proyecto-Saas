import { randomUUID } from 'node:crypto';
import { hashPassword } from '../auth/password.js';
import { HttpError } from '../utils/httpError.js';

export function createUserController(userRepository, toPublicUser) {
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
      const allowedRoles = ['LIDER', 'PROGRAMADOR', 'DISEÑADOR'];
      if (!name?.trim() || !email?.trim() || !password || !allowedRoles.includes(role)) {
        throw new HttpError(400, 'INVALID_USER_INPUT', 'Nombre, email, contraseña y rol son obligatorios');
      }
      if (await userRepository.findByEmail(email.trim().toLowerCase())) {
        throw new HttpError(409, 'EMAIL_ALREADY_EXISTS', 'El email ya está registrado');
      }
      const now = new Date().toISOString();
      const user = await userRepository.create({
        id: randomUUID(),
        name: name.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: await hashPassword(password),
        role,
        isActive: true,
        isDeleted: false,
        leaderId: null,
        createdBy: request.user.id,
        createdAt: now,
        updatedAt: now
      });
      response.status(201).json({ data: toPublicUser(user), message: 'Usuario creado correctamente' });
    }
  };
}