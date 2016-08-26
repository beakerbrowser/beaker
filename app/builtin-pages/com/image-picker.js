import * as yo from 'yo-yo'

export default function imagePicker (name, items, opts = {}) {
  var baseUrl = opts.baseUrl || ''
  return yo`<div class="image-picker">
    ${items.map(item => {
      return yo`<label>
        <input type="radio" name=${name} value=${item} />
        <img src=${baseUrl + item} />
      </label>`
    })}
  </div>`
}