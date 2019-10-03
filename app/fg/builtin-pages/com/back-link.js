import yo from 'yo-yo'

// exported api
// =

export default function renderBackLink (href, text='Back') {
  return yo`
    <p class="back-link">
      <a href="${href}" class="link">
        <i class="fa fa-angle-left"></i>
        ${text}
      </a>
    </p>`
}