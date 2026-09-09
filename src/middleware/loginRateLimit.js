export function createLoginRateLimit({ maxAttempts = 5, windowMilliseconds = 15 * 60 * 1000 } = {}) {
  const attempts = new Map();

  return (request, response, next) => {
    const key = `${request.ip}:${String(request.body?.email ?? '').toLowerCase()}`;
    const now = Date.now();
    const recentAttempts = (attempts.get(key) ?? []).filter((timestamp) => now - timestamp < windowMilliseconds);
    if (recentAttempts.length >= maxAttempts) {
      return response.status(429).json({
        error: {
          code: 'LOGIN_RATE_LIMITED',
          message: 'Demasiados intentos de inicio de sesión. Inténtalo más tarde.',
          details: {}
        }
      });
    }
    recentAttempts.push(now);
    attempts.set(key, recentAttempts);
    return next();
  };
}