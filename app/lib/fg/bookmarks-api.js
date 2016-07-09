/**
 * This is the client API to bookmarks
 * The server is implemented in background-process
 *
 * This should only be exposed to trusted code.
 **/

import rpc from 'pauls-electron-rpc'
import manifest from '../rpc-manifests/bookmarks'
export default rpc.importAPI('bookmarks', manifest)