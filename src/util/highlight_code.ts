export function highlight_code(element: HTMLElement) {
  const $node = $(element);
  if ($node.hasClass('hljs') || $node.text().includes('<body')) {
    return;
  }

  hljs.highlightElement(element);
  $node.append(
    $(`<i class="fa-solid fa-copy code-copy interactable" title="Copy code"></i>`)
      .on('click', function (e) {
        e.stopPropagation();
      })
      .on('pointerup', async function () {
        navigator.clipboard.writeText($(element).text());
        toastr.info(`已复制!`, '', { timeOut: 2000 });
      }),
  );
}
