import { app, protocol } from 'electron'
import rpc from 'pauls-electron-rpc'
import emitStream from 'emit-stream'
import EventEmitter from 'events'
import path from 'path'
import fs from 'fs'
import log from 'loglevel'
import globalModulesDir from 'global-modules'
import manifest from './api-manifests/browser'
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

    listPlugins: plugins.list,
    lookupPlugin: plugins.lookup,
    installPlugin: plugins.install,

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