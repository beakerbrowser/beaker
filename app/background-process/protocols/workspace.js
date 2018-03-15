import {protocol} from 'electron'
import url from 'url'
import * as workspacesDb from '../dbs/workspaces'
import * as scopedFsServer from '../../lib/bg/scoped-fs-server'

// content security policies
const CSP = `
default-src 'self' dat: https: wss: data: blob:;
script-src 'self' dat: https: 'unsafe-eval' 'unsafe-inline' data: blob:;
style-src 'self' dat: https: 'unsafe-inline' data: blob:;
object-src 'none';
`.replace(/\n/g, ' ')

// exported api
// =

export function setup () {
  // setup the protocol handler
  protocol.registerStreamProtocol('workspace', async (request, respond) => {
    // look up the workspace
    const urlp = url.parse(request.url)
    const wsEntry = await workspacesDb.get(0, urlp.hostname)
    const scopedFSPath = wsEntry && wsEntry.localFilesPath
    scopedFsServer.serve(request, respond, {CSP, scopedFSPath})
  }, err => {
    if (err) {
      throw new Error('Failed to create protocol: workspace. ' + err)
    }
  })
}
