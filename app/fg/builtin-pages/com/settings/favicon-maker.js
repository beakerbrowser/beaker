/* globals beaker Image */

import yo from 'yo-yo'
import closeIcon from '../../icon/close'

// globals
// =

let canvas
let ctx
let gridSize = 16
let step
let color = '#438cc4'
let drawing = false
let favicon
let resize
let resizeCtx

let resolve
let reject

// grid size images. 8x8, 16x16, or 32x32.
let grid8 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAAJbElEQVR4Xu3dUXHsUAwEUQVRIITR4xgIy+jVZs2hP+aEgMuSPerW3ZS/7u7f3b2u+ft+Luv66l9UYP75+7q7n7v7Lar/XPt9addvGvDuvfoPP38CwAsgAASACdwM4D/68gIOv4B1/xGAF1AADQeQABAAAkAAUAAKkFSAAsUDCAHEDagd0PW3dzACQABQAApAARIA/vwGwws4/ALW/UcAXkABNBxAAkAACAABQAEoQFIBChQPIAQQN6B2QNff3sEIAAFAASgABUgA2CkABYgHEAKIGwDBtxG87r8AEAAUgAJQAAqQVIACxAMIAcQNqBHQ9bcVRAAIAApAAShAAsBOAShAPIAQQNwACL6N4HX/BYAAoAAUgAJQgKQCFCAeQAggbkCNgK6/rSACQABQAApAARIAdgpAAeIBhADiBkDwbQSv+y8ABAAFoAAUgAIkFaAA8QB6E4DPg/s8us+zJ/l3+efJBcCn8V6A0Rfgue3Z/tsBxAhWL4Fcf3sJKQAEgCWgJaAlYEPAvgyEQFoCQQAIAAEgAASAAJIKOAaMBxACiBsAgVsEXq+/ABAAFIACUIAEgP0zEAWIBxACiBuwjqDuv1UgASAAKAAFoAAUIKkABYgHEAKIGwCBWwRer78AEAAUgAJQgASAnQJQgHgAIYC4AesI6v5bBRIAAoACUAAKQAGSClCAeAAhgLgBELhF4PX6CwABQAEoAAVIANgpAAWIBxACiBuwjqDuv1UgASAAKAAFoAAUIKkABYgHEAKIGwCBWwRer78AEAAUgAJQgASAnQJQgHgAIYC4AesI6v5bBRIAAoACUAAKQAGSClCAeAAhgLgBELhF4PX6+zz45wmY/Tz08wK4/wSA7ruuvwAQAAJweABQAApgCWgJaAnYEKDPg687eH3/CAABIAAEgAAQQFIBx4DxAEIAcQNqBHT97WNIASAAKAAFoAAJAPtnIAoQDyAEEDcAgm8jeN1/ASAAKAAFoAAUIKkABYgHEAKIG1AjoOtvK4gAEAAUgAJQgASAnQJQgHgAIYC4ARB8G8Hr/gsAAUABKAAFoABJBShAPIAQQNyAGgFdf1tBBIAAoAAUgAIkAOwUgALEAwgBxA2A4NsIXvdfAAgACkABKAAFSCpAAeIBhADiBtQI6PrbCiIABAAFoAAUIAFgpwAUIB5ACCBuAATfRvC6/wJAAFAACkABKEBSAQoQDyAEEDegRkDX31YQASAAKMC4Avy74c8jPxPwlQDw9d+Hd/9/FZjt/5sABMDwAyAABMB7EfMbTUBLIApCQcL3zw7AC+gFDF/AegkrAASAABAAFIACJRWggPEAQgBxA2oEdH2/A7AEHEZAASAABIAAcAqUGNDlCkQBKIAl4PAAEAACQAAIAKcADQH2CGgHYAdgBzA8AQSAABAAAsASsEFAS0ATaHsC6X/bf0tAS0BLwGECFAACQAAIAKcAjQI6BaAAFMAEGp5AAkAACAAB4BSiQdAfOwA7AAE8HMACQAAIAAFgCdgQmCWgHYAdgAk0PIEEgAAQAALAErBBUEtAE6idQOrf1t8S0BIQgQ0TmAAQAAJAADgFaBTMKQAFoAAm0PAEEgACQAAIAKcADYI6BTCB2gmk/m39fR788wTOfh/+eQHdfzOBv+v6CwABIACHB4BjQMeAdjDDOxgBIAAEgADwO4BGAf0OwBKwXwL6LsDwBPACti9gXX8KQAEowPAAEAACQAAIADsAO4CkAvmnsWoEr6+PABAAAkAACCCZf+cUoJ6A69dHAAgAASAABIAAkgrYAcQDCAHEDVhHUPff/g5BAAgACkABKEACwJaAFCAeQAggbgAEbhF4vf4CQABQAApAAShAUgEKEA8gBBA3YB1B3X+rQAJAAFAACkABEgB2CkAB4gGEAOIGQOAWgdfrLwAEAAWgABSAAiQVoADxAEIAcQPWEdT9twokAAQABaAAFCABYKcAFCAeQAggbgAEbhF4vf4CQABQAApAAShAUgEKEA8gBBA3YB1B3X+rQD4P/nkCX8n8u8u/D//ct/tvHoC8/wJAAAjA4QFAASiAJaAloCVgQ4A+DGIH0O8AfB58eAJ4AdsXsK4/BaAAFGB4AAgAASAABIAdgB1AUgE/BIoHEAKIG1A7oOvbAVgCDiOgABAAAkAA/CYC4N+hcwWiABTAEnB4AAgAASAABIBTAAicVCBH4PUdCAJAAAgAASCAZP5ZgiGAeAAhgLgB6wjq/ttjSAEgACgABaAAFCCpAAWIBxACiBsAgVsEXq+/ABAAFIACUIAEgJ0CUIB4ACGAuAHrCOr+WwUSAAKAAlAACkABkgpQgHgAIYC4ARC4ReD1+gsAAUABKAAFSADYKQAFiAcQAogbsI6g7r9VIAEgACgABaAAFCCpAAWIBxACiBsAgVsEXq+/z4N/noBXMv/u8u/DP/ft/psHIO+/ABAAAnB4AFAACmAJaAloCdgQ4FmCCeA0gBGABzB9ANeXcPX9CwABIAAoAAWgAEkFKFA8gBBA3IAaAV1/+3cIAkAAUAAKQAESAPbfgBQgHkAIIG4ABN9G8Lr/AkAAUAAKQAEoQFIBChAPIAQQN6BGQNffVhABIAAoAAWgAAkAOwWgAPEAQgBxAyD4NoLX/RcAAoACUAAKQAGSClCAeAAhgLgBNQK6/raCCAABQAEoAAVIANgpAAWIBxACiBsAwbcRvO6/ABAAFIACUAAKkFSAAsQDCAHEDagR0PW3FUQACAAKQAEoQALATgEoQDyAEEDcAAi+jeB1/wWAAKAAFIACUICkAhQgHkAIIG5AjYCuv60gPg/+eQNeyfy7y78P/9y3+28egLz/AkAACMDhAUABKIAloCWgJWBDgGcJJoDTAEYAHsD0AbSEbJeQAkAACAAKQAEoQFIBChQPIAQQNwACtwi8Xn8BIAAoAAWgAAkA+29AChAPIAQQN2AdQd1/q0ACQABQAApAAShAUgEKEA8gBBA3AAK3CLxefwEgACgABaAACQA7BaAA8QBCAHED1hHU/bcKJAAEAAWgABSAAiQVoADxAEIAcQMgcIvA6/UXAAKAAlAACpAAsFMAChAPIAQQN2AdQd1/q0ACQABQAApAAShAUgEKEA8gBBA3AAK3CLxefwEgACgABaAACQA7BaAA8QBCAHED1hHU/bcKJAAEAAWgABSAAiQVoADxAEIAcQMgcIvA6/X3efDPE/BK5t9d/n34577df/MA5P3/Dyw6Q2lpnrqBAAAAAElFTkSuQmCC'
let grid16 = 'data:image/png;base64,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'
let grid32 = 'data:image/png;base64,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'

