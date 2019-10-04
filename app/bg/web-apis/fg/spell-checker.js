import spellCheckerManifest from '../manifests/external/spell-checker'

export default function (rpc) {
    // create the rpc apis
    return rpc.importAPI('spell-checker', spellCheckerManifest)
};