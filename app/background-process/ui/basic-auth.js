import {app} from 'electron'
import {showModal} from './modals'
import {getWebContentsWindow} from '../../lib/electron'

export function setup () {
  app.on('login', async function (e, webContents, request, authInfo, cb) {
    e.preventDefault() // default is to cancel the auth; prevent that
    var res = await showModal(getWebContentsWindow(webContents), 'basic-auth', authInfo)
    cb(res.username, res.password)
  })
}
