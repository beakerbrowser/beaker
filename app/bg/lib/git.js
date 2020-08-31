import path from 'path'
import git from 'isomorphic-git'
import http from 'isomorphic-git/http/node'
import fs from 'fs'
import { tmpdir } from 'os'

export async function gitCloneToTmp (url) {
  var dir = await fs.promises.mkdtemp(path.join(tmpdir(), `beaker-git-`))
  try {
    await git.clone({fs, http, dir, url})
  } catch (e) {
    if (!url.endsWith('.git') && e.toString().includes('404')) {
      return gitCloneToTmp(url + '.git')
    }
    throw e
  }
  return dir
}