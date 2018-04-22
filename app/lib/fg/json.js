import JSONFormatter from 'json-formatter-js'

export default function createJSON (json) {
  const formatter = new JSONFormatter(json, 1, {
  hoverPreviewEnabled: true,
  hoverPreviewArrayCount: 100,
  hoverPreviewFieldCount: 5,
  theme: 'dark',
  animateOpen: true,
  animateClose: true,
  useToJSON: true
})
  return formatter
}