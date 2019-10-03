import yo from 'yo-yo'

const CANVAS_SIZE = 256

// globals
//

// callback
var cb

// drag state
var dragging = false
var mx
var my

// rendering parameters
var ox
var oy
var zoom
var minzoom

// image buffer
var img
var imgWidth
var imgHeight

// exported api
// =

export function render () {
  return yo`
    <div id="crop-popup" class="popup-wrapper">
      <div class="popup-inner">
        <div class="head">
          <div class="title">Crop your photo</div>
          <div class="controls">
            <canvas
              id="crop-popup-canvas"
              width=${CANVAS_SIZE}
              height=${CANVAS_SIZE}
              onmousedown=${onCanvasMouseDown}
              onmouseup=${onCanvasMouseUp}
              onmouseout=${onCanvasMouseUp}
              onmousemove=${onCanvasMouseMove} />
            ></canvas>
            <input type="range" value="0" min="0" max="100" onchange=${onResize} oninput=${onResize} />
          </div>
          <div class="btns">
            <button class="btn" onclick=${destroy}>Cancel</button>
            <button class="btn primary" onclick=${onDone}>Done</button>
          </div>
        </div>
      </div>
    </div>
  `
}

export function create (imgUrl, _cb) {
  // initialize state
  cb = _cb
  zoom = 1
  minzoom = 1
  ox = 0
  oy = 0

  // render interface
  var popup = render()
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)

  // load image
  img = document.createElement('img')
  img.src = imgUrl
  img.onload = () => {
    imgWidth = img.width
    imgHeight = img.height
    const smallest = (imgWidth < imgHeight) ? imgWidth : imgHeight
    minzoom = zoom = CANVAS_SIZE / smallest
    updateCanvas()
  }
}

export function destroy () {
  // clear state
  cb = null
  img = null

  // update page
  var popup = document.getElementById('crop-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
}

// canvas handling
// =

function updateCanvas () {
  const canvas = document.getElementById('crop-popup-canvas')
  const ctx = canvas.getContext('2d')
  ctx.globalCompositeOperation = 'source-over'

  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
  ctx.save()

  ctx.translate(ox, oy)
  ctx.scale(zoom, zoom)
  ctx.drawImage(img, 0, 0, img.width, img.height)

  ctx.restore()
}

function onCanvasMouseDown (e) {
  e.preventDefault()
  dragging = true
  mx = e.clientX
  my = e.clientY
  updateCanvas()
}

function onCanvasMouseUp (e) {
  e.preventDefault()
  dragging = false
  updateCanvas()
}

function onCanvasMouseMove (e) {
  e.preventDefault()
  if (dragging) {
    [ox, oy] = clampCoords(ox + e.clientX - mx, oy + e.clientY - my)
    mx = e.clientX
    my = e.clientY
    updateCanvas()
  }
}

function onResize (e) {
  // update the zoom
  var oldZoom = zoom
  zoom = minzoom + (e.target.value / 100)

  // adjust the coords to keep the current position
  ;[ox, oy] = clampCoords(ox / oldZoom * zoom, oy / oldZoom * zoom)

  updateCanvas()
}

function clampCoords (x, y) {
  return [
    Math.max(Math.min(x, 0), -imgWidth * zoom + CANVAS_SIZE),
    Math.max(Math.min(y, 0), -imgHeight * zoom + CANVAS_SIZE)
  ]
}

// event handlers
// =

function onDone () {
  const canvas = document.getElementById('crop-popup-canvas')
  const dataUrl = canvas.toDataURL('image/png')
  cb({
    dataUrl,
    imgData: dataUrl.split(',')[1],
    imgExtension: 'png'
  })
  destroy()
}

function onKeyUp (e) {
  e.preventDefault()
  e.stopPropagation()

  if (e.keyCode === 27) {
    destroy()
  }
}
