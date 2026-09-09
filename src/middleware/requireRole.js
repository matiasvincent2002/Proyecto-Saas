import { HttpError } from '../utils/httpError.js';

export function requireRole(...allowedRoles) {
  return (request, _response, next) => {
    if (!allowedRoles.includes(request.user?.role)) {
      return next(new HttpError(403, 'INSUFFICIENT_PERMISSIONS', 'No tienes permisos para realizar esta acción'));
    }
    return next();
  };
}