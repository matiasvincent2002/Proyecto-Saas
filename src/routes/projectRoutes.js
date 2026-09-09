import { Router } from 'express';

export function createProjectRoutes(controller, authenticate) {
  const router = Router();
  router.get('/', authenticate, controller.list);
  router.post('/', authenticate, controller.create);
  router.put('/:id', authenticate, controller.update);
  router.delete('/:id', authenticate, controller.remove);
  return router;
}