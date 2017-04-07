import * as yo from 'yo-yo'

// exported api
// =

export function render (values, onSaveOptions, onToggleOptions) {
  values = values || defaultValues()
  return yo`<div class="editor-options">
    <form onsubmit=${onSubmit({values, onSaveOptions})}>
      ${rWordWrap(values)}
      ${rTabs(values)}
      <p>
        <button type="submit" class="btn">Close</button>
      </p>
    </form>
  </div>`
}

export function defaultEditorOptions () {
  return {
    wordWrap: 'auto',
    wordWrapLength: '80',
    tabs: 'spaces',
    tabWidth: '2'
  }
}

// event handlers
// =

function onSubmit ({values, onSaveOptions}) {
  return e => {
    e.preventDefault()

    // extract values
    var formEl = e.target
    for (var k in values) {
      let inputEl = formEl[k]
      if (!inputEl) continue
      if (inputEl.type === 'checkbox') {
        values[k] = (inputEl.checked) ? true : false
      } else {
        values[k] = inputEl.value
      }
    }
    onSaveOptions(values)
  }
}

// rendering
// =

function rWordWrap (values) {
  return yo`<fieldset>
    <legend>Word Wrap</legend>
    <label>${rRadio('wordWrap', 'off', values)} Off</label>
    <label>${rRadio('wordWrap', 'auto', values)} Automatic</label>
    <label>${rRadio('wordWrap', 'fixed', values)} Fixed: <input type="text" name="wordWrapLength" value=${values.wordWrapLength}></label>
  </fieldset>`
}

function rTabs (values) {
  return yo`<fieldset>
    <legend>Tabs</legend>
    <label>${rRadio('tabs', 'tabs', values)} Tabs</label>
    <label>${rRadio('tabs', 'spaces', values)} Spaces: <input type="text" name="tabWidth" value=${values.tabWidth}></label>
  </fieldset>`
}

function rCheckbox (name, value, values) {
  return yo`<input type="checkbox" name=${name} value=${value} ${values[name] ? 'checked' : ''} />`
}

function rRadio (name, value, values) {
  return yo`<input type="radio" name=${name} value=${value} ${values[name] === value ? 'checked' : ''} />`
}