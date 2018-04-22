import createJSON from './lib/fg/json'

const isJSON = function (str) {
  if (str.blank()) return false
  str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
  str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
  str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '')
  return (/^[\],:{}\s]*$/).test(str)
}

if (!document.querySelector('main')) {
  var unformattedEl = document.querySelector('body > pre')
  if (isJSON(unformattedEl.textContent)) {
    var formattedEl = document.createElement('main')
    formattedEl.innerHTML = `<nav></nav><div class="json">${createJSON(unformattedEl.textContent)}</div>`
    document.body.appendChild(formattedEl)
  }
}
