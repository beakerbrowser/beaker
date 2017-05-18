import {getActiveArchives} from './library'

export function archivesDebugPage () {
  var archives = getActiveArchives()
  return `<html>
    <body>
      ${Object.keys(archives).map(key => {
        var a = archives[key]
        return `<div style="font-family: monospace">
          <h3>${a.key.toString('hex')}</h3>
          <table>
            <tr><td>Meta DKey</td><td>${a.discoveryKey.toString('hex')}</td></tr>
            <tr><td>Content DKey</td><td>${a.content.discoveryKey.toString('hex')}</td></tr>
            <tr><td>Meta Key</td><td>${a.key.toString('hex')}</td></tr>
            <tr><td>Content Key</td><td>${a.content.key.toString('hex')}</td></tr>
            ${a.replicationStreams.map((s, i) => `
              <tr><td>Peer ${i}</td><td>${s.peerInfo.type} ${s.peerInfo.host}:${s.peerInfo.port}</td></tr>
            `).join('')}
          </table>
        </div>`
      }).join('')}
    </body>
  </html>`
}