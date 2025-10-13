/**
 * 使用 gamma 校正的公式计算颜色的相对亮度（心理亮度）
 *
 * 公式基于 sRGB 色彩空间特性：
 * - RGB 三原色心理亮度比为 1:1.5:0.6
 * - gamma 值为 2.2
 * - k = (1 / (1 + 1.5^2.2 + 0.6^2.2))^(1/2.2) ≈ 0.547373
 *
 * L = k * [(R/255)^2.2 + (1.5*G/255)^2.2 + (0.6*B/255)^2.2]^(1/2.2)
 *
 * @param {number} r - 红色分量 (0-255)
 * @param {number} g - 绿色分量 (0-255)
 * @param {number} b - 蓝色分量 (0-255)
 * @returns {number} 亮度值 (0-1)
 */
export const calculateLightness = (r: number, g: number, b: number): number => {
  const GAMMA = 2.2;
  const K = 0.547373141;

  // 归一化到 0-1 范围
  const rNorm = r / 255;
  const gNorm = g / 255;
  const bNorm = b / 255;

  // 计算物理亮度的加权和
  const physicalLuminance =
    Math.pow(rNorm, GAMMA) +
    Math.pow(1.5 * gNorm, GAMMA) +
    Math.pow(0.6 * bNorm, GAMMA);

  // 转换为心理亮度
  return K * Math.pow(physicalLuminance, 1 / GAMMA);
};

/**
 * 将 RGB 转换为灰度值 (0-255)
 * 基于相同的 gamma 校正公式
 *
 * @param {number} r - 红色分量 (0-255)
 * @param {number} g - 绿色分量 (0-255)
 * @param {number} b - 蓝色分量 (0-255)
 * @returns {number} 灰度值 (0-255)
 */
export const rgb2gray = (r: number, g: number, b: number): number => {
  const GAMMA = 2.2;
  const K = 0.547373141;

  // 直接在 0-255 范围计算
  const physicalLuminance =
    Math.pow(r, GAMMA) +
    Math.pow(1.5 * g, GAMMA) +
    Math.pow(0.6 * b, GAMMA);

  return Math.round(K * Math.pow(physicalLuminance, 1 / GAMMA));
};

/**
 * 根据 RGBA 分量判断文本颜色
 *
 *
 * @param {number} r - 红色分量 (0-255)
 * @param {number} g - 绿色分量 (0-255)
 * @param {number} b - 蓝色分量 (0-255)
 * @param {number} a - 透明度 (0-1)，默认为 1
 * @returns {'black' | 'white'} 文本颜色值
 */
export const determineTextColorFromRgba = (
  r: number,
  g: number,
  b: number,
  a: number = 1,
): 'black' | 'white' => {
  const lightness = calculateLightness(r, g, b);
  return lightness > 0.62 ? 'black' : (a < 0.4 ? 'black' : 'white');
};

/**
 * 解析 CSS 颜色值字符串
 * @param {string} colorStr - CSS 颜色值字符串
 * @returns {[number, number, number, number] | null} [r, g, b, a] 或 null（解析失败）
 */
export const parseCssColor = (colorStr: string): [number, number, number, number] | null => {
  const trimmed = colorStr.trim();

  // 解析 rgb/rgba 格式
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

/**
 * 获取 SillyTavern 的引用块主题色
 * 直接从 CSS 变量 --SmartThemeQuoteColor 读取
 */
export const smart_theme_quote_color = (): string => {
  return getComputedStyle(document.documentElement).getPropertyValue('--SmartThemeQuoteColor').trim();
};

let cachedTextColor: 'black' | 'white' | null = null;

/**
 * 计算 --SmartThemeQuoteColor 应该使用的文本颜色
 * @returns {'black' | 'white' | null} 文本颜色值，解析失败返回 null
 */
export const getSmartThemeQuoteTextColor = (): 'black' | 'white' | null => {
  if (cachedTextColor !== null) {
    return cachedTextColor;
  }

  const currentColor = smart_theme_quote_color();
  const rgba = parseCssColor(currentColor);

  if (!rgba) {
    console.warn(`[color] 无法解析 smart_theme_quote_color 的值: "${currentColor}"`);
    return null;
  }

  const textColor = determineTextColorFromRgba(...rgba);

  cachedTextColor = textColor;

  return textColor;
};
