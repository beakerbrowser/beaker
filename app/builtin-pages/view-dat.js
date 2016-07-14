import EE from 'events'
import * as sidenavUI from './com/sidenav'
import * as viewDat from './views/view-dat'

// HACK FIX
// weird bug, prependListener is expected but missing?
// - prf
EE.prototype.prependListener = EE.prototype.on


// setup
// =

sidenavUI.setup()
viewDat.setup()
viewDat.show()