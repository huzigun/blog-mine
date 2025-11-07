export default defineNuxtRouteMiddleware(async (to, from) => {
  const auth = useAuth();

  if (!auth.accessToken) {
    return navigateTo('/auth/login', { redirectCode: 302 });
  }

  if (!auth.user) {
    const result = await auth.fetchUser();
    if (!result) {
      return navigateTo('/auth/login', { redirectCode: 302 });
    }

    auth.setUser(result);
  }
});
