import * as hyperDns from './dns'

/**
 * @returns {string}
 */
export const drivesDebugPage = function () {
  var drives = [] // TODO getActiveDrives()
  return `<html>
    <body>
      ${Object.keys(drives).map(key => {
    var a = drives[key]
    return `<div style="font-family: monospace">
          <h3>${a.key.toString('hex')}</h3>
          <table>
            <tr><td>Meta DKey</td><td>${a.discoveryKey.toString('hex')}</td></tr>
            <tr><td>Content DKey</td><td>${a.content.discoveryKey.toString('hex')}</td></tr>
            <tr><td>Meta Key</td><td>${a.key.toString('hex')}</td></tr>
            <tr><td>Content Key</td><td>${a.content.key.toString('hex')}</td></tr>
          </table>
        </div>`
  }).join('')}
    </body>
  </html>`
}

/**
 * @returns {string}
 */
export const datDnsCachePage = function () {
  var cache = hyperDns.listCache()
  return `<html>
    <body>
      <h1>Dat DNS cache</h1>
      <p><button>Clear cache</button></p>
      <table style="font-family: monospace">
        ${Object.keys(cache).map(name => {
    var key = cache[name]
    return `<tr><td><strong>${name}</strong></td><td>${key}</td></tr>`
  }).join('')}
      </table>
      <script src="beaker://dat-dns-cache/main.js"></script>
    </body>
  </html>`
}

/**
 * @returns {string}
 */
export const datDnsCacheJS = function () {
  return `
    document.querySelector('button').addEventListener('click', clear)
    async function clear () {
      await beaker.drives.clearDnsCache()
      location.reload()
    }
  `
}
