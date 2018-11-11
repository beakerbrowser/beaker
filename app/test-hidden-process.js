var fs = require('fs')
var path = require('path')
const hyperdrive = require('hyperdrive')

console.log('Hello from the hidden process')
console.log('Hyperdrive did load? ' + typeof hyperdrive)
fs.readFile(path.join(__dirname, 'hidden-window.html'), 'utf8', (err, res) => {
  console.log(`Read result, err: ${err}, res: ${res}`)
})