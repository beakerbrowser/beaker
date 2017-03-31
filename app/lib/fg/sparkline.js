// based on https://github.com/adactio/Canvas-Sparkline

const EDGE_OFFSET = 5
const TIME_SPAN = 1e3 * 60 * 30 // past hour

export default function sparkline (c, inData, color) {
  if (!inData.length) return

  var ctx = c.getContext('2d')
  var color = (color ? color : 'rgba(0,0,255,0.5)')
  var height = c.height
  var width = c.width

  // reduce dataset to past hour, and scale the x points accordingly
  var now = Date.now()
  var data = [], lastPt
  var max = 0
  for (var i = 0; i < inData.length; i++) {
    var pt = inData[i]
    var age = now - pt.ts

    // filter out old data
    if (age > TIME_SPAN) {
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
  }
  if (!data.length) {
    // pick last datapoint if none taken
    data.push({
      x: 0,
      y: inData[inData.length - 1].peers
    })
    max = data[0].y
  }
  // add an end point to represent now
  data.push({
    x: 1,
    y: data[data.length - 1].y
  })
  // scale points
  max = Math.max(max, 1)
  data.forEach(pt => {
    pt.x = (pt.x * (width - EDGE_OFFSET)) + EDGE_OFFSET,
    pt.y = (1 - pt.y / max) * (height - EDGE_OFFSET * 2) + EDGE_OFFSET
  })
  console.log(width, height, inData, data)

  // clear background
  ctx.fillStyle = '#fafafa'
  ctx.fillRect(0, 0, width, height)

  // draw guides
  // TODO

  var x = 0
  var y = height - EDGE_OFFSET
  for (var i = 0; i < data.length; i++) {
    // ctx.beginPath()
    // ctx.fillStyle = color
    // ctx.arc(data[i].x, data[i].y, 1.5, 0, Math.PI*2)
    // ctx.fill()

    // line from old x,y to new x,y
    ctx.beginPath()
      ctx.strokeStyle = color
      ctx.moveTo(x, y)
      ctx.lineTo(data[i].x, y)
      ctx.lineTo(data[i].x, data[i].y)
    ctx.stroke()
    x = data[i].x
    y = data[i].y

    // // dot at new y
    // ctx.beginPath()
    // ctx.fillStyle = color
    // ctx.arc(x, y, 1.5, 0, Math.PI*2)
    // ctx.fill()

    // // advance x
    // if (data[i + 1]) {
    //   x = x + data[i + 1].x
    // }
  }
}