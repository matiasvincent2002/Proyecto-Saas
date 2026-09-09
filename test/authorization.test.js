import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskController } from '../src/controllers/taskController.js';
import { requireRole } from '../src/middleware/requireRole.js';

test('requireRole rechaza usuarios fuera del rol permitido', () => {
  let receivedError;
  requireRole('ADMINISTRADOR')({ user: { role: 'PROGRAMADOR' } }, {}, (error) => {
    receivedError = error;
  });

  assert.equal(receivedError.code, 'INSUFFICIENT_PERMISSIONS');
  assert.equal(receivedError.status, 403);
});

test('requireRole permite el rol configurado', () => {
  let nextCalled = false;
  requireRole('LIDER')({ user: { role: 'LIDER' } }, {}, () => {
    nextCalled = true;
  });

  assert.equal(nextCalled, true);
});

test('no permite asignar una tarea a un líder', async () => {
  const controller = createTaskController(
    { async create() { throw new Error('No debería crear la tarea'); } },
    { async findById() { return { id: 'leader-1', role: 'LIDER' }; } },
    { async findById() { return null; } }
  );
  const request = {
    user: { id: 'admin-1', role: 'ADMINISTRADOR' },
    body: { title: 'Tarea inválida', assigneeId: 'leader-1' }
  };

  await assert.rejects(
    () => controller.create(request, {}),
    { code: 'INVALID_TASK_ASSIGNEE', status: 400 }
  );
});