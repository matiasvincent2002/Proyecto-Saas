import { Router } from 'express';

export function createAuthRoutes(controller, authenticate) {
  const router = Router();
  router.post('/login', controller.login);
  router.post('/logout', authenticate, controller.logout);
  router.get('/me', authenticate, controller.me);
  return router;
}
