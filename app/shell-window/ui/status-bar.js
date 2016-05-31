export function setup () {
  
}

export function set (str) {
  var el = document.getElementById('status-bar')
  if (str) {
    el.classList.remove('hidden')
    el.textContent = str
  } else
    el.classList.add('hidden')
}