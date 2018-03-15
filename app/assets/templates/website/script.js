// Learn more about using JavaScript to interact with webpages:
// https://developer.mozilla.org/en-US/docs/Web/javascript

const COLORS = [
  'rebeccapurple',
  'magenta',
  'lime',
  'violet',
  'red',
  'cyan',
  'yellow',
  'springgreen',
  'aqua',
  'orange',
  'crimson',
  'coral',
  'deeppink',
  'dodgerblue',
  'gold'
]
const button = document.getElementById('change-background-color')

button.addEventListener('click', changeBackgroundColor)

document.addEventListener('DOMContentLoaded', function () {
  document.getElementById('url').innerText = window.location
  document.getElementById('library-url').href = `beaker://library/${window.location}`
})

function changeBackgroundColor () {
  const maxIdx = COLORS.length - 1
  const idx = Math.floor(Math.random() * Math.floor(maxIdx))
  const newColor = COLORS[idx]

  document.body.style.background = newColor
}