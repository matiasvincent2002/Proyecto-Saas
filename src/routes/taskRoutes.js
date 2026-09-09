import { Router } from 'express';

export function createTaskRoutes(controller, authenticate) {
  const router = Router();
  router.get('/', authenticate, controller.list);
  router.post('/', authenticate, controller.create);
  router.patch('/:id/status', authenticate, controller.updateStatus);
  router.put('/:id', authenticate, controller.update);
  router.delete('/:id', authenticate, controller.remove);
  return router;
}