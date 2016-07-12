/**
 * This is the client API to the dat engine
 * The server is implemented in background-process
 *
 * This should only be exposed to trusted code.
 **/

import rpc from 'pauls-electron-rpc'
import manifest from '../rpc-manifests/dat'
export default rpc.importAPI('dat', manifest)