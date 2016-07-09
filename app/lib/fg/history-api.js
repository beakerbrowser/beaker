/**
 * This is the client API to history
 * The server is implemented in background-process
 *
 * This should only be exposed to trusted code.
 **/

import rpc from 'pauls-electron-rpc'
import manifest from '../rpc-manifests/history'
export default rpc.importAPI('history', manifest)