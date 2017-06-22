import path from 'path'

// current working directory methods
// =

export async function ls (opts = {}, location = '') {
  // pick target location
  const cwd = env.term.getCWD()
  location = location.toString()
  if (!location.startsWith('/')) {
    location = path.join(cwd.pathname, location)
  }
  // TODO add support for other domains than CWD

  // read
  var listing = await cwd.archive.readdir(location, {stat: true})

  // render
  listing.toHTML = () => listing
    .filter(entry => {
      if (opts.all || opts.a) return true
      return entry.name.startsWith('.') === false
    })
    .sort((a, b) => {
      // dirs on top
      if (a.stat.isDirectory() && !b.stat.isDirectory()) return -1
      if (!a.stat.isDirectory() && b.stat.isDirectory()) return 1
      return a.name.localeCompare(b.name)
    })
    .map(entry => {
      // coloring
      var color = 'default'
      if (entry.name.startsWith('.')) {
        color = 'muted'
      }

      // render
      if (entry.stat.isDirectory()) {
        return env.html`<div class="text-${color}"><strong>${entry.name}</strong></div>`
      }
      return env.html`<div class="text-${color}">${entry.name}</div>`
    })

  return listing
}

export function cd (opts = {}, location) {
  env.term.setCWD((location || '').toString())
}

export function pwd () {
  const cwd = env.term.getCWD()
  return `//${cwd.host}${cwd.pathname}`
}

// utilities
// =

export function echo (opts, ...args) {
  return args.join(' ')
}