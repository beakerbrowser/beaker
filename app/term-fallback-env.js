export async function ls () {
  const cwd = env.term.getCWD()
  return await cwd.archive.readdir(cwd.pathname)
}

export function cd (location) {
  env.term.setCWD(location)
}

export function pwd () {
  return env.term.getCWD().url
}