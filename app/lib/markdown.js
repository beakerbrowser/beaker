import MarkdownIt from 'markdown-it'
import anchorMarkdownHeader from './anchor-markdown-header'

export default function create ({allowHTML, useHeadingIds, useHeadingAnchors, hrefMassager, highlight} = {}) {
  var md = MarkdownIt({
    html: allowHTML, // Enable HTML tags in source
    xhtmlOut: false, // Use '/' to close single tags (<br />)
    breaks: false, // Convert '\n' in paragraphs into <br>
    langPrefix: 'language-', // CSS language prefix for fenced blocks
    linkify: false, // Autoconvert URL-like text to links

    // Enable some language-neutral replacement + quotes beautification
    typographer: true,

    // Double + single quotes replacement pairs, when typographer enabled,
    // and smartquotes on. Set doubles to '«»' for Russian, '„“' for German.
    quotes: '“”‘’',

    // Highlighter function. Should return escaped HTML,
    // or '' if the source string is not changed
    highlight
  })

  if (useHeadingAnchors || useHeadingIds) {
    var numRepetitions = {}
    // heading anchor rendering
    md.renderer.rules.heading_open = function (tokens, idx /*, options, env */) {
      var txt = tokens[idx + 1].content || ''
      numRepetitions[txt] = (numRepetitions[txt]) ? numRepetitions[txt] + 1 : 0
      return '<' + tokens[idx].tag + ' id="' + anchorMarkdownHeader(txt, numRepetitions[txt]) + '">'
    }
    if (useHeadingAnchors) {
      md.renderer.rules.heading_close = function (tokens, idx /*, options, env */) {
        var txt = tokens[idx - 1].content || ''
        return '<a class="anchor-link" href="#' + anchorMarkdownHeader(txt, numRepetitions[txt]) + '">#</a></' + tokens[idx].tag + '>\n'
      }
    }
  }

  if (hrefMassager) {
    // link modifier
    let orgLinkOpen = md.renderer.rules.link_open
    md.renderer.rules.link_open = function (tokens, idx, options /* env */) {
      var i = tokens[idx].attrs.findIndex(attr => attr[0] === 'href')
      let href = hrefMassager(tokens[idx].attrs[i][1], 'a')
      if (!href) return ''
      tokens[idx].attrs[i][1] = href
      if (orgLinkOpen) return orgLinkOpen.apply(null, arguments)
      return md.renderer.renderToken.apply(md.renderer, arguments)
    }
    let orgImage = md.renderer.rules.image
    md.renderer.rules.image = function (tokens, idx, options /* env */) {
      var i = tokens[idx].attrs.findIndex(attr => attr[0] === 'src')
      let src = hrefMassager(tokens[idx].attrs[i][1], 'img')
      if (!src) return ''
      tokens[idx].attrs[i][1] = src
      if (orgImage) return orgImage.apply(null, arguments)
      return md.renderer.renderToken.apply(md.renderer, arguments)
    }
  }

  return md
}
