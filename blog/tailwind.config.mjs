/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        primary: '#3D95CE',
        'primary-light': '#5DAAE0',
        accent: '#29648E',
        'bg-base': '#0B1120',
        'bg-card': '#111827',
        'bg-card-hover': '#1a2234',
        'bg-surface': '#151d2e',
        'text-primary': '#F1F5F9',
        'text-secondary': '#94A3B8',
        'text-muted': '#64748B',
        'border-subtle': 'rgba(61, 149, 206, 0.22)',
      },
      fontFamily: {
        heading: ['Exo', 'sans-serif'],
        body: ['Roboto', 'sans-serif'],
      },
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': '#CBD5E1',
            '--tw-prose-headings': '#F1F5F9',
            '--tw-prose-lead': '#94A3B8',
            '--tw-prose-links': '#3D95CE',
            '--tw-prose-bold': '#F1F5F9',
            '--tw-prose-counters': '#64748B',
            '--tw-prose-bullets': '#64748B',
            '--tw-prose-hr': 'rgba(61, 149, 206, 0.22)',
            '--tw-prose-quotes': '#94A3B8',
            '--tw-prose-quote-borders': '#3D95CE',
            '--tw-prose-code': '#F1F5F9',
            '--tw-prose-pre-code': '#CBD5E1',
            '--tw-prose-pre-bg': '#0f172a',
            '--tw-prose-th-borders': 'rgba(61, 149, 206, 0.22)',
            '--tw-prose-td-borders': 'rgba(61, 149, 206, 0.12)',
          },
        },
      },
    },
  },
  plugins: [
    require('@tailwindcss/typography'),
  ],
};
