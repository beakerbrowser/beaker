// based on https://github.com/adactio/Canvas-Sparkline

const EDGE_PADDING = 5
const LEGEND_WIDTH = 15
const TIME_SPAN = 1e3 * 60 * 30 // past hour

export default function sparkline (c, inData) {
  if (!inData.length) {
    inData = [{peers: 0, ts: Date.now()}]
  }

  var ctx = c.getContext('2d')
  var height = c.height
  var width = c.width
  var mouseX = c.mouseX // attached by our event handlers

  var mouseXNormalized = (mouseX) ? mouseX / (width - LEGEND_WIDTH) : 0
  var mouseValue = 0 // value at mouse

  // reduce dataset to past hour, and scale the x points accordingly
  var now = Date.now()
  var data = [], lastPt
  var max = 0, initValue = 0
  for (var i = 0; i < inData.length; i++) {
    var pt = inData[i]
    var age = now - pt.ts

    // filter out old data
    if (age > TIME_SPAN) {
      initValue = pt.peers // track last possible value
      continue
    }

    // ingore dups
    if (lastPt && lastPt.y === pt.peers) {
      continue
    }

    // track max
    max = Math.max(max, pt.peers)

    // add data point
    lastPt = {
      x: 1 - age / TIME_SPAN,
      y: pt.peers
    }
    data.push(lastPt)

    // track value at mouse
    if (lastPt.x < mouseXNormalized) {
      mouseValue = pt.peers
    }
  }
  // add an initial point to represent pre-history
  data.unshift({
    x: 0,
    y: initValue || inData[inData.length - 1].peers
  })
  if (!mouseValue) mouseValue = data[0].y
  // add an end point to represent now
  data.push({
    x: 1,
    y: data[data.length - 1].y
  })
  // scale points
  if (!max) max = data[0].y
  max = Math.max(max, 1)
  data.forEach(pt => {
    pt.x = (pt.x * (width - LEGEND_WIDTH)),
    pt.y = (1 - pt.y / max) * (height - EDGE_PADDING * 2) + EDGE_PADDING
  })

  // clear background
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, width, height)

  // draw legend
  ctx.fillStyle = '#666'
  ctx.font = '10px monospace'
  ctx.fillText(0, width - LEGEND_WIDTH + EDGE_PADDING, height - EDGE_PADDING)
  ctx.fillText(max, width - LEGEND_WIDTH + EDGE_PADDING, EDGE_PADDING * 2)

  var x = data[0].x
  var y = data[0].y
  for (var i = 1; i < data.length; i++) {
    // line from old x,y to new x,y
    ctx.beginPath()
      ctx.strokeStyle = 'rgba(0,0,255,0.5)'
      ctx.moveTo(x, y)
      ctx.lineTo(data[i].x, y)
      ctx.lineTo(data[i].x, data[i].y)
    ctx.stroke()
    x = data[i].x
    y = data[i].y
  }

  // draw info at mouse
  if (mouseX) {
    // draw a background to the value
    ctx.fillStyle = '#ddd'    
    ctx.fillRect(mouseX, 0, 13, 13)

    // draw the value
    ctx.fillStyle = '#666'
    ctx.font = '12px monospace'
    ctx.fillText(mouseValue, mouseX + 3, 10)

    // draw a line at the mouse
    ctx.beginPath()
      ctx.strokeStyle = '#999'
      ctx.moveTo(mouseX, 0)
      ctx.lineTo(mouseX, height)
    ctx.stroke()
  }
}