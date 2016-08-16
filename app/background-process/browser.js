import { app, protocol } from 'electron'
import rpc from 'pauls-electron-rpc'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import path from 'path'
import fs from 'fs'
import log from 'loglevel'
import globalModulesDir from 'global-modules'
import manifest from './api-manifests/browser'
import co from 'co'
import * as plugins from './plugins'

// globals
// =

// used for rpc
var browserEvents = new EventEmitter()

// exported methods
// =

export function setup () {
  // wire up RPC
  rpc.exportAPI('beakerBrowser', manifest, { 
    eventsStream,
    getInfo,
    checkForUpdates,
    restartBrowser,

    listPlugins: plugins.list,
    lookupPlugin: plugins.lookup,
    installPlugin: plugins.install,
    uninstallPlugin: plugins.uninstall,

    getProtocolDescription,
    getHomePages
  })
}

export function getInfo () {
  return Promise.resolve({
    version: '0.1.0', // TODO
    paths: {
      userData: app.getPath('userData')
    }
  })
}

export function checkForUpdates () {
  // check the browser auto-updater
  // TODO

  co(function*() {
    try {
      // emit start event
      browserEvents.emit('plugins-updating')

      // run plugin updater
      var results = yield plugins.checkForUpdates()

      // emit updated event
      if (results && results.length > 0)
        browserEvents.emit('plugins-updated')
    } catch (e) {
      log.error('Error updating plugins via npm', e)
    }

    // emit finish event
    browserEvents.emit('plugins-done-updating')
  })

  return Promise.resolve()
}

export function restartBrowser () {
  app.relaunch()
  setTimeout(() => app.exit(0), 1e3)
}

// get the home-page listing
export function getHomePages () {
  return Promise.resolve(plugins.getAllInfo('homePages'))
}

// get the description for a given scheme
export function getProtocolDescription (scheme) {
  // massage input
  scheme = scheme.replace(/:/g, '')

  // find desc
  return plugins.getAllInfo('protocols').find(proto => proto.scheme == scheme)
}

// rpc methods
// =

function eventsStream () {
  return emitStream(browserEvents)
}