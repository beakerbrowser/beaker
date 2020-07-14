import { EventEmitter } from 'events'

const MIN_DIM_PCT = 5 // stacks and panes can't be smaller than this %
const PANE_BORDER_WIDTH = 2

export class PaneLayout extends EventEmitter {
  constructor () {
    super()
    this.stacks = []
    this.bounds = {}
  }

  get state () {
    let state = []
    for (let id in this.bounds) {
      let b = this.bounds[id]
      state.push({
        id,
        isActive: b.pane.isActive,
        isEdge: b.isEdge,
        bounds: {x: b.x, y: b.y, width: b.width, height: b.height},
        title: b.pane.title,
        status: b.pane.currentStatus,
        attachedPaneId: b.pane.attachedPane ? b.pane.attachedPane.id : undefined,
        wantsAttachedPane: b.pane.wantsAttachedPane
      })
    }
    return state
  }

  // management
  // =

  addPane (pane, {after, layoutWidth, layoutHeight, noRebalance} = {after: undefined, layoutWidth: undefined, layoutHeight: undefined, noRebalance: false}) {
    var stack = new PaneLayoutStack(this)
    if (layoutWidth) stack.layoutWidth = layoutWidth
    else if (after) stack.layoutWidth = after.layoutWidth
    else if (this.stacks[0]) stack.layoutWidth = this.stacks[0].layoutWidth
    else stack.layoutWidth = 100
    stack.addPane(pane, {layoutHeight, noRebalance})
    insert(this.stacks, stack, after)
    if (!noRebalance) this.rebalanceWidths()
    this.emit('changed')
  }

  addPaneToStack (stack, pane, {after, layoutHeight, noRebalance} = {after: undefined, layoutHeight: undefined, noRebalance: false}) {
    stack.addPane(pane, {after, layoutHeight, noRebalance})
    this.emit('changed')
  }

  removePane (pane) {
    var stack = this.findStack(pane)
    if (stack) {
      stack.removePane(pane)
      if (stack.empty) remove(this.stacks, stack)
    }
    this.rebalanceWidths()
    this.emit('changed')
  }

  findStack (pane) {
    for (let stack of this.stacks) {
      if (stack.contains(pane)) return stack
    }
  }

  getAdjacentPane (pane, dir) {
    var stack = this.findStack(pane)
    if (dir === 'up') {
      return stack.panes[stack.panes.indexOf(pane) - 1]
    }
    if (dir === 'down') {
      return stack.panes[stack.panes.indexOf(pane) + 1]
    }
    if (dir === 'left') {
      let stack2 = this.stacks[this.stacks.indexOf(stack) - 1]
      if (!stack2) return
      let i = Math.min(stack.panes.indexOf(pane), stack2.panes.length - 1)
      return stack2.panes[i]
    }
    if (dir === 'right') {
      let stack2 = this.stacks[this.stacks.indexOf(stack) + 1]
      if (!stack2) return
      let i = Math.min(stack.panes.indexOf(pane), stack2.panes.length - 1)
      return stack2.panes[i]
    }
  }

  movePane (pane, dir) {
    var stack = this.findStack(pane)
    var i = stack.panes.indexOf(pane)
    if (dir === 'up' || dir === 'down') {
      if (dir === 'up' && i > 0) {
        stack.panes.splice(i, 1)
        stack.panes.splice(i - 1, 0, pane)
      } else if (dir === 'down' && i < stack.panes.length - 1) {
        stack.panes.splice(i, 1)
        stack.panes.splice(i + 1, 0, pane)
      } else {
        return
      }
    }
    if (dir === 'left' || dir === 'right') {
      let stackIndex = this.stacks.indexOf(stack)
      let stack2 = this.stacks[stackIndex + (dir === 'left' ? -1 : 1)]
      if (!stack2) {
        if (stack.panes.length === 1) {
          return // dont create a new stack if this is the only pane in the stack
        }
        stack2 = new PaneLayoutStack(this)
        stack2.layoutWidth = stack.layoutWidth
        if (dir === 'left') this.stacks.splice(0, 0, stack2)
        else this.stacks.push(stack2)
      }
      stack.panes.splice(i, 1)
      stack2.panes.splice(Math.max(i, stack2.panes.length), 0, pane)
      if (stack.empty) {
        remove(this.stacks, stack)
      } else {
        stack.rebalanceHeights()
      }
      this.rebalanceWidths()
      stack2.rebalanceHeights()
    }
    this.emit('changed')
  }

  // bounds
  // =

