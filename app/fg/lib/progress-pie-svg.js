// from https://www.smashingmagazine.com/2015/07/designing-simple-pie-charts-with-css/
// thanks Lea Verou!

export default function progressPie (p, {color1, color2, size} = {}) {
  // default params
  color1 = color1 || '#655'
  color2 = color2 || 'yellowgreen'
  size = size || '15px'

  // create pie svg
  var NS = 'http://www.w3.org/2000/svg'
  var svg = document.createElementNS(NS, 'svg')
  var circle = document.createElementNS(NS, 'circle')
  var title = document.createElementNS(NS, 'title')
  circle.setAttribute('r', 16)
  circle.setAttribute('cx', 16)
  circle.setAttribute('cy', 16)
  circle.setAttribute('stroke-dasharray', p + ' 100')
  circle.style.fill = color1
  circle.style.stroke = color2
  circle.style.strokeWidth = 32
  svg.setAttribute('viewBox', '0 0 32 32')
  svg.style.width = size
  svg.style.height = size
  svg.style.background = color1
  svg.style.transform = 'rotate(-90deg)'
  svg.style.borderRadius = '50%'
  title.textContent = p + '%'
  svg.appendChild(title)
  svg.appendChild(circle)
  return svg
}
