import library from './library'
import apps from './apps'

var beaker = {}
if (window.location.protocol === 'beaker:') {
  beaker.library = library()
  beaker.apps = apps()
}

export default beaker