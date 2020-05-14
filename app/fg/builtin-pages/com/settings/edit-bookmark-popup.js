import yo from 'yo-yo'
import closeIcon from '../../icon/close'

// globals
// =

var resolve
var reject

// exported api
// =

export function render (href, {title = '', tags = '', notes = '', isPrivate = true, pinned = false, pinOrder = undefined}) {
  return yo`
    <div id="edit-bookmark-popup" class="popup-wrapper" onclick=${onClickWrapper}>
      <form class="popup-inner" onsubmit=${onSubmit}>
        <div class="head">
          <span class="title">Edit bookmark</span>

          <span title="Cancel" onclick=${destroy} class="close-btn square">
            ${closeIcon()}
          </span>
        </div>

        <div class="body">
          <div>
            <label for="href-input">URL</label>
            <input required type="text" id="href-input" name="href" value=${href}/>

            <label for="title-input">Title</label>
            <input required type="text" id="title-input" name="title" value=${title} />

            <label for="tags">Tags</label>
            <input type="text" name="tags" value=${tags}/>
          </div>

          ${'' /* TODO(profiles) disabled -prf
          <label for="private">Private</label>
          <input type="checkbox" checked=${isPrivate} name="private"/> */}

          <label class="toggle">
            <input type="hidden" name="pinOrder" value=${pinOrder} />
            <input checked=${pinned} type="checkbox" name="pinned" value="pinned">
            <div class="switch"></div>
            <span class="text">Pin to start page</span>
          </label>

          <div class="actions">
            <button type="button" class="btn" onclick=${destroy} tabindex="2">Cancel</button>
            <button type="submit" class="btn primary" tabindex="1">Save</button>
          </div>

        </div>
      </form>
    </div>
  `
}

export function create (href, {title = '', tags = '', notes = '', isPrivate = true, pinned = false, pinOrder = undefined}) {
  // render interface
  var tagsStr = tags.toString().replace(',', ' ')
  var popup = render(href, {title, tags: tagsStr, notes, isPrivate, pinned, pinOrder})
  document.body.appendChild(popup)
  document.addEventListener('keyup', onKeyUp)

  // select input
  var input = popup.querySelector('input')
  input.focus()
  input.select()

  // return promise
  return new Promise((_resolve, _reject) => {
    resolve = _resolve
    reject = _reject
  })
}

export function destroy () {
  var popup = document.getElementById('edit-bookmark-popup')
  document.body.removeChild(popup)
  document.removeEventListener('keyup', onKeyUp)
  reject()
}

// event handlers
// =

function onKeyUp (e) {
  e.preventDefault()
  e.stopPropagation()

  if (e.keyCode === 27) {
    destroy()
  }
}

function onClickWrapper (e) {
  if (e.target.id === 'edit-bookmark-popup') {
    destroy()
  }
}

function onSubmit (e) {
  e.preventDefault()

  resolve({
    href: e.target.href.value,
    title: e.target.title.value,
    tags: e.target.tags.value.split(' ').filter(Boolean),
    // private: e.target.private.checked, TODO(profiles) disabled -prf
    pinned: e.target.pinned.checked,
    pinOrder: e.target.pinOrder.value
  })
  destroy()
}
