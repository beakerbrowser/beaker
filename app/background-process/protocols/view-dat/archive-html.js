import path from 'path'

export default function render (archive, entries, directory) {
  const key = archive.key.toString('hex')
  const baseLink = 'dat://'+key+'/'

  // render a link to the parent directory, if not in root
  var upLink = ''
  if (directory != '.') {
    var upHref = esc('view-'+baseLink+directory.split('/').slice(0,-1).join('/'))
    upLink = '<tr><td class="up"><a href="'+upHref+'">..</a></td></tr>'
  }

  return `<!doctype html>
  <html>
    <head>
      <title>view-dat://${esc(key)}</title>
      <link rel="stylesheet" href="beaker:view-dat.css">
    </head>
    <body>
      <table class="table-striped">
        <tbody>
          ${upLink}
          ${entries
            .filter(e => { return path.dirname(e.name) == directory })
            .map(e => {
              if (e.type == 'file') {
                return `<tr>
                  <td class="file"><a href="${esc(baseLink+e.name)}" title="${esc(e.name)}">${esc(e.name)}</a></td>
                </tr>`
              }
              return `<tr>
                <td class="directory"><a href="${esc('view-'+baseLink+e.name)}/" title="${esc(e.name)}">${esc(e.name)}/</a></td>
              </tr>`
            })
            .join('')}
        </tbody>
      </table>
    </body>
  </html>`
}

function esc (str) {
  return str.replace(/</g, '&lt;').replace(/>/g, '&gt;')
}