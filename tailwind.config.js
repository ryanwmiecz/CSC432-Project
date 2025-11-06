/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#2D3142',
        'secondary': '#BFC0C0',
        'accent': '#EF8354',
        'medium-blue': '#4F5D75',
      },
      spacing: {
        // Custom spacing for easy adjustment
        'tight': '0.375rem',  // 6px - tighter than default
        'compact': '0.75rem', // 12px
      },
      borderRadius: {
        'card': '1rem',       // 16px for cards
        'input': '0.5rem',    // 8px for inputs
        'button': '0.5rem',   // 8px for buttons
      },
      boxShadow: {
        'message-left': '-2px 2px 8px rgba(0, 0, 0, 0.15)',
        'message-right': '2px 2px 8px rgba(0, 0, 0, 0.15)',
        'card': '0 4px 6px rgba(0, 0, 0, 0.1)',
      },
    },
  },
  plugins: [],
}
