import express from 'express';
import { authController, authenticate, projectController, requireAdmin, taskController, userController } from './container.js';
import { createAuthRoutes } from './routes/authRoutes.js';
import { createUserRoutes } from './routes/userRoutes.js';
import { createProjectRoutes } from './routes/projectRoutes.js';
import { createTaskRoutes } from './routes/taskRoutes.js';

const app = express();

app.use(express.json());

app.use('/api/v1/auth', createAuthRoutes(authController, authenticate));
app.use('/api/v1/users', createUserRoutes(userController, authenticate, requireAdmin));
app.use('/api/v1/projects', createProjectRoutes(projectController, authenticate));
app.use('/api/v1/tasks', createTaskRoutes(taskController, authenticate));

app.get('/api/v1/health', (_request, response) => {
  response.json({
    data: { status: 'ok' },
    message: 'Backend disponible'
  });
});

app.use((error, _request, response, _next) => {
  if (error.message === 'AUTHENTICATION_REQUIRED') {
    return response.status(401).json({
      error: {
        code: 'AUTHENTICATION_REQUIRED',
        message: 'Se requiere autenticación',
        details: {}
      }
    });
  }

  const status = error.status ?? 500;
  return response.status(status).json({
    error: {
      code: error.code ?? 'INTERNAL_SERVER_ERROR',
      message: status === 500 ? 'Error interno del servidor' : error.message,
      details: error.details ?? {}
    }
  });
});

export default app;
