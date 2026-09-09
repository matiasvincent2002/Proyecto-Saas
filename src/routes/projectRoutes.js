import { Router } from 'express';

export function createProjectRoutes(controller, authenticate, requireProjectManager) {
  const router = Router();
  router.get('/', authenticate, controller.list);
  router.post('/', authenticate, requireProjectManager, controller.create);
  router.put('/:id', authenticate, requireProjectManager, controller.update);
  router.delete('/:id', authenticate, requireProjectManager, controller.remove);
  return router;
}