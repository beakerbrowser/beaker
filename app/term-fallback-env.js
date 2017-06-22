import path from 'path'

export async function ls (location = '') {
  const cwd = env.term.getCWD()
  if (!location.startsWith('/')) {
    location = path.join(cwd.pathname, location)
  }
  return await cwd.archive.readdir(location)
}

export function cd (location) {
  env.term.setCWD(location || '')
}

export function pwd () {
  return env.term.getCWD().url
}

export function echo (...args) {
  return args.join(' ')
}