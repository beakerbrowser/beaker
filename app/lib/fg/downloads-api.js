/**
 * This is the client API to downloads
 * The server is implemented in background-process
 *
 * This should only be exposed to trusted code.
 **/

import rpc from 'pauls-electron-rpc'
import manifest from '../rpc-manifests/downloads'
export default rpc.importAPI('downloads', manifest)