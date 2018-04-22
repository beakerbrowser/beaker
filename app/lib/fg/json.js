import JSONFormatter from 'json-formatter-js'

export default function createJSON (json) {
  const formatter = new JSONFormatter(json, {
    theme: 'dark'
  })
  return formatter
}