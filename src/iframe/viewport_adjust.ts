/**
 * 使用了 min-height:vh 时，自动调整iframe高度
 */
$(window).on('message', function (event) {
  // @ts-expect-error
  if (event.originalEvent.data.request === 'updateViewportHeight') {
    // @ts-expect-error
    const new_height = event.originalEvent.data.newHeight;
    $('html').css('--viewport-height', new_height + 'px');
  }
});
