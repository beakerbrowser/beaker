import yo from 'yo-yo'

export default function render (current, num) {
  var segments = []
  for (let i = 1; i < num; i++) {
    if (i <= current) segments.push(true)
    else segments.push(false)
  }
  return yo`
    <div class="segmented-progress-bar">
      ${segments.map(s => yo`<div class="segment ${s ? 'filled' : ''}"><span /></div>`)}
    </div>
  `
}
