
export default function render (archive, entries) {
  const key = archive.key.toString('hex')
  const baseLink = 'dat://'+key+'/'
  return esc`<!doctype html>
  <html>
    <head>
      <title>view-dat://${key}</title>
      <link rel="stylesheet" href="beaker:start.css">
    </head>
    <body>
      <table class="table-striped">
        <tbody>
          ${entries.map(e => {
            if (e.type == 'file') {
              return esc`<tr>
                <td><a href="${baseLink+e.name}" title="${e.name}">${e.name}</a></td>
              </tr>`
            }
            return esc`<tr><td>${e.name}</td></tr>`
          }).join('')}
        </tbody>
      </table>
    </body>
  </html>`
}

function esc (parts, ...args) {
  var str = ''
  parts.forEach((part, i) => {
    str += part
    str += (args[i]||'').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  })
  return str
}