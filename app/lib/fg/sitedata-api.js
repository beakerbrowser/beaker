/**
 * This is the client API to sitedata
 * The server is implemented in background-process
 *
 * This should only be exposed to trusted code.
 **/

import rpc from 'pauls-electron-rpc'
import manifest from '../rpc-manifests/sitedata'
export default rpc.importAPI('sitedata', manifest)