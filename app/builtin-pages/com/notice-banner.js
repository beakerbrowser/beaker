import yo from 'yo-yo'

export function create (type, content, button = 'Ok') {
  // remove any existing
  destroy(null, true)

  // add new notice-banner
  var icon = type === 'error' ? 'exclamation-triangle' : 'info-circle'
  document.body.appendChild(yo`
    <div id="notice-banner-wrapper" class="notice-banner-wrapper">
      <div class="notice-banner ${type}">
        <i class="fa fa-${icon}"></i>
        ${content}
        ${button ? yo`<a class="notice-banner-btn" onclick=${e => destroy(e)}>${button}</a>` : 'Ok'}
      </div>
    </div>`
  )
}

function destroy (e, fast = false) {
  if (e) e.preventDefault()

  var noticeBanner = document.getElementById('notice-banner-wrapper')
  if (!noticeBanner) return

  if (fast) {
    document.body.removeChild(noticeBanner)
  } else {
    // fadeout before removing element
    noticeBanner.classList.add('hidden')
    setTimeout(() => document.body.removeChild(noticeBanner), 500)
  }
}
