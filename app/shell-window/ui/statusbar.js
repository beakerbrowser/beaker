var statusEl
var isLoading = false
var currentStr
var zoneLimits
var wasNearOurCorner = false

export function setup () {
  statusEl = document.getElementById('statusbar')
  captureWindowRect()
  window.addEventListener('resize', captureWindowRect)
  document.body.addEventListener('mousemove', onMouseMove)
}

export function set (str) {
  currentStr = str
  render()
}

export function setIsLoading (b) {
  isLoading = b
  render()
}

function render () {
  var str = currentStr
  if (!str && isLoading) { str = 'Loading...' }

  if (str) {
    statusEl.classList.remove('hidden')
    statusEl.textContent = str
  } else { statusEl.classList.add('hidden') }
}

function captureWindowRect (e) {
  var windowRect = document.body.getClientRects()[0]
  zoneLimits = {
    x: windowRect.right / 2,
    y: windowRect.bottom - 40
  }
}

function onMouseMove (e) {
  // check if the mouse is near our corner
  var isNearOurCorner = false
  if (e.clientY >= zoneLimits.y && e.clientX < zoneLimits.x) {
    isNearOurCorner = true
  }

  if (isNearOurCorner && !wasNearOurCorner) {
    // move to the right
    statusEl.classList.add('right')
  } else if (!isNearOurCorner && wasNearOurCorner) {
    // move back to the left
    statusEl.classList.remove('right')
  }

  wasNearOurCorner = isNearOurCorner
}