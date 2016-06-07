
export default function render (archive, entries) {
  // TODO add escaping
  const key = archive.key.toString('hex')
  const baseLink = 'dat://'+key+'/'
  return `<!doctype html>
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
              return `<tr>
                <td><a href="${baseLink+e.name}" title="${e.name}">${e.name}</a></td>
              </tr>`
            }
            return `<tr><td>${e.name}</td></tr>`
          }).join('')}
        </tbody>
      </table>
    </body>
  </html>`
}