// some parts of the dat web API need to involve the shell-window
// eg, to prompt the user for confirmation
// this file contains the host side of those behaviors

import createArchivePrompt from './ui/prompts/create-archive'
import undeleteArchivePrompt from './ui/prompts/undelete-archive'
import { DAT_HASH_REGEX, InvalidURLError, ArchiveNotSavedError } from '../lib/const'

// exported api
// =

export function onIPCMessage (page, methodName, args) {
  // lookup the method
  var method = methods[methodName]
  if (!method) return console.warn('Unknown dat web api method', methodName)

  // create a responder cb
  const reqId = args.shift()
  const resolve = res => page.webviewEl.send('dat:response', reqId, null, res)
  const reject = err => page.webviewEl.send('dat:response', reqId, err)
  method(page, resolve, reject, ...args)
}

var methods = {
  createArchive (page, resolve, reject, opts={}) {
    // ask the user
    createArchivePrompt(page, opts, decision => {
      if (decision === false) {
        // rejected, send deny
        reject('user-denied')
      } else {
        // approved, create the archive
        datInternalAPI.createNewArchive({
          title: opts.title,
          description: opts.description,
          origin: page.getURL(),
          originTitle: page.siteInfo ? page.siteInfo.title : null,
          serve: opts.serve
        }).then(
          key => resolve('dat://' + key + '/'),
          reject
        )
      }
    })
  },
  deleteArchive (page, resolve, reject, url) {
    // parse the dat key out of the url
    var datKey = parseDatURL(url)
    if (!datKey) return reject(new InvalidURLError())
    var origin = page.getURLOrigin()

    // get the archive meta
    var details, oldSettings
    datInternalAPI.getArchiveDetails(datKey).then(d => {
      // fail if this site isnt saved
      details = d
      oldSettings = details.userSettings
      if (!details.userSettings.isSaved) {
        throw new ArchiveNotSavedError()
      }

      // remove the save claim
      return datInternalAPI.setArchiveUserSettings(datKey, { isHosting: false, isSaved: false })
    }).then(() => {
      resolve()

      // give the user a chance to undo
      undeleteArchivePrompt(page, details, function restore () {
        // save the dat under beaker:archives
        datInternalAPI.setArchiveUserSettings(datKey, oldSettings)
      })
    }).catch(reject)
  }
}

function parseDatURL (str) {
  if (DAT_HASH_REGEX.test(str)) return str
  try { 
    var urlp = new URL(str)
    return urlp.hostname
  }
  catch (e) {}
  return null
}