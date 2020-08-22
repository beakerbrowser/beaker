import markdown from '../../../lib/markdown'

const mdNoHTML = markdown({
  allowHTML: false,
  useHeadingIds: false,
  useHeadingAnchors: false,
  hrefMassager: undefined,
  highlight: undefined
})
const mdWithHTML = markdown({
  allowHTML: true,
  useHeadingIds: false,
  useHeadingAnchors: false,
  hrefMassager: undefined,
  highlight: undefined
})

export default {
  toHTML (str, {allowHTML} = {}) {
    if (allowHTML) return mdWithHTML.render(str)
    return mdNoHTML.render(str)
  }
}