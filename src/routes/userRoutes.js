import { Router } from 'express';

export function createUserRoutes(controller, authenticate, requireAdmin) {
  const router = Router();
  router.get('/', authenticate, controller.list);
  router.post('/', authenticate, requireAdmin, controller.create);
  router.put('/:id', authenticate, requireAdmin, controller.update);
  router.patch('/:id/active', authenticate, requireAdmin, controller.toggleActive);
  router.delete('/:id', authenticate, requireAdmin, controller.remove);
  return router;
}