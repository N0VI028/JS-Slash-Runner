const generateCustomSpacing = () => {
  const spacing = {
    0: '0px',
  };

  const base_step = 0.25;
  const max_multiplier = 10; // 生成最大到 10 的间距

  for (let i = base_step; i <= max_multiplier; i += base_step) {
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
