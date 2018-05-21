import * as yo from 'yo-yo'
import {BaseModal} from './base'

// exported api
// =

export class ExampleModal extends BaseModal {
  constructor (opts) {
    super(opts)
    this.i = opts.i ? opts.i : 0
  }

  render () {
    return yo`
      <div style="padding: 10px 20px 6px; width: 500px;">
        <h3>Test Modal</h3>
        <p>
          Hello world! <a class="link" onclick=${() => this.onIncrement()}>Click me (${this.i} clicks)</a>
        </p>
        <p>
          <a class="btn primary" onclick=${() => this.close(null, this.i)}>OK</a>
          <a class="btn" onclick=${() => this.close(new Error('Canceled'))}>Cancel</a>              
        </p>
      </div>`
  }

  onIncrement () {
    this.i++
    this.rerender()
  }
}
