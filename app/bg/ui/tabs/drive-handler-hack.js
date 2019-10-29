/**
 * HACK
 * 
 * The dat protocol handler needs a way to identify which tab
 * is requesting the resource so that it can choose the correct
 * drive handler. The *correct* way to do that is to leverage
 * a request header (probably the User Agent, which can be set
 * on individual WebContents objects).
 * 
 * Unfortunately Electron does not correctly send all request
 * headers on custom protocol requests, forcing us to come up
 * with a workaround.
 * 
 * This hack tracks the drive handler for all recently requested
 * dat resources so that the protocol handler can look it up.
 * 
 * It risks a race condition if multiple tabs request the exact
 * same resource at the same time.
 * 
 * -prf
 */

// globals
// =

var handlers = {}

// exported api
// =

/**
 * @param {string} url 
 * @returns {string}
 */

export function getDriveHandler (url) {
  var handler = handlers[url]
  delete handlers[url]
  return handler
}

export function setDriveHandler (url, handler) {
  handlers[url] = handler
}