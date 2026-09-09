import { UserRepository } from './repositories/json/userRepository.js';
import { ProjectRepository } from './repositories/json/projectRepository.js';
import { TaskRepository } from './repositories/json/taskRepository.js';
import { SessionRepository } from './repositories/json/sessionRepository.js';
import { AuthService } from './services/authService.js';
import { createAuthController } from './controllers/authController.js';
import { createUserController } from './controllers/userController.js';
import { createProjectController } from './controllers/projectController.js';
import { createTaskController } from './controllers/taskController.js';
import { createAuthenticate } from './middleware/authenticate.js';
import { requireRole } from './middleware/requireRole.js';

const userRepository = new UserRepository();
const projectRepository = new ProjectRepository();
const taskRepository = new TaskRepository();
const sessionRepository = new SessionRepository();
const authService = new AuthService(userRepository, sessionRepository);

export const authController = createAuthController(authService);
export const userController = createUserController(userRepository, (user) => authService.toPublicUser(user));
export const projectController = createProjectController(projectRepository);
export const taskController = createTaskController(taskRepository, userRepository);
export const authenticate = createAuthenticate(authService);
export const requireAdmin = requireRole('ADMINISTRADOR');
