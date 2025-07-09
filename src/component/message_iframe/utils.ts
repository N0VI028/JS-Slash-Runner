/**
 * 提取代码块中的文本
 * @param codeElement 代码块元素
 * @returns 提取的文本
 */
export function extractTextFromCode(codeElement: HTMLElement) {
  let textContent = '';

  $(codeElement)
    .contents()
    .each(function () {
      if (this.nodeType === Node.TEXT_NODE) {
        textContent += this.textContent;
      } else if (this.nodeType === Node.ELEMENT_NODE) {
        textContent += extractTextFromCode(this as HTMLElement);
      }
    });

  return textContent;
}
