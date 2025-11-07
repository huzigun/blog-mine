export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth();

  if (import.meta.server) {
    const refreshToken = useCookie('refresh_token');

    if (!refreshToken.value) {
      return navigateTo('/membership/login');
    }

    const accessToken = await useRefreshToken(refreshToken.value);
    if (!accessToken) {
      return navigateTo('/membership/login');
    }

    auth.setAccessToken(accessToken);

    const result = await auth.fetchUser();

    if (!result) {
      return navigateTo('/membership/login');
    }

    auth.setUser(result);
  }

  if (import.meta.client) {
    if (!auth.accessToken) {
      return navigateTo('/membership/login');
    }

    if (!auth.user) {
      const result = await auth.fetchUser();
      if (!result) {
        return navigateTo('/membership/login');
      }

      auth.setUser(result);
    }
  }
});
