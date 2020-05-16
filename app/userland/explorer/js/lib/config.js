import * as loc from './location.js'

export function getDriveTitle (info) {
  return info.title || 'Untitled'
}

export function getGlobalSavedConfig (name, fallback = undefined) {
  var value = localStorage.getItem(`setting:${name}`)
  if (value === null) return fallback
  return value
}

export function setGlobalSavedConfig (name, value) {
  localStorage.setItem(`setting:${name}`, value)
}

export function getSavedConfig (name, fallback = undefined) {
  var value = localStorage.getItem(`setting:${name}:${loc.getPath()}`)
  if (value === null) return getGlobalSavedConfig (name, fallback)
  return value
}

export function setSavedConfig (name, value) {
  localStorage.setItem(`setting:${name}:${loc.getPath()}`, value)
}

export function oneof (v, values) {
  if (values.includes(v)) return v
}

export function getVFCfg (obj, key, values) {
  if (!obj) return undefined
  const ns = 'unwalled.garden/explorer-view'
  if (obj[ns] && typeof obj[ns] === 'object') {
    return oneof(obj[ns][key], values)
  }
}