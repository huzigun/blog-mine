import theme from '~/theme';

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brand',
      secondary: 'purple',
      neutral: 'zinc',
    },
    theme: {
      colors: [
        'primary',
        'brand',
        'secondary',
        'info',
        'success',
        'warning',
        'error',
      ],
    },
    ...theme,
  },
});
