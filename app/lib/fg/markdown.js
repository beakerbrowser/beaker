import MarkdownIt from 'markdown-it'

export default function create ({allowHTML, useHeadingAnchors, hrefMassager} = {}) {
  var md = MarkdownIt({
    html: allowHTML, // Enable HTML tags in source
    xhtmlOut: false, // Use '/' to close single tags (<br />)
    breaks: true, // Convert '\n' in paragraphs into <br>
    langPrefix: 'language-', // CSS language prefix for fenced blocks
    linkify: true, // Autoconvert URL-like text to links

    // Enable some language-neutral replacement + quotes beautification
    typographer: true,

    // Double + single quotes replacement pairs, when typographer enabled,
    // and smartquotes on. Set doubles to '«»' for Russian, '„“' for German.
    quotes: '“”‘’',

    // Highlighter function. Should return escaped HTML,
    // or '' if the source string is not changed
    highlight: function (/* str, lang */) { return '' }
  })

  if (useHeadingAnchors) {
    // heading anchor rendering
    md.renderer.rules.heading_open = function (tokens, idx /*, options, env */) {
      return '<' + tokens[idx].tag + ' id="' + slugify(tokens[idx + 1].content || '') + '">'
    }
    md.renderer.rules.heading_close = function (tokens, idx /*, options, env */) {
      return '<a class="anchor-link" href="#' + slugify(tokens[idx - 1].content || '') + '">#</a></' + tokens[idx].tag + '>\n'
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

function slugify (text) {
  // Regex for finding the nonsafe URL characters (many need escaping): & +$,:;=?@"#{}|^~[`%!'<>]./()*\
  var nonsafeChars = /[& +$,:;=?@"#{}|^~[`%!'<>\]./()*\\]/g
  var slug

  // Note: we trim hyphens after truncating because truncating can cause dangling hyphens.
  // Example string:                               // "⚡⚡ Don't forget: URL fragments should be i18n-friendly, hyphenated, short, and clean."
  slug = text.trim() // "⚡⚡ Don't forget: URL fragments should be i18n-friendly, hyphenated, short, and clean."
    .replace(/'/gi, '') // "⚡⚡ Dont forget: URL fragments should be i18n-friendly, hyphenated, short, and clean."
    .replace(nonsafeChars, '-') // "⚡⚡-Dont-forget--URL-fragments-should-be-i18n-friendly--hyphenated--short--and-clean-"
    .replace(/-{2,}/g, '-') // "⚡⚡-Dont-forget-URL-fragments-should-be-i18n-friendly-hyphenated-short-and-clean-"
    .replace(/^-+|-+$/gm, '') // "⚡⚡-Dont-forget-URL-fragments-should-be-i18n-friendly-hyphenated"
    .toLowerCase() // "⚡⚡-dont-forget-url-fragments-should-be-i18n-friendly-hyphenated"

  return slug
};
