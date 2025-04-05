import { reloadMarkdownProcessor } from '@sillytavern/script';

export function renderMarkdown(markdown: string) {
  const converter = reloadMarkdownProcessor();
  let htmlText = converter.makeHtml(markdown);
  htmlText = `<div style="text-align: left;">${htmlText}</div>`;
  return htmlText;
}
