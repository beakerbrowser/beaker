// this emulates the implementation of event-targets by browsers

const LISTENERS = Symbol() // eslint-disable-line
const CREATE_STREAM = Symbol() // eslint-disable-line
const STREAM_EVENTS = Symbol() // eslint-disable-line
const STREAM = Symbol() // eslint-disable-line
const PREP_EVENT = Symbol() // eslint-disable-line

export class EventTarget {
  constructor () {
    this[LISTENERS] = {}
    this.addEventListener = this.addEventListener.bind(this)
    this.removeEventListener = this.removeEventListener.bind(this)
    this.dispatchEvent = this.dispatchEvent.bind(this)
  }

  addEventListener (type, callback) {
    if (!(type in this[LISTENERS])) {
      this[LISTENERS][type] = []
    }
    this[LISTENERS][type].push(callback)
  }

  removeEventListener (type, callback) {
    if (!(type in this[LISTENERS])) {
      return
    }
    var stack = this[LISTENERS][type]
    var i = stack.findIndex(cb => cb === callback)
    if (i !== -1) {
      stack.splice(i, 1)
    }
  }

  dispatchEvent (event) {
    if (!(event.type in this[LISTENERS])) {
      return
    }
    event.target = this
    var stack = this[LISTENERS][event.type]
    stack.forEach(cb => cb.call(this, event))
  }
}

export class EventTargetFromStream extends EventTarget {
  constructor (createStreamFn, events, eventPrepFn) {
    super()
    this[CREATE_STREAM] = createStreamFn
    this[STREAM_EVENTS] = events
    this[PREP_EVENT] = eventPrepFn
    this[STREAM] = null
  }

  addEventListener (type, callback) {
    if (!this[STREAM]) {
      // create the event stream
      let s = this[STREAM] = fromEventStream(this[CREATE_STREAM]())
      // proxy all events
      this[STREAM_EVENTS].forEach(event => {
        s.addEventListener(event, details => {
          details = details || {}
          if (this[PREP_EVENT]) {
            details = this[PREP_EVENT](event, details)
          }
          details.target = this
          this.dispatchEvent(new Event(event, details))
        })
      })
    }
    return super.addEventListener(type, callback)
  }
}

export class Event {
  constructor (type, opts) {
    this.type = type
    for (var k in opts) {
      this[k] = opts[k]
    }
    Object.defineProperty(this, 'bubbles', {value: false})
    Object.defineProperty(this, 'cancelBubble', {value: false})
    Object.defineProperty(this, 'cancelable', {value: false})
    Object.defineProperty(this, 'composed', {value: false})
    Object.defineProperty(this, 'currentTarget', {value: this.target})
    Object.defineProperty(this, 'deepPath', {value: []})
    Object.defineProperty(this, 'defaultPrevented', {value: false})
    Object.defineProperty(this, 'eventPhase', {value: 2}) // Event.AT_TARGET
    Object.defineProperty(this, 'timeStamp', {value: Date.now()})
    Object.defineProperty(this, 'isTrusted', {value: true})
    Object.defineProperty(this, 'createEvent', {value: () => undefined})
    Object.defineProperty(this, 'composedPath', {value: () => []})
    Object.defineProperty(this, 'initEvent', {value: () => undefined})
    Object.defineProperty(this, 'preventDefault', {value: () => undefined})
    Object.defineProperty(this, 'stopImmediatePropagation', {value: () => undefined})
    Object.defineProperty(this, 'stopPropagation', {value: () => undefined})
  }
}

export function bindEventStream (stream, target) {
  stream.on('data', data => {
    var event = data[1] || {}
    event.type = data[0]
    target.dispatchEvent(event)
  })
}

export function fromEventStream (stream) {
  var target = new EventTarget()
  bindEventStream(stream, target)
  target.close = () => {
    target.listeners = {}
    stream.close()
  }
  return target
}

export function fromAsyncEventStream (asyncStream) {
  var target = new EventTarget()
  asyncStream.then(
    stream => bindEventStream(stream, target),
    err => {
      target.dispatchEvent({type: 'error', details: err})
      target.close()
    }
  )
  target.close = () => {
    target.listeners = {}
    asyncStream.then(stream => stream.close())
  }
  return target
};
