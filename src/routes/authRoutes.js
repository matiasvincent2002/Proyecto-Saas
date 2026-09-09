import { Router } from 'express';

export function createAuthRoutes(controller, authenticate, loginRateLimit) {
  const router = Router();
  router.post('/login', loginRateLimit, controller.login);
  router.post('/logout', authenticate, controller.logout);
  router.get('/me', authenticate, controller.me);
  router.post('/change-password', authenticate, controller.changePassword);
  return router;
}
