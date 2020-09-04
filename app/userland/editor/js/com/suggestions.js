/* globals monaco */

export default function registerSuggestions () {
  MarkdownSuggestions.register()
}

export class MarkdownSuggestions {
  constructor () {
    this.mdLinkQueryRegex = /\[(.*?)\]/
    this.mdMentionQueryRegex = /@(\w*)/
    this.searchDebouncer = debouncer(100)
    beaker.hyperdrive.readFile('hyper://private/address-book.json', 'json').then(async (addrs) => {
      this.profile = await beaker.hyperdrive.getInfo(addrs?.profiles?.[0]?.key)
    })
  }

  static register () {
    // TODO: Currently must provide "wildcard" trigger characters (workaround).
    const triggerCharacters = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789']
    const handler = new MarkdownSuggestions()
    monaco.languages.registerCompletionItemProvider('markdown', {
      triggerCharacters,
      provideCompletionItems: handler.provideCompletionItems.bind(handler)
    })
  }

  async completeLinkSuggestions (term, match, value) {
    // If the query is only one char, wait until it's longer.
    if (term.length === 1) {
      return null
    }
    const queryResults = await this.searchDebouncer(() => beaker.index.searchRecords(term, {
      file: [
        {prefix: '/blog', extension: '.md'},
        {prefix: '/pages', extension: '.md'}
      ],
      limit: 10,
      sort: 'rank',
      reverse: true
    }))
    const suggestions = queryResults.map(s => {
      const type = ({
        '/blog': 'blogpost',
        '/pages': 'page'
      })[s.prefix]
      const title = s.metadata.title || s.url.split('/').pop()
      const detail = s.site.title
      return {
        kind: 7, // "Interface"
        label: title ? `(${type}) - ${title}` : `(${type})`,
        detail,
        range: match.range,
        filterText: value,
        insertText: `[${title}](${s.url})`
      }
    })
    return { suggestions }
  }

  async completePeopleSuggestions (term, match, value) {
    const queryResults = await this.searchDebouncer(() => beaker.index.searchRecords(term, {
      file: {prefix: '/subscriptions', extension: '.goto'},
      site: `hyper://${this.profile?.key}`,
      limit: 10,
      sort: 'rank',
      reverse: true
    }))
    const suggestions = queryResults.map(s => {
      return {
        kind: 7, // "Interface"
        label: s.metadata.title,
        range: match.range,
        filterText: value,
        insertText: `[@${s.metadata.title}](${s.metadata.href})`
      }
    })

    {
      let title = this.profile?.title.toLowerCase() || ''
      if (title.includes(term.toLowerCase())) {
        suggestions.unshift({
          kind: 7, // "Interface"
          label: this.profile.title,
          range: match.range,
          filterText: value,
          insertText: `[@${this.profile.title}](hyper://${this.profile.key})`
        })
      }
    }

    return { suggestions }
  }

  async provideCompletionItems (model, position) {
    // link match
    var matches = model.findMatches(this.mdLinkQueryRegex, {
      startColumn: 1,
      endColumn: model.getLineMaxColumn(position.lineNumber),
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber
    }, true, false, null, true)
    var match = matches.length && matches.find(m => m.range.containsPosition(position))
    if (match) {
      let term = match.matches[1]
      let value = model.getValueInRange(match.range) 
      if (term.startsWith('@')) return this.completePeopleSuggestions(term.slice(1), match, value)
      return this.completeLinkSuggestions(term, match, value)
    }

    // mention match
    var matches = model.findMatches(this.mdMentionQueryRegex, {
      startColumn: 1,
      endColumn: model.getLineMaxColumn(position.lineNumber),
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber
    }, true, false, null, true)
    var match = matches.length && matches.find(m => m.range.containsPosition(position))
    if (match) {
      let term = match.matches[1]
      let value = model.getValueInRange(match.range) 
      return this.completePeopleSuggestions(term, match, value)
    }

    return null
  }
}

function debouncer (ms, fallback) {
  let stack = []
  let running = false

  async function pop () {
    if (!stack.length) {
      running = false
      return
    }
    running = true
    const startTime = Date.now()
    const { run, cancel } = stack.pop()
    for (let i = 0; i < stack.length; i++) {
      stack.pop().cancel()
    }
    try {
      await run()
    } finally {
      const diff = ms - (Date.now() - startTime)
      if (diff < 0) return pop()
      else setTimeout(pop, diff)
    }
  }

  return async function push (task) {
    return new Promise((resolve, reject) => {
      stack.push({
        run: () => task().then(resolve, reject),
        // Resolve with empty search results if cancelled.
        cancel: () => resolve(fallback)
      })
      if (!running) pop()
    })
  }
}