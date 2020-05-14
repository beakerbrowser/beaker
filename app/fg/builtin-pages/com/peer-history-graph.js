import yo from 'yo-yo'
import {pluralize} from '../../../lib/strings'

const MINMAX = 5
const EDGE_PADDING = 5
const LEGEND_WIDTH = 25
const TIME_SPAN = 1e3 * 60 * 60 // past hour
const WIDTH = 780
const HEIGHT = 100

function scaleX (x) {
  return (x * (WIDTH - LEGEND_WIDTH)) | 0
}

function scaleY (y) {
  return (y * (HEIGHT - EDGE_PADDING * 2) + EDGE_PADDING) | 0
}

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
    pt.x = scaleX(pt.x)
    pt.y = scaleY(1 - pt.y / max)
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
        stroke-width="2"
        stroke="#2864dc"
      >
    `)
    graphLines.push(yo`
      <line
        x1=${data[i].x} y1=${y}
        x2=${data[i].x} y2=${data[i].y}
        stroke-width="2"
        stroke="#2864dc"
      >
    `)
    x = data[i].x
    y = data[i].y
  }

  // mouse info
  var mouseElems = []
  if (mouseX) {
    // draw the value
    mouseElems.push(yo`
      <text style="padding-left: 5px;" x=${mouseX + 3} y=${18} fill="#666">${mouseValue} ${pluralize(mouseValue, 'peer')}</text>
    `)

    // draw a line at the mouse
    mouseElems.push(yo`
      <line x1=${mouseX} y1=${0} x2=${mouseX} y2=${HEIGHT} stroke-width="1" stroke="#000" />
    `)
  }

  function vguideLine (x) {
    return yo`<line x1=${scaleX(x)} y1=${scaleY(0)} x2=${scaleX(x)} y2=${scaleY(1)} stroke-width="1" stroke="#ddd" />`
  }
  function hguideLine (y) {
    return yo`<line x1=${0} y1=${scaleY(y)} x2=${scaleX(1)} y2=${scaleY(y)} stroke-width="1" stroke="#aaa" />`
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

      <!-- guidelines -->
      ${vguideLine(0)} ${vguideLine(0.25)} ${vguideLine(0.5)} ${vguideLine(0.75)} ${vguideLine(1)}
      ${hguideLine(0)} ${hguideLine(0.2)} ${hguideLine(0.4)} ${hguideLine(0.6)} ${hguideLine(0.8)} ${hguideLine(1)}

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
