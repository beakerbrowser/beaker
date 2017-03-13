// this script loads monaco's worker scripts after setting the baseUrl
// it's needed because monaco will default to a baseUrl that's a relative path
// which the beaker: scheme can't support
self.MonacoEnvironment = {
  baseUrl: 'beaker://editor/min/'
}
importScripts('beaker://editor/min/vs/base/worker/workerMain.js')