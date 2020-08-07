/* globals monaco */

export default function registerSuggestions () {
  MarkdownSuggestions.register()
}

export class MarkdownSuggestions {
  constructor () {
    this.mdQueryRegex = /\[\[(.*?)\]\]/
    this.searchDebouncer = debouncer(100)
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
    const queryResults = await this.searchDebouncer(() => beaker.indexer.search(term, {
      limit: 10,
      sort: 'rank',
      reverse: true
    }))
    const suggestions = queryResults.map(s => {
      const type = s.metadata.type ? s.metadata.type.slice(7) : 'unknown'
      const title = s.metadata['beaker/title'] || ''
      const detail = s.content ? s.content.slice(0, 250) + '...' : ''
      const prefix = title ? `(${type}) - ${title}` : `(${type})`
      // Render the detail in the label because Intellisense rendering adds too much spacing.
      const label = `${prefix}: ${detail}`
      return {
        label,
        detail,
        range: match.range,
        filterText: value,
        insertText: `[${title || s.url}](${s.url})`
      }
    })
    return { suggestions }
  }

  async completePeopleSuggestions (term, match, value) {
    term = term.toLowerCase()
    const contacts = await this.searchDebouncer(() => beaker.contacts.list())
    // No fuzzy searching here for now.
    const matches = contacts.filter(c => c.title.toLowerCase().startsWith(term.slice(1)))
    const suggestions = matches.map(m => {
      return {
        label: `${m.title} - ${m.description}`,
        detail: m.description,
        range: match.range,
        filterText: value,
        insertText: `[${m.title}](${m.url})`
      }
    })
    return { suggestions }
  }

  async provideCompletionItems (model, position) {
    const matches = model.findMatches(this.mdQueryRegex, {
      startColumn: 1,
      endColumn: model.getLineMaxColumn(position.lineNumber),
      startLineNumber: position.lineNumber,
      endLineNumber: position.lineNumber
    }, true, false, null, true)
    const match = matches.length && matches.find(m => m.range.containsPosition(position))
    if (!match) return null
    const term = match.matches[1]
    const value = model.getValueInRange(match.range) 
    if (term.startsWith('@')) return this.completePeopleSuggestions(term, match, value)
    return this.completeLinkSuggestions(term, match, value)
  }
}

function debouncer (ms) {
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
        cancel: () => resolve([])
      })
      if (!running) pop()
    })
  }
}