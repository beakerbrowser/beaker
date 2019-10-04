import * as permissions from '../../../ui/permissions'
import http from 'http'
import https from 'https'
import concat from 'concat-stream'
import { URL } from 'url'

// constants
// =

const API_DOCS_URL = 'https://beakerbrowser.com/docs/apis/experimental-globalfetch.html'
const API_PERM_ID = 'experimentalGlobalFetch'
const LAB_API_ID = 'globalFetch'

// exported api
// =

export default {
  async fetch (reqOptions, reqBody) {
    // parse url
    var urlp = new URL(reqOptions.url)
    reqOptions.protocol = urlp.protocol
    reqOptions.host = urlp.host
    reqOptions.path = urlp.pathname + urlp.search + urlp.hash

    // check perms
    await permissions.checkLabsPerm({
      perm: API_PERM_ID + ':' + reqOptions.protocol + '//' + reqOptions.host,
      labApi: LAB_API_ID,
      apiDocsUrl: API_DOCS_URL,
      sender: this.sender
    })

    if (reqOptions.protocol !== 'https:' && reqOptions.protocol !== 'http:') {
      throw new Error('Can only send requests to http or https URLs')
    }

    return new Promise((resolve, reject) => {
      // start request
      var proto = urlp.protocol === 'https:' ? https : http
      var reqStream = proto.request(reqOptions, resStream => {
        resStream.pipe(concat(resStream, resBody => {
          // resolve with response
          resolve({
            status: resStream.statusCode,
            statusText: resStream.statusMessage,
            headers: resStream.headers,
            body: resBody
          })
        }))

        // handle errors
        resStream.on('error', err => {
          reject(new Error('Network request failed'))
        })
        resStream.on('abort', err => {
          reject(new Error('Aborted'))
        })
      })

      // send data
      if (reqBody) {
        reqStream.send(reqBody)
      }

      reqStream.end()
    })
  }
}