// color codes for color palette. currently 48 static colors
let colorCodes = [
  '#000000', '#181a1c', '#3f454a', '#6c7880', '#b5c1c9', '#dfe7ed', '#ffffff', '#380a11',
  '#4d1318', '#701c22', '#a13428', '#cc4033', '#f06c60', '#803020', '#9e5528', '#cf8634',
  '#dea350', '#fad578', '#fae09d', '#8f2b00 ', '#cc4b00', '#ff7900', '#ffa321', '#ffc44c',
  '#c78418', '#ebb01c', '#f2dd1d', '#f9ff54', '#123d52', '#12524f', '#186b53', '#218f4b',
  '#2fcc4e', '#7eed4e', '#04112c', '#092346', '#264e70', '#346a99', '#438cc4', '#4fcfe3',
  '#130623', '#2c0b4f', '#50177b', '#7824b9', '#a54dca', '#8f3364', '#bd4f8a', '#e66eae'
]

// exported api
// =

export async function create (opts = {}) {
  // render interface
  var popup = render()
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)

  // get canvas and set its width/height
  canvas = document.getElementById('favicon-maker')
  canvas.width = 256
  canvas.height = 256

  // set the grid step
  gridSize = 16
  step = canvas.width / gridSize

  // get the canvas 2d context
  ctx = canvas.getContext('2d')

  // load the current favicon, if provided
  if (opts.currentFaviconUrl) {
    let img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.drawImage(img, 0, 0, img.width, img.height, 0, 0, 256, 256)
      renderPreview()
    }
    img.src = opts.currentFaviconUrl
  }

  // create a new canvas to downscale from 256x256
  resize = document.createElement('canvas')
  resizeCtx = resize.getContext('2d')
  resize.width = 32
  resize.height = 32

  // render initial preview
  renderPreview()

  canvas.addEventListener('click', onCanvasClick)
  canvas.addEventListener('mousedown', () => { drawing = true })
  canvas.addEventListener('mouseup', () => { drawing = false })
  canvas.addEventListener('mousemove', onDrawing)
  canvas.addEventListener('mouseout', () => { drawing = false })

  return new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
}

