import { EventEmitter } from 'events'

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
        bounds: {x: b.x, y: b.y, width: b.width, height: b.height}
      })
    }
    return state
  }

  computePanesBounds ({x, y, width, height}) {
    this.bounds = {}
    for (let i = 0; i < this.stacks.length; i++) {
      let stack = this.stacks[i]
      for (let j = 0; j < stack.panes.length; j++) {
        let pane = stack.panes[j] 
        this.bounds[pane.id] = {
          pane,
          x: Math.round(x + i * (width / this.stacks.length)),
          y: Math.round(y + j * (height / stack.panes.length)),
          width: Math.round(width / this.stacks.length),
          height: Math.round(height / stack.panes.length)
        }
      }
    }
  }

  getBoundsForPane (pane) {
    return this.bounds[pane.id]
  }

  addPane (pane, {after} = {after: undefined}) {
    var stack = new PaneLayoutStack(this)
    stack.addPane(pane)
    insert(this.stacks, stack, after)
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
    this.emit('changed')
  }

  findStack (pane) {
    for (let stack of this.stacks) {
      if (stack.contains(pane)) return stack
    }
  }

  removeStack (stack) {
    remove(this.stacks, stack)
    this.emit('changed')
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
}

class PaneLayoutStack {
  constructor (layout) {
    this.layout = layout
    this.panes = []
  }

  get empty () {
    return this.panes.length === 0
  }

  contains (pane) {
    return this.panes.includes(pane)
  }

  addPane (pane, {after} = {after: undefined}) {
    insert(this.panes, pane, after)
  }

  removePane (pane) {
    remove(this.panes, pane)
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