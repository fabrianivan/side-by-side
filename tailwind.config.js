/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          teal: '#0F8B8D',
          // Sedikit lebih pekat dari teal utama: dipakai untuk isian tombol agar teks putih lolos WCAG AA (≥ 4.5:1).
          'teal-strong': '#0C7B7D',
          'teal-dark': '#0B6B6D',
          'teal-light': '#E6F4F4',
          'teal-soft': '#F2F9F9',
          navy: '#1B2A41',
          'navy-light': '#2B3F5E',
          'navy-deep': '#131F31',
          coral: '#FF7A66',
          'coral-dark': '#E5634F',
          'coral-light': '#FFF0ED',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          muted: '#F4F7F8',
          dark: '#0F1826',
          'dark-card': '#182436',
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
      // Skala tipografi: ukuran kecil dinaikkan sedikit agar nyaman dibaca di ponsel,
      // judul dirapatkan (tracking negatif) agar terasa lebih tegas.
      fontSize: {
        '3xs': ['0.6875rem', { lineHeight: '1rem' }],
        '2xs': ['0.75rem', { lineHeight: '1.125rem' }],
        xs: ['0.8125rem', { lineHeight: '1.25rem' }],
        sm: ['0.9375rem', { lineHeight: '1.4375rem' }],
        base: ['1rem', { lineHeight: '1.5rem' }],
        lg: ['1.125rem', { lineHeight: '1.625rem', letterSpacing: '-0.005em' }],
        xl: ['1.3125rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
        '2xl': ['1.5625rem', { lineHeight: '1.9375rem', letterSpacing: '-0.015em' }],
        '3xl': ['1.9375rem', { lineHeight: '2.3125rem', letterSpacing: '-0.02em' }],
        '4xl': ['2.375rem', { lineHeight: '2.75rem', letterSpacing: '-0.025em' }],
      },
      borderRadius: {
        card: '20px',
        btn: '12px',
      },
      boxShadow: {
        xs: '0 1px 2px rgba(27, 42, 65, 0.06)',
        soft: '0 1px 2px rgba(27, 42, 65, 0.04), 0 8px 24px -14px rgba(27, 42, 65, 0.14)',
        'soft-lg': '0 2px 4px rgba(27, 42, 65, 0.04), 0 22px 44px -20px rgba(27, 42, 65, 0.24)',
        btn: '0 1px 2px rgba(11, 107, 109, 0.20), 0 6px 14px -8px rgba(11, 107, 109, 0.50)',
        sheet: '0 -12px 40px -12px rgba(19, 31, 49, 0.28)',
      },
      keyframes: {
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'sheet-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
      },
      animation: {
        // 'backwards' (bukan 'both'): transform dilepas setelah animasi selesai agar modal `fixed` di dalam halaman tetap menempel ke layar.
        'rise-in': 'rise-in 280ms cubic-bezier(0.22, 1, 0.36, 1) backwards',
        'sheet-up': 'sheet-up 260ms cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 180ms ease-out both',
      },
    },
  },
  plugins: [],
};
