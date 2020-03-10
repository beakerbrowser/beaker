// HACK
// Electron has an issue where browserviews fail to calculate click regions after a resize
// https://github.com/electron/electron/issues/14038
// we can solve this by forcing a recalculation after every resize
// -prf

import {ipcRenderer} from 'electron'

export default function () {
  const setTimeoutFn = setTimeout
  const clearTimeoutFn = clearTimeout
  var to = undefined

  function queueHackfix () {
    if (to) clearTimeoutFn(to)
    to = setTimeoutFn(() => {
      ipcRenderer.send('resize-hackfix')
      to = undefined
    }, 500)
  }

  window.addEventListener('resize', queueHackfix)
  document.addEventListener('DOMContentLoaded', queueHackfix)
}
