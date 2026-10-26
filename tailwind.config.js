/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#0F8B8D',
          'teal-dark': '#0B6B6D',
          'teal-light': '#E6F4F4',
          navy: '#1B2A41',
          'navy-light': '#2B3F5E',
          coral: '#FF7A66',
          'coral-dark': '#E5634F',
          'coral-light': '#FFF0ED',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F4F7F8',
          dark: '#121C2B',
          'dark-card': '#1B2A41',
        },
        status: {
          success: '#2E9E6B',
          'success-bg': '#EAF6F0',
          warning: '#E0A100',
          'warning-bg': '#FDF6E2',
          urgent: '#D9534F',
          'urgent-bg': '#FDF0EF',
        },
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        btn: '12px',
      },
      boxShadow: {
        soft: '0 4px 20px -2px rgba(27, 42, 65, 0.06), 0 2px 6px -1px rgba(27, 42, 65, 0.04)',
        'soft-lg': '0 10px 30px -4px rgba(27, 42, 65, 0.10), 0 4px 10px -2px rgba(27, 42, 65, 0.05)',
      },
    },
  },
  plugins: [],
};
