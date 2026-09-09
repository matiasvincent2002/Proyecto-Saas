export function createAuthController(authService) {
  return {
    login: async (request, response) => {
      const { email, password } = request.body;
      const result = await authService.login(email, password);
      response.json({ data: result, message: 'Inicio de sesión correcto' });
    },

    logout: async (request, response) => {
      await authService.logout(request.authToken);
      response.status(204).send();
    },

    me: async (request, response) => {
      response.json({
        data: authService.toPublicUser(request.user),
        message: 'Usuario autenticado'
      });
    }
  };
}
