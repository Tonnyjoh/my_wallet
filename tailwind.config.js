/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f5f7fa',
          100: '#ebeef3',
          200: '#d2dae5',
          300: '#aab9ce',
          400: '#7c93b2',
          500: '#5a7398',
          600: '#475b7e',
          700: '#3a4a66',
          800: '#323f56',
          900: '#2d374a',
        },
      },
    },
  },
  plugins: [],
}
