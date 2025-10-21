/**
 * 使用 gamma 校正的公式计算颜色的相对亮度 (心理亮度)
 *
 * @param r 红色分量 (0-255)
 * @param g 绿色分量 (0-255)
 * @param b 蓝色分量 (0-255)
 * @returns 亮度值 (0-1)
 */
export const calculateLightness = (r: number, g: number, b: number): number => {
  const GAMMA = 2.2;
  const K = 0.547373141;

  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  const physicalLuminance = Math.pow(rNorm, GAMMA) + Math.pow(1.5 * gNorm, GAMMA) + Math.pow(0.6 * bNorm, GAMMA);

  return K * Math.pow(physicalLuminance, 1 / GAMMA);
};

/**
 * 将 RGB 转换为灰度值 (0-255)
 * 基于相同的 gamma 校正公式
 *
 * @param r 红色分量 (0-255)
 * @param g 绿色分量 (0-255)
 * @param b 蓝色分量 (0-255)
 * @returns 灰度值 (0-255)
 */
export const rgb2gray = (r: number, g: number, b: number): number => {
  const GAMMA = 2.2;
  const K = 0.547373141;

  const physicalLuminance = Math.pow(r, GAMMA) + Math.pow(1.5 * g, GAMMA) + Math.pow(0.6 * b, GAMMA);

  return Math.round(K * Math.pow(physicalLuminance, 1 / GAMMA));
};

/**
 * 根据 RGBA 分量判断文本颜色
 *
 * @param r 红色分量 (0-255)
 * @param g 绿色分量 (0-255)
 * @param b 蓝色分量 (0-255)
 * @param a 透明度 (0-1), 默认为 1
 * @returns 'black' | 'white'
 */
export const determineTextColorFromRgba = (r: number, g: number, b: number, a: number = 1): 'black' | 'white' => {
  const lightness = calculateLightness(r, g, b);
  return lightness > 0.62 ? 'black' : a < 0.4 ? 'black' : 'white';
};

/**
 * 解析 CSS 颜色值字符串
 * @returns [r, g, b, a] 或 null (解析失败)
 */
export const parseCssColor = (colorStr: string): [number, number, number, number] | null => {
  const trimmed = colorStr.trim();

  const rgbaMatch = trimmed.match(/^rgba?\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*([\d.]+)\s*)?\)$/i);
  if (rgbaMatch) {
    return [
      parseInt(rgbaMatch[1], 10),
      parseInt(rgbaMatch[2], 10),
      parseInt(rgbaMatch[3], 10),
      rgbaMatch[4] ? parseFloat(rgbaMatch[4]) : 1,
    ];
  }

  return null;
};

export const getSmartThemeQuoteColor = (): string => {
  return getComputedStyle(document.documentElement).getPropertyValue('--SmartThemeQuoteColor').trim();
};

let cachedTextColor: 'black' | 'white';
export const getSmartThemeQuoteTextColor = (): 'black' | 'white' | 'inherit' => {
  if (!cachedTextColor) {
    const currentColor = getSmartThemeQuoteColor();
    const rgba = parseCssColor(currentColor);
    if (!rgba) {
      return 'inherit';
    }
    const textColor = determineTextColorFromRgba(...rgba);
    cachedTextColor = textColor;
  }
  return cachedTextColor;
};
