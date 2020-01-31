import { getStoragePathFor, downloadDat } from '../dat/index'
import { URL } from 'url'
import datDns from '../dat/dns'
import { promises as fsp } from 'fs'

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
  protocol.registerStreamProtocol('dat', electronHandler)
}

export const electronHandler = async function (request, respond) {
  try {
    var urlp = new URL(request.url)
    var key = await datDns.resolveName(urlp.hostname)

    let path = getStoragePathFor (key)
    await downloadDat(key)

    var files = await fsp.readdir(path)

    respond({
      statusCode: 200,
      headers: {'Content-Type': 'text/html'},
      data: intoStream(`<!doctype html>
<html>
  <head></head>
  <body>
    <h1>Dat legacy mode</h1>
    <p><strong>Dat has been upgraded to the Hyper Protocol</strong>. Old dat archives are no longer compatible with Beaker.</p>
    <p>You can convert this dat into a Hyperdrive to continue using its content.</p>
    <p><button>Convert to Hyperdrive</button></p>
    <h3>Files</h3>
    <pre>${files.join('\n')}</pre>
    <script>
      var btn = document.body.querySelector('button')
      btn.addEventListener('click', async (e) => {
        btn.textContent = 'Converting...'
        btn.setAttribute('disabled', '')
        __beakerConvertDatArchive("${key}")
      })
    </script>
  </body>
</html>
`)
    })
  } catch (e) {
    console.log('failed', e)
    respond({
      statusCode: 400,
      headers: {'Content-Type': 'text/html'},
      data: intoStream(`<h1>Failed to load Dat</h1><pre>${e.toString()}</pre>`)
    })
  }
}
