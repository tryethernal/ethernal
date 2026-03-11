/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#3D95CE',
        'primary-light': '#5DAAE0',
        accent: '#29648E',
        'bg-base': 'var(--bg-base)',
        'bg-card': 'var(--bg-card)',
        'bg-card-hover': 'var(--bg-card-hover)',
        'bg-surface': 'var(--bg-surface)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-muted': 'var(--text-muted)',
        'border-subtle': 'var(--border-subtle)',
      },
      fontFamily: {
        heading: ['Exo', 'sans-serif'],
        body: ['Roboto', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--prose-body)',
            '--tw-prose-headings': 'var(--text-primary)',
            '--tw-prose-lead': 'var(--text-secondary)',
            '--tw-prose-links': '#3D95CE',
            '--tw-prose-bold': 'var(--text-primary)',
            '--tw-prose-counters': 'var(--text-muted)',
            '--tw-prose-bullets': 'var(--text-muted)',
            '--tw-prose-hr': 'var(--border-subtle)',
            '--tw-prose-quotes': 'var(--text-secondary)',
            '--tw-prose-quote-borders': '#3D95CE',
            '--tw-prose-code': 'var(--text-primary)',
            '--tw-prose-pre-code': 'var(--prose-body)',
            '--tw-prose-pre-bg': 'var(--prose-pre-bg)',
            '--tw-prose-th-borders': 'var(--border-subtle)',
            '--tw-prose-td-borders': 'var(--border-subtle)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
