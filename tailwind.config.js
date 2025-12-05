/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      boxShadow: {
        glow: '0 10px 60px rgba(16, 185, 129, 0.25), 0 0 0 1px rgba(255,255,255,0.04)'
      },
      backgroundImage: {
        mesh: 'radial-gradient(circle at 20% 20%, rgba(94, 234, 212, 0.08), transparent 26%), radial-gradient(circle at 70% 10%, rgba(129, 140, 248, 0.09), transparent 30%), radial-gradient(circle at 80% 80%, rgba(52, 211, 153, 0.12), transparent 22%)'
      }
    }
  },
  plugins: []
};
