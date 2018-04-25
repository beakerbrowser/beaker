import createJSON from './lib/fg/json'

const isJSON = function (str) {
  if (str === "" || str === ' ') return false
  str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@')
  str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']')
  str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '')
  return (/^[\],:{}\s]*$/).test(str)
}

if (!document.querySelector('main')) {
  var unformattedEl = document.querySelector('body > pre')
  if (isJSON(unformattedEl.textContent)) {
    var main = document.createElement('main');
    main.classList.add('json');
    var formatter = createJSON(JSON.parse(unformattedEl.textContent))
    var formattedEl = formatter.render();
    main.appendChild(formattedEl);
    document.body.appendChild(main)
  }
}
