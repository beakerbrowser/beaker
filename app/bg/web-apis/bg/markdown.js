import markdown from '../../../lib/markdown'

const md = markdown({
  allowHTML: false,
  useHeadingIds: false,
  useHeadingAnchors: false,
  hrefMassager: undefined,
  highlight: undefined
})

export default {
  toHTML (str) {
    return md.render(str)
  }
}