import yo from 'yo-yo'

// exported api
// =

export default function renderBackLink () {
  return yo`
    <p class="back-link">
      <a href="#" class="link">
        <i class="fa fa-angle-left"></i>
        Back
      </a>
    </p>`
}