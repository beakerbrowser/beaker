var isLoading = false
var currentStr

export function setup () {
  
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
  var el = document.getElementById('statusbar')
  var str = currentStr
  if (!str && isLoading)
    str = 'Loading...'
  
  if (str) {
    el.classList.remove('hidden')
    el.textContent = str
  } else
    el.classList.add('hidden')
}