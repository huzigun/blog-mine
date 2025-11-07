export default defineNuxtRouteMiddleware((to, from) => {
  const auth = useAuth();

  // If user is authenticated and trying to access login/register page
  if (
    auth.isAuthenticated &&
    (to.path === '/membership/login' || to.path === '/membership/register')
  ) {
    return navigateTo('/');
  }
});
