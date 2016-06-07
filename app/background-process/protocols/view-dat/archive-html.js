
export default function render (archive, entries) {
  const key = archive.key.toString('hex')
  const baseLink = 'dat://'+key+'/'
  return `<!doctype html>
  <html>
    <head>
      <title>view-dat://${esc(key)}</title>
      <link rel="stylesheet" href="beaker:start.css">
    </head>
    <body>
      <table class="table-striped">
        <tbody>
          ${entries.map(e => {
            if (e.type == 'file') {
              return `<tr>
                <td><a href="${esc(baseLink+e.name)}" title="${esc(e.name)}">${esc(e.name)}</a></td>
              </tr>`
            }
            return `<tr><td>${esc(e.name)}</td></tr>`
          }).join('')}
        </tbody>
      </table>
    </body>
  </html>`
}

function esc (str) {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}