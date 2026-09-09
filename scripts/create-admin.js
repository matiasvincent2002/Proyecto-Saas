import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { randomUUID } from 'node:crypto';
import { hashPassword } from '../src/auth/password.js';
import { UserRepository } from '../src/repositories/json/userRepository.js';

const userRepository = new UserRepository();
const administratorCount = await userRepository.countAdministrators();
if (administratorCount > 0) {
  throw new Error('Ya existe un administrador. El comando no puede ejecutarse nuevamente.');
}

const readline = createInterface({ input, output });
try {
  const name = (await readline.question('Nombre completo: ')).trim();
  const email = (await readline.question('Correo: ')).trim().toLowerCase();
  const password = await readline.question('Contraseña: ', { mask: '*' });

  if (!name || !email || !password) {
    throw new Error('Nombre, correo y contraseña son obligatorios.');
  }

  await userRepository.create({
    id: randomUUID(),
    name,
    email,
    passwordHash: await hashPassword(password),
    role: 'ADMINISTRADOR',
    isActive: true,
    isDeleted: false,
    leaderId: null,
    createdBy: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });

  console.log('Administrador creado correctamente.');
} finally {
  readline.close();
}
