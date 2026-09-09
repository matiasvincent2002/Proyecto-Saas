export function createAuthenticate(authService) {
  return async (request, _response, next) => {
    try {
      const authorization = request.get('authorization') ?? '';
      const [scheme, token] = authorization.split(' ');
      if (scheme !== 'Bearer' || !token) {
        return next(new Error('AUTHENTICATION_REQUIRED'));
      }

      const authenticated = await authService.authenticate(token);
      request.authToken = token;
      request.user = authenticated.user;
      request.session = authenticated.session;
      return next();
    } catch (error) {
      return next(error);
    }
  };
}