  computePanesBounds ({x, y, width, height}) {
    this.bounds = {}
    let stackX = x
    let stackWidths = this.computeStackWidths(width)
    let isMultiplePanes = this.stacks.length > 1 || (this.stacks[0] && this.stacks[0].panes.length > 1)
    for (let i = 0; i < this.stacks.length; i++) {
      let stack = this.stacks[i]
      let stackWidth = stackWidths[i]
      let paneY = y
      let paneHeights = stack.computePaneHeights(height)
      for (let j = 0; j < stack.panes.length; j++) {
        let pane = stack.panes[j]
        let paneHeight = paneHeights[j]
        let isEdge = {
          top: j === 0,
          bottom: j === stack.panes.length - 1,
          left: i === 0,
          right: i === this.stacks.length - 1
        }
        this.bounds[pane.id] = {pane, isEdge, x: stackX, y: paneY, width: stackWidth, height: paneHeight}
        if (isMultiplePanes) {
          if (isEdge.top) {
            this.bounds[pane.id].y += PANE_BORDER_WIDTH
            this.bounds[pane.id].height -= PANE_BORDER_WIDTH
          }
          if (!isEdge.right) {
            this.bounds[pane.id].width -= PANE_BORDER_WIDTH
          }
          if (!isEdge.bottom) {
            this.bounds[pane.id].height -= PANE_BORDER_WIDTH
          }
        }
        paneY += paneHeight
      }
      stackX += stackWidth
    }
  }

  changePaneWidth (pane, pct) {
    var stack = this.findStack(pane)
    if (!stack) return
    var nextStack = this.stacks[this.stacks.indexOf(stack) + 1]
    if (!nextStack) return
    if (stack.layoutWidth + pct < MIN_DIM_PCT) return
    if (nextStack.layoutWidth - pct < MIN_DIM_PCT) return
    stack.layoutWidth += pct
    nextStack.layoutWidth -= pct
  }

  changePaneHeight (pane, pct) {
    var stack = this.findStack(pane)
    if (!stack) return
    var nextPane = stack.panes[stack.panes.indexOf(pane) + 1]
    if (!nextPane) return
    if (pane.layoutHeight + pct < MIN_DIM_PCT) return
    if (nextPane.layoutHeight - pct < MIN_DIM_PCT) return
    pane.layoutHeight += pct
    nextPane.layoutHeight -= pct
  }

  rebalanceAll () {
    this.rebalanceWidths()
    for (let stack of this.stacks) {
      stack.rebalanceHeights()
    }
  }

  rebalanceWidths () {
    if (!this.stacks.length) return
    
    // redistribute to 100%
    var total = this.stacks.reduce((acc, s) => acc + s.layoutWidth, 0)
    var scale = 100 / total
    for (let stack of this.stacks) {
      stack.layoutWidth = Math.max(Math.round(stack.layoutWidth * scale), MIN_DIM_PCT + 1)
    }

    // make sure we add up to 100
    total = this.stacks.reduce((acc, s) => acc + s.layoutWidth, 0)
    if (total !== 100) {
      for (let stack of this.stacks) {
        if (stack.layoutWidth + (100 - total) > MIN_DIM_PCT) {
          stack.layoutWidth += (100 - total)
          break
        }
      }
    }
  }

  computeStackWidths (width) {
    return this.stacks.map(stack => Math.round(stack.layoutWidth / 100 * width))
  }

  getBoundsForPane (pane) {
    return this.bounds[pane.id]
  }
}

class PaneLayoutStack {
  constructor (layout) {
    this.layout = layout
    this.panes = []
    this.layoutWidth = undefined
  }

  get empty () {
    return this.panes.length === 0
  }

  contains (pane) {
    return this.panes.includes(pane)
  }

  // management
  // =

  addPane (pane, {after, layoutHeight, noRebalance} = {after: undefined, layoutHeight: undefined, noRebalance: false}) {
    if (layoutHeight) pane.layoutHeight = layoutHeight
    else if (after) pane.layoutHeight = after.layoutHeight
    else if (this.panes[0]) pane.layoutHeight = this.panes[0].layoutHeight
    else pane.layoutHeight = 100
    insert(this.panes, pane, after)
    if (!noRebalance) this.rebalanceHeights()
  }

  removePane (pane) {
    remove(this.panes, pane)
    this.rebalanceHeights()
  }

  // bounds
  // =

  rebalanceHeights () {
    if (this.empty) return

    // redistribute to 100%
    var total = this.panes.reduce((acc, p) => acc + p.layoutHeight, 0)
    var scale = 100 / total
    for (let pane of this.panes) {
      pane.layoutHeight = Math.max(Math.round(pane.layoutHeight * scale), MIN_DIM_PCT + 1)
    }

    // make sure we add up to 100
    total = this.panes.reduce((acc, p) => acc + p.layoutHeight, 0)
    if (total !== 100) {
      for (let pane of this.panes) {
        if (pane.layoutHeight + (100 - total) > MIN_DIM_PCT) {
          pane.layoutHeight += 100 - total
          break
        }
      }
    }
  }

  computePaneHeights (height) {
    return this.panes.map(pane => Math.round(pane.layoutHeight / 100 * height))
  }
}

function insert (arr, item, after = undefined) {
  if (after) {
    let i = arr.indexOf(after)
    if (i !== -1) arr.splice(i + 1, 0, item)
    else arr.push(item)
  } else {
    arr.push(item)
  }
}

function remove (arr, item) {
  let i = arr.indexOf(item)
  if (i === -1) return
  arr.splice(i, 1)
}