export function createCors(allowedOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173') {
  return (request, response, next) => {
    const origin = request.get('origin');
    if (origin && origin === allowedOrigin) {
      response.setHeader('Access-Control-Allow-Origin', origin);
      response.setHeader('Vary', 'Origin');
      response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      response.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    }
    if (request.method === 'OPTIONS') return response.status(204).send();
    return next();
  };
}