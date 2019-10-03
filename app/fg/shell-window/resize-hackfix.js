// HACK
// Electron has an issue where browserviews fail to calculate click regions after a resize
// https://github.com/electron/electron/issues/14038
// we can solve this by forcing a recalculation after every resize
// -prf

import _debounce from 'lodash.debounce'

window.addEventListener('resize', () => {
  forceUpdateDragRegions()
})

// big thanks to PalmerAL and minbrowser for this fix
// https://github.com/electron/electron/issues/14038#issuecomment-443948939
const forceUpdateDragRegions = window.forceUpdateDragRegions = _debounce(() => {
  setTimeout(function () {
    var d = document.createElement('div')
    d.setAttribute('style', '-webkit-app-region:drag; width: 1px; height: 1px;')
    document.body.appendChild(d)
    setTimeout(function () {
      document.body.removeChild(d)
    }, 100)
  }, 100)
}, 100)