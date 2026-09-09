import test from 'node:test';
import assert from 'node:assert/strict';
import { createTaskController } from '../src/controllers/taskController.js';
import { requireRole } from '../src/middleware/requireRole.js';
import { createLoginRateLimit } from '../src/middleware/loginRateLimit.js';

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

test('exige un motivo al devolver una tarea en revisión', async () => {
  const controller = createTaskController(
    {
      async findById() { return { id: 'task-1', status: 'PENDING_REVIEW', assigneeId: 'worker-1' }; },
      async updateStatus() { throw new Error('No debería actualizar sin motivo'); }
    },
    { async findById() { return { id: 'worker-1', role: 'PROGRAMADOR' }; } },
    { async findById() { return null; } }
  );

  await assert.rejects(
    () => controller.updateStatus({ params: { id: 'task-1' }, user: { id: 'leader-1', role: 'LIDER' }, body: { status: 'IN_PROGRESS' } }, {}),
    { code: 'REVIEW_REASON_REQUIRED', status: 400 }
  );
});

test('un líder no puede asignar tareas fuera de su equipo', async () => {
  const controller = createTaskController(
    { async create() { throw new Error('No debería crear la tarea'); } },
    { async findById() { return { id: 'worker-1', role: 'PROGRAMADOR', leaderId: 'other-leader' }; } },
    { async findById() { return null; } }
  );

  await assert.rejects(
    () => controller.create({ user: { id: 'leader-1', role: 'LIDER' }, body: { title: 'Fuera de equipo', assigneeId: 'worker-1' } }, {}),
    { code: 'ASSIGNEE_OUTSIDE_TEAM', status: 403 }
  );
});

test('limita los intentos repetidos de login', () => {
  const middleware = createLoginRateLimit({ maxAttempts: 2, windowMilliseconds: 60_000 });
  const request = { ip: '127.0.0.1', body: { email: 'test@example.com' } };
  const responses = [];
  const response = { status(code) { responses.push(code); return this; }, json() { return this; } };
  middleware(request, response, () => {});
  middleware(request, response, () => {});
  middleware(request, response, () => {});
  assert.deepEqual(responses, [429]);
});