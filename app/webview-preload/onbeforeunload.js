import { ipcRenderer } from 'electron'

/*
HACK
This is a solution to https://github.com/beakerbrowser/beaker/issues/395

Electron modifies the onbeforeunload behavior.
If anything other than 'undefined' is returned, then the navigation is aborted.

This hack always returns undefined to avoid the Electron behavior.
It runs the user-specified handler manually and passes it up to
the shell-window for handling.
*/

export function setup () {
  // add our custom handling
  // (put on window.__onbeforeunload__ so that the shell-window can call it during remove())
  var userHandler = false
  window.__onbeforeunload__ = e => {
    if (typeof userHandler === 'function') {
      // use a fake event so the user cant set returnValue on us
      var fakeEvent = new Event('beforeunload', {bubbles: false, cancelable: true})
      fakeEvent.returnValue = false

      // call the user-specified handler
      var res = userHandler(fakeEvent)
      if ((res !== void 0 && res !== null) || fakeEvent.returnValue) {
        if (!confirm('Do you want to leave this site? Changes you made may not be saved.')) {
          // use our own solution, electron's handling of e.returnValue is flaky
          // if (e && !e.noSignal) ipcRenderer.sendToHost('onbeforeunload-abort')
          if (e && !e.noSignal) ipcRenderer.sendSync('onbeforeunload-abort')
          return true
        }
      }
    }
    return false
  }
  window.addEventListener('beforeunload', window.__onbeforeunload__)

  // capture user-specified handlers
  Object.defineProperty(window, 'onbeforeunload', {
    get: () => undefined,
    set: handler => {
      userHandler = handler
    }
  })
  // hold my beer, we're even going to wrap addEventListener
  var orgAddEventListener = window.addEventListener
  window.addEventListener = (event, handler, ...args) => {
    if (event === 'beforeunload') {
      // capture handler
      if (typeof handler === 'function') {
        userHandler = handler
      }
    } else {
      // pass through
      orgAddEventListener.call(window, event, handler, ...args)
    }
  }
}