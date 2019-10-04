import spellCheckerManifest from '../manifests/external/spell-checker'
import * as rpc from 'pauls-electron-rpc'

export default function () {
  return rpc.importAPI('spell-checker', spellCheckerManifest)
}