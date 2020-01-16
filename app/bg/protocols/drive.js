/**
 * HACK
 * Electron has an issue that's causing file read streams to fail to serve
 * Reading into memory seems to resolve the issue
 * https://github.com/electron/electron/issues/21018
 * -prf
 */
import { PassThrough } from 'stream'
function intoStream (text) {
  const rv = new PassThrough()
  rv.push(text)
  rv.push(null)
  return rv
}

// exported api
// =

export function register (protocol) {
  protocol.registerStreamProtocol('drive', protocolHandler, err => {
    if (err) {
      console.error(err)
      throw new Error('Failed to create protocol: drive')
    }
  })
}

export const protocolHandler = async function (request, respond) {
  respond({
    statusCode: 200,
    headers: {
      // TODO CSP
      'Content-Type': 'text/html'
    },
    data: intoStream(`<meta charset="utf-8">
<link rel="stylesheet" href="beaker://explorer/drive-handler.css">
<script type="module" src="beaker://explorer/drive-handler.js"></script>
`)
  })
}
