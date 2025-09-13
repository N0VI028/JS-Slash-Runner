interface Window {
  $: any;
}
const original$ = $;
_.set(window, '$', (selector: any, context: any) => {
  if (context === undefined || context === null) {
    if (window.parent && window.parent.document) {
      context = window.parent.document;
    } else {
      context = window.document;
    }
  }
  return original$(selector, context);
});
