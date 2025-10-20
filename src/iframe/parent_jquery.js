const original$ = $;
_.set(window, '$', (selector, context) => {
  if (context === undefined || context === null) {
    if (window.parent && window.parent.document) {
      context = window.parent.document;
    } else {
      context = window.document;
    }
  }
  return original$(selector, context);
});
