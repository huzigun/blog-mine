export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth();

  if (import.meta.server) {
    const refreshToken = useCookie('refresh_token');

    if (refreshToken.value) {
      const accessToken = await useRefreshToken(refreshToken.value);
      if (accessToken) {
        auth.setAccessToken(accessToken);
        const user = await auth.fetchUser();
        if (user) {
          auth.setUser(user);
        }
      }
    }
  }
});
