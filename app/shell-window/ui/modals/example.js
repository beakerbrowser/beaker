import * as yo from 'yo-yo'
import * as modal from '../modal'

// exported api
// =

export default function (page, opts = {}) {
  return new Promise((resolve, reject) => {
    // create the modal
    let i = opts.i ? opts.i : 0
    modal.add(page, {
      render: ({rerender, remove}) => {
        function oninc () {
          i++
          rerender()
        }

        return yo`
          <div style="padding: 10px 20px 6px; width: 500px;">
            <h3>Test Modal</h3>
            <p>
              Hello world! <a class="link" onclick=${oninc}>Click me (${i} clicks)</a>
            </p>
            <p>
              <a class="btn primary" onclick=${() => { remove(); resolve(i) }}>OK</a>
              <a class="btn" onclick=${() => { remove(); reject(new Error('Canceled')) }}>Cancel</a>              
            </p>
          </div>
        `
      },
      onForceClose: () => {
        reject(new Error('Closed'))
      }
    })
  })
}
