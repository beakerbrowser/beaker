import yo from 'yo-yo'

var editValues = {}
var saveSuccess = {}

export default function render (opts) {
  var {key, value, label, placeholder} = opts
  var editedValue = editValues[key]
  var isEditing = editedValue !== undefined && editedValue !== value

  placeholder = placeholder || `Set ${label || key}`

  return yo`
    <form class="input-group ${getClassname(key)}">
      <input type="text" name=${key} value=${isEditing ? editedValue : value} onkeyup=${e => onKeyupSettingsEdit(e, opts)} placeholder=${placeholder}>
      <button disabled="${!isEditing}" class="btn" onclick=${e => onSaveSettingsEdit(e, opts)}>
        Save
      </button>
      ${saveSuccess[key]
        ? yo`
          <span class="success-message">
            <i class="fa fa-check"></i>
          </span>`
        : ''
      }
    </form>`
}

// internal methods
// =

function getClassname (key) {
  return `settings-field-${key}`
}

function rerender (opts) {
  var el = document.querySelector('.' + getClassname(opts.key))
  if (el) yo.update(el, render(opts))
}

function onKeyupSettingsEdit (e, opts) {
  editValues[opts.key] = e.target.value
  rerender(opts)
}

async function onSaveSettingsEdit (e, opts) {
  e.preventDefault()
  e.stopPropagation()

  // validate
  let value = e.target.form.querySelector('input').value
  if (opts.validate && !opts.validate(value)) {
    return
  }

  // update
  opts.value = value
  await opts.onUpdate(opts.key, value)
  saveSuccess[opts.key] = true
  editValues[opts.key] = undefined
  rerender(opts)

  setTimeout(() => {
    saveSuccess[opts.key] = false
    rerender(opts)
  }, 4000)

  // blur the input
  try { document.querySelector('input:focus').blur() } catch (e) { /* no input focused */ }
}
