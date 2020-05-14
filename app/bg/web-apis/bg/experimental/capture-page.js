import * as beakerBrowser from '../../../browser'
import * as permissions from '../../../ui/permissions'
import { URL } from 'url'

// constants
// =

const API_DOCS_URL = 'https://beakerbrowser.com/docs/apis/experimental-capturepage.html'
const API_PERM_ID = 'experimentalCapturePage'
const LAB_API_ID = 'capturePage'

// exported api
// =

export default {
  async capturePage (url, opts = {}) {
    // validate inputs
    if (!url && typeof url !== 'string') {
      throw new Error('The first argument must be a URL string')
    }
    if (opts && typeof opts !== 'object') {
      throw new Error('The second argument must be an options object')
    }
    if (opts) {
      if ('width' in opts) {
        if (typeof opts.width !== 'number') throw new Error('The width option must be a number')
        if (opts.width <= 0 || opts.width > 1600) throw new Error('The width option must between 1 and 1600')
      }
      if ('height' in opts) {
        if (typeof opts.height !== 'number') throw new Error('The height option must be a number')
        if (opts.height <= 0 || opts.height > 1200) throw new Error('The height option must between 1 and 1200')
      }
      if ('resizeTo' in opts) {
        if (typeof opts.resizeTo !== 'object') throw new Error('The resizeTo option must be an object')
        if ('width' in opts.resizeTo) {
          if (typeof opts.resizeTo.width !== 'number') throw new Error('The resizeTo.width option must be a number')
          if (opts.resizeTo.width <= 0 || opts.resizeTo.width > 1600) throw new Error('The resizeTo.width option must between 1 and 1600')
        }
        if ('height' in opts.resizeTo) {
          if (typeof opts.resizeTo.height !== 'number') throw new Error('The resizeTo.height option must be a number')
          if (opts.resizeTo.height <= 0 || opts.resizeTo.height > 1200) throw new Error('The resizeTo.height option must between 1 and 1200')
        }
      }
    }

    // parse url
    var urlp
    try { urlp = new URL(url) }
    catch (e) { throw new Error('The first argument must be a URL string') }

    if (['http:', 'https:', 'hyper:'].indexOf(urlp.protocol) === -1) {
      throw new Error('Can only capture pages served over http, https, or hyper')
    }

    // check perms
    await permissions.checkLabsPerm({
      perm: API_PERM_ID + ':' + url,
      labApi: LAB_API_ID,
      apiDocsUrl: API_DOCS_URL,
      sender: this.sender
    })

    // run method
    var img = await beakerBrowser.capturePage(url, opts)
    return img.toPNG()
  }
}