export function destroy () {
  var popup = document.getElementById('favicon-maker-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  document.querySelector('body').style.cursor = 'default'
  reject()
}

// rendering
// =

function render () {
  return yo`
    <div id="favicon-maker-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner">
        <div class="head">
          <span class="title">
            Create your own Favicon
          </span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div class="design-container">
            <img id="grid" src=${grid16} />
            <canvas id="favicon-maker"></canvas>
          </div>

          <div class="toolbox">
            <div class="palette-container">
              ${colorCodes.map(code => yo`
                <div class="color" style="background-color: ${code};" onclick=${() => changeColor(code)}></div>
              `)}
            </div>
            <div class="currentColor"></div>
            <div class="tools">
              <span id="eraser" onclick=${() => changeColor('white')}><i class="fa fa-eraser"></i> Eraser</span>
              <span onclick=${clearCanvas}><i class="fa fa-trash"></i> Clear</span>
            </div>
            <div class="grids">
              <span id="grid8" class="btn" onclick=${() => changeGridSize(8, grid8)}>8 x 8</span>
              <span id="grid16" class="btn" onclick=${() => changeGridSize(16, grid16)}>16 x 16</span>
              <span id="grid32" class="btn" onclick=${() => changeGridSize(32, grid32)}>32 x 32</span>
            </div>
          </div>
        </div>
        <div class="actions">
          <img id="imagePreview" src="data:," />
          <button type="button" class="btn" onclick=${destroy}>Cancel</button>
          <button type="button" class="btn primary" onclick=${(e) => onSubmit(e)}>
            Save
          </button>
        </div>
      </form>
    </div>
  `
}

// gets the "pixel" that the user is clicking
function getPixel (e) {
  var rect = canvas.getBoundingClientRect()
  return {
    x: (Math.floor((e.clientX - rect.left) / step)) * step,
    y: (Math.floor((e.clientY - rect.top) / step)) * step
  }
}

// fills the given pixel with the users selected color
function fillPixel (x, y) {
  ctx.fillStyle = color
  ctx.fillRect(x, y, step, step)
  renderPreview()
}

// event handlers
// =

// close popup with esc key
function onKeyUp (e) {
  e.preventDefault()
  e.stopPropagation()

  if (e.keyCode === 27) {
    destroy()
  }
}

// close popup if you click out
function onClickWrapper (e) {
  e.stopPropagation()

  if (e.target.id === 'favicon-maker-popup') {
    destroy()
  }
}

function changeGridSize (size, src) {
  // reset grid size and step size
  gridSize = size
  step = canvas.width / gridSize

  document.getElementById('grid').setAttribute('src', src)
}

function changeColor (code) {
  color = code // set color to color code
  document.querySelector('.currentColor').style.backgroundColor = code
}

function renderPreview () {
  // draw current canvas onto resize canvas to downscale
  resizeCtx.clearRect(0, 0, 32, 32)
  resizeCtx.drawImage(canvas, 0, 0, 32, 32)

  favicon = resize.toDataURL() // get data url for current state of drawing

  let imagePreview = document.getElementById('imagePreview') // get the image element
  // downsize element and set src to data url
  imagePreview.setAttribute('src', favicon)
}

// clear the canvas
function clearCanvas () {
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  renderPreview()
}

// allow users to hold down mouse and draw inside canvas
function onDrawing (e) {
  if (!drawing) return
  let mousePos = getPixel(e)
  fillPixel(mousePos.x, mousePos.y)
}

function onCanvasClick (e) {
  let mousePos = getPixel(e)
  fillPixel(mousePos.x, mousePos.y)
}

async function onSubmit (e) {
  e.preventDefault()

  // send custom favicon back to process into .ico and save
  resolve(canvas.toDataURL())
  destroy()
}

/*
// the function used to render the grid
// uncomment in the future if you need new grid sizes
function drawGrid() {
  let gridCanvas = document.createElement("canvas")
  gridCanvas.width = 256
  gridCanvas.height = 256
  let gridCtx = gridCanvas.getContext('2d')

  // draw vertical lines
  gridCtx.beginPath();
  for (var x = 0; x <= gridCanvas.width; x += step) {
    gridCtx.moveTo(x, 0)
    gridCtx.lineTo(x, gridCanvas.height)
  }

  // set line style
  gridCtx.strokeStyle = "black"
  gridCtx.lineWidth = 0.5

  // draw horizontal lines
  gridCtx.stroke()

  // create vertical lines
  gridCtx.beginPath()
  for (var y = 0; y <= gridCanvas.height; y += step) {
    gridCtx.moveTo(0, y)
    gridCtx.lineTo(gridCanvas.width, y)
  }
  // set line style
  gridCtx.strokeStyle = "black"
  gridCtx.lineWidth = 0.5

  // draw vertical lines
  gridCtx.stroke()

  console.log(gridCanvas.toDataURL())
}*/