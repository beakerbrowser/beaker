import { examineLocationInput } from '../../lib/urls'
import { joinPath } from '../../lib/strings'
import _uniqWith from 'lodash.uniqwith'

/**
 * Used by ../shell-window/navbar/location.js
 * Mainly put here to keep that file from growing too large
 * 
 * @param {Object} bg 
 * @param {Object} ctx 
 * @param {Function} onResults 
 */
export async function queryAutocomplete (bg, ctx, onResults) {
  var queryId = ++ctx.queryIdCounter
  var finalResults
  
  var searchEngines = await ctx.searchEnginesPromise
  var searchEngine = searchEngines.find(se => se.selected) || searchEngines[0]
  var {vWithProtocol, vSearch, isProbablyUrl, isGuessingTheScheme} = examineLocationInput(ctx.inputValue || '/')

  var [historyResults, bookmarks] = await Promise.all([
    ctx.inputValue ? bg.history.search(ctx.inputValue) : [],
    ctx.bookmarksFetch
  ])

  var bookmarkResults = [];
  {
    let query = ctx.inputValue.toLowerCase()
    for (let bookmark of bookmarks) {
      let titleIndex = bookmark.title.toLowerCase().indexOf(query)
      let hrefIndex = bookmark.href.indexOf(query)
      if (titleIndex === -1 && hrefIndex === -1) {
        continue
      }

      var titleDecorated = undefined
      if (titleIndex !== -1) {
        let t = bookmark.title
        let start = titleIndex
        let end = start + query.length
        titleDecorated = [t.slice(0, start), t.slice(start, end), t.slice(end)]
      }

      var urlDecorated = undefined
      if (hrefIndex !== -1) {
        let h = bookmark.href
        let start = hrefIndex
        let end = start + query.length
        urlDecorated = [h.slice(0, start), h.slice(start, end), h.slice(end)]
      }

      bookmarkResults.push({
        isBookmark: true,
        url: bookmark.href,
        urlDecorated,
        title: bookmark.title,
        titleDecorated
      })
    }
  }

  // abort if changes to the input have occurred since triggering these queries
  if (queryId !== ctx.queryIdCounter) return

  // decorate results with bolded regions
  var searchTerms = ctx.inputValue.replace(/[:^*-./]/g, ' ').split(' ').filter(Boolean)
  historyResults.forEach(r => highlightHistoryResult(searchTerms, r))

  finalResults = bookmarkResults.concat(historyResults)
  finalResults = _uniqWith(finalResults, (a, b) => normalizeURL(a.url) === normalizeURL(b.url)) // remove duplicates
  finalResults = finalResults.slice(0, 10) // apply limit

  // see if we have any URL guesses
  // we only do this if the input changed, in case the user deleted our suggested guess
  ctx.urlGuess = undefined
  if (ctx.lastInputValue !== ctx.inputValue) {
    for (let res of finalResults) {
      let start = res.url.indexOf('://') + 3 // skip the scheme
      if (res.url.slice(start).startsWith('www.')) {
        start += 4 // skip the www.
      }
      let index = res.url.indexOf(ctx.inputValue, start)
      if (index === start) {
        // match, guess up to the next path segment
        let nextSlashIndex = res.url.indexOf('/', start + ctx.inputValue.length)
        ctx.urlGuess = {
          input: res.url.slice(start, nextSlashIndex === -1 ? undefined : nextSlashIndex),
          url: nextSlashIndex === -1 ? res.url : res.url.slice(0, nextSlashIndex)
        }
        break
      }
    }
  }

  // set the top results accordingly
  var gotoResult
  var searchResult = {
    search: ctx.inputValue,
    title: `Search ${searchEngine.name} for "${ctx.inputValue}"`,
    url: searchEngine.url + vSearch
  }
  if (ctx.urlGuess) {
    gotoResult = { url: ctx.urlGuess.url, title: 'Go to ' + (ctx.urlGuess.input), isGuessingTheScheme: false, isGoto: true }
    isProbablyUrl = true
  } else {
    gotoResult = { url: vWithProtocol, title: 'Go to ' + (ctx.inputValue || '/'), isGuessingTheScheme, isGoto: true }
  }
  if (ctx.inputValue.includes(' ')) finalResults = [searchResult].concat(finalResults)
  else if (isProbablyUrl) finalResults = [gotoResult, searchResult].concat(finalResults)
  else finalResults = [searchResult, gotoResult].concat(finalResults)

  // render
  ctx.results = finalResults
  ctx.lastInputValue = ctx.inputValue
  onResults()
}

// helper for history search results
// - takes in the current search (tokenized) and a result object
// - mutates `result` so that matching text is bold
var offsetsRegex = /([\d]+ [\d]+ [\d]+ [\d]+)/g
function highlightHistoryResult (searchTerms, result) {
  // extract offsets
  var tuples = (result.offsets || '').match(offsetsRegex)
  if (!tuples) { return }

  // iterate all match tuples, and break the values into segments
  let lastTuple
  let segments = { url: [], title: [] }
  let lastOffset = { url: 0, title: 0 }
  for (let tuple of tuples) {
    tuple = tuple.split(' ').map(i => +i) // the map() coerces to the proper type
    let [ columnIndex, termIndex, offset ] = tuple
    let columnName = ['url', 'title'][columnIndex]

    // sometimes multiple terms can hit at the same point
    // that breaks the algorithm, so skip that condition
    if (lastTuple && lastTuple[0] === columnIndex && lastTuple[2] === offset) continue
    lastTuple = tuple

    // use the length of the search term
    // (sqlite FTS gives the length of the full matching token, which isnt as helpful)
    let searchTerm = searchTerms[termIndex]
    if (!searchTerm) continue
    let len = searchTerm.length

    // extract segments
    segments[columnName].push(result[columnName].slice(lastOffset[columnName], offset))
    segments[columnName].push(result[columnName].slice(offset, offset + len))
    lastOffset[columnName] = offset + len
  }

  // add the remaining text
  segments.url.push(result.url.slice(lastOffset.url))
  segments.title.push(result.title.slice(lastOffset.title))


  result.urlDecorated = segments.url
  result.titleDecorated = segments.title
}

const TRAILING_SLASH_REGEX = /(\/$)/
function normalizeURL (str = '') {
  return str.replace(TRAILING_SLASH_REGEX, '')
}