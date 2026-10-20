/**
 *
 * PCM Menu
 *
 * Keeps the sidebar menu owned by React.
 *
 * Acorn's Nav (see nav.js) copies the markup of <ul id="menu"> at startup and
 * then replaces the live element with that copy, so React keeps patching a node
 * that is no longer in the document. The page content moves on but the
 * highlighted menu item stays frozen on whatever was active at first paint.
 *
 * This override keeps the element in place and runs the parts of the vertical
 * menu setup the shell still needs: the menu listeners, the menu container
 * scrollbar and the icon replacement. Nav is initialised by Scripts ~100ms
 * after DOMContentLoaded, so loading this file straight after nav.js is early
 * enough to take effect.
 *
 **/
(function () {
  if (typeof Nav === 'undefined') {
    return;
  }

  // Marker so the runtime state is easy to confirm from the browser console.
  Nav.prototype._pcmKeepsReactMenu = true;

  Nav.prototype._addVerticalMenu = function () {
    const menu = document.querySelector('#menu');

    if (!menu) {
      return;
    }

    // _initVerticalMenu expands the active item by walking this.menuVertical and
    // binds the menu listeners, so point it at the live element.
    this.menuVertical = menu;
    menu.classList.add('show');

    // _matchUrl() is intentionally left out: it matches window.location.pathname
    // (always "/" in this single page app) and only ever adds the active class,
    // so React stays the single owner of the highlighted item.
    this._initVerticalMenu();
    this._initIcons();
  };
})();
