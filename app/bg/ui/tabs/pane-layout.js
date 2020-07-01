import { EventEmitter } from 'events'

const MIN_DIM_PCT = 5 // stacks and panes can't be smaller than this %

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
        bounds: {x: b.x, y: b.y, width: b.width, height: b.height}
      })
    }
    return state
  }

  // management
  // =

  addPane (pane, {after} = {after: undefined}) {
    var stack = new PaneLayoutStack(this)
    stack.layoutWidth = (after || this.stacks[0]) ? (after || this.stacks[0]).layoutWidth : 100
    stack.addPane(pane)
    insert(this.stacks, stack, after)
    this.rebalanceWidths()
    this.emit('changed')
  }

  addPaneToStack (stack, pane, {after} = {after: undefined}) {
    stack.addPane(pane, {after})
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

  // bounds
  // =

  computePanesBounds ({x, y, width, height}) {
    this.bounds = {}
    let stackX = x
    let stackWidths = this.computeStackWidths(width)
    for (let i = 0; i < this.stacks.length; i++) {
      let stack = this.stacks[i]
      let stackWidth = stackWidths[i]
      let paneY = y
      let paneHeights = stack.computePaneHeights(height)
      for (let j = 0; j < stack.panes.length; j++) {
        let pane = stack.panes[j]
        let paneHeight = paneHeights[j]
        this.bounds[pane.id] = {
          pane,
          isEdge: {
            top: j === 0,
            bottom: j === stack.panes.length - 1,
            left: i === 0,
            right: i === this.stacks.length - 1
          },
          x: stackX,
          y: paneY,
          width: stackWidth,
          height: paneHeight
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
    if (nextStack.layoutWidth + pct < MIN_DIM_PCT) return
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

  addPane (pane, {after} = {after: undefined}) {
    pane.layoutHeight = (after || this.panes[0]) ? (after || this.panes[0]).layoutHeight : 100
    insert(this.panes, pane, after)
    this.rebalanceHeights()
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