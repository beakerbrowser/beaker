// HACK
// electron has a problem handling redirects correctly, so we need to handle it for them
// see https://github.com/electron/electron/issues/3471
// thanks github.com/sokcuri and github.com/alexstrat for this fix
// -prf

import {ipcRenderer} from 'electron'

export default function () {
  ipcRenderer.on('redirect-hackfix', function (event, url) {
    window.location.assign(url)
  })
}
