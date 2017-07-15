import yo from 'yo-yo'

const MINMAX = 5
const EDGE_PADDING = 5
const LEGEND_WIDTH = 25
const TIME_SPAN = 1e3 * 60 * 60 // past hour
const WIDTH = 611
const HEIGHT = 100

// globals
// =

var mouseX

// exported api
// =

export default function render (archiveInfo) {
  var inData = archiveInfo.peerHistory
  if (!inData.length) {
    inData = [{peers: 0, ts: Date.now()}]
  }

  var mouseXNormalized = (mouseX) ? mouseX / (WIDTH - LEGEND_WIDTH) : 0
  var mouseValue = 0 // value at mouse

  // reduce dataset to past hour, and scale the x points accordingly
  var now = Date.now()
  var data = []
  var lastPt
  var max = 0
  var initValue = 0
  for (let i = 0; i < inData.length; i++) {
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
  data.unshift({x: 0, y: initValue})
  if (!mouseValue) mouseValue = data[0].y

  // add an end point to represent now
  data.push({x: 1, y: data[data.length - 1].y})

  // scale points
  if (!max) max = data[0].y
  max = Math.max(max, MINMAX)
  data.forEach(pt => {
    pt.x = (pt.x * (WIDTH - LEGEND_WIDTH))
    pt.y = (1 - pt.y / max) * (HEIGHT - EDGE_PADDING * 2) + EDGE_PADDING
  })

  // graph lines
  var graphLines = []
  var x = data[0].x
  var y = data[0].y
  for (let i = 1; i < data.length; i++) {
    // line from old x,y to new x,y
    graphLines.push(yo`
      <line
        x1=${x} y1=${y}
        x2=${data[i].x} y2=${y}
        stroke="#006fe8"
      >
    `)
    graphLines.push(yo`
      <line
        x1=${data[i].x} y1=${y}
        x2=${data[i].x} y2=${data[i].y}
        stroke="#006fe8"
      >
    `)
    x = data[i].x
    y = data[i].y
  }

  // mouse info
  var mouseElems = []
  if (mouseX) {
    // draw a background to the value
    mouseElems.push(yo`
      <rect x=${mouseX} y=${0} width=${20} height=${20} fill="#fff" />
    `)

    // draw the value
    mouseElems.push(yo`
      <text x=${mouseX + 3} y=${15} fill="#666">${mouseValue}</text>
    `)

    // draw a line at the mouse
    mouseElems.push(yo`
      <line x1=${mouseX} y1=${0} x2=${mouseX} y2=${HEIGHT} stroke="#999" />
    `)
  }

  return yo`
    <svg
      id="history-${archiveInfo.key}"
      class="peer-history-graph"
      width=${WIDTH}
      height=${HEIGHT}
      onmousemove=${onMouseMove(archiveInfo)}
      onmouseleave=${onMouseLeave(archiveInfo)}
    >
      <!-- legend -->
      <text x=${WIDTH - LEGEND_WIDTH + 5} y=${HEIGHT - 5} fill="#666">0</text>
      <text x=${WIDTH - LEGEND_WIDTH + 5} y=${15} fill="#666">${max}</text>
      <text x=${0} y=${15} fill="#808080">1hr</text>

      <!-- graph -->
      ${graphLines}
      ${mouseElems}
    </svg>
  `
}

// event handlers
// =

function onMouseMove (archiveInfo) {
  return e => {
    mouseX = e.layerX
    update(archiveInfo)
  }
}

function onMouseLeave (archiveInfo) {
  return e => {
    mouseX = 0
    update(archiveInfo)
  }
}

// internal helpers
// =

function update (archiveInfo) {
  var el = document.querySelector(`#history-${archiveInfo.key}`)
  yo.update(el, render(archiveInfo))
}
