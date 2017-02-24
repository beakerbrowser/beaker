import library from './library'

var beaker = {}
if (window.location.protocol === 'beaker:') {
  beaker.library = library()
}

export default beaker