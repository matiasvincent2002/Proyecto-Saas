import path from 'node:path';

const sessionTtlHours = Number(process.env.SESSION_TTL_HOURS ?? 8);

if (!Number.isFinite(sessionTtlHours) || sessionTtlHours <= 0) {
  throw new Error('SESSION_TTL_HOURS debe ser un número mayor que cero');
}

export const config = {
  dataDirectory: path.resolve(process.env.DATA_DIRECTORY ?? './data'),
  sessionTtlMilliseconds: sessionTtlHours * 60 * 60 * 1000
};
