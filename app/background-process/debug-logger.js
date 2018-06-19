import {getEnvVar} from '@beaker/core'
import {app} from 'electron'
import debug from 'debug'
import fs from 'fs'
import concat from 'concat-stream'
import {join as joinPath} from 'path'
import {format} from 'util'

var logFilePath
var logFileWriteStream

export default function setup () {
  if (getEnvVar('DEBUG')) {
    return // abort, user is capturing debug to the console
  }

  let folderPath = getEnvVar('BEAKER_USER_DATA_PATH') || app.getPath('userData')
  logFilePath = joinPath(folderPath, 'debug.log')
  console.log('Logfile:', logFilePath)
  debug.enable('dat,datgc,dat-dns,dat-serve,dns-discovery,discovery-channel,discovery-swarm,beaker,beaker-sqlite,beaker-analytics')
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

export function getLogFileContent (start, end) {
  start = start || 0
  end = end || 10e5
  return new Promise(resolve => fs.createReadStream(logFilePath, {start, end}).pipe(concat({encoding: 'string'}, resolve)))
}
