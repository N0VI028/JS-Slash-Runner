const generateCustomSpacing = () => {
  const spacing = {
    0: '0px',
  };

  const baseStep = 0.25;
  const maxMultiplier = 10; // 生成最大到 10 的间距

  for (let i = baseStep; i <= maxMultiplier; i += baseStep) {
    const key = i.toFixed(2).replace(/\.00$/, '');

    spacing[key] = `calc(${i} * var(--spacing))`;
  }

  return spacing;
};

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,vue,ts}'],

  darkMode: 'class',
  theme: {
    spacing: generateCustomSpacing(),
    extend: {},
  },
  variants: {
    extend: {},
  },
  plugins: [],
};
