import {app} from 'electron'
import debug from 'debug'
import fs from 'fs'
import {join as joinPath} from 'path'
import {format} from 'util'

var logFilePath
var logFileWriteStream

export default function setup () {
  if (process.env.DEBUG) {
    return // abort, user is capturing debug to the console
  }

  logFilePath = joinPath(app.getPath('userData'), 'debug.log')
  console.log('Logfile:', logFilePath)
  debug.enable('dat,dns-discovery,discovery-channel,discovery-swarm,beaker')
  debug.overrideUseColors()

  logFileWriteStream = fs.createWriteStream(logFilePath)
  logFileWriteStream.write(format('Log started at %s\n', new Date()))
  debug.useColors = () => false
  debug.log = (...args) => logFileWriteStream.write(format(...args) + '\n')
  logFileWriteStream.on('error', e => {
    console.log('Failed to open debug.log', e)
  })
}

export function getLogFilePath () {
  return logFilePath
}