import { Router } from 'express';

export function createUserRoutes(controller, authenticate, requireAdmin) {
  const router = Router();
  router.get('/', authenticate, controller.list);
  router.post('/', authenticate, requireAdmin, controller.create);
  return router;
}