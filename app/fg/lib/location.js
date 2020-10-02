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

  // optimistically set the input-based results to ensure responsiveness
  {
    if (ctx.results) ctx.results = ctx.results.filter(r => !r.search && !r.isGoto)
    ctx.results = ctx.results || []
    let gotoResult = { url: vWithProtocol, title: 'Go to ' + (ctx.inputValue || '/'), isGuessingTheScheme, isGoto: true }
    let searchResult = {
      search: ctx.inputValue,
      title: `Search ${searchEngine.name} for "${ctx.inputValue}"`,
      url: searchEngine.url + vSearch
    }
    if (ctx.inputValue.includes(' ')) ctx.results.unshift(searchResult)
    else if (isProbablyUrl) ctx.results = [gotoResult, searchResult].concat(ctx.results)
    else ctx.results = [searchResult, gotoResult].concat(ctx.results)
    onResults(true)
  }
  
  var [historyResults, networkQuery, bookmarks] = await Promise.all([
    ctx.inputValue ? bg.history.search(ctx.inputValue) : [],
    ctx.inputValue ? bg.index.gql(`
      records(search: "${ctx.inputValue}", paths: ["/bookmarks/*.goto"], limit: 10) {
        url
        path
        metadata
        site { title }
      }
    `) : undefined,
    ctx.bookmarksFetch
  ])

  // abort if changes to the input have occurred since triggering these queries
  if (queryId !== ctx.queryIdCounter) return

  // decorate results with bolded regions
  var searchTerms = ctx.inputValue.replace(/[:^*-./]/g, ' ').split(' ').filter(Boolean)
  var searchTermsRe = new RegExp(`(${searchTerms.join('|')})`, 'gi')
  var networkResults = networkQuery.records.map(record => networkResultToItem(record, searchTermsRe)).filter(Boolean)
  historyResults.forEach(r => highlightHistoryResult(searchTerms, r))

  if (ctx.inputValue) {
    if (historyResults.length > 5 && networkResults.length > 5) {
      finalResults = networkResults.slice(0, 5).concat(historyResults.slice(0, 5))
    } else {
      finalResults = networkResults.concat(historyResults)   
    }
    finalResults = _uniqWith(finalResults, (a, b) => normalizeURL(a.url) === normalizeURL(b.url)) // remove duplicates
    finalResults = finalResults.slice(0, 10) // apply limit
  } else {
    finalResults = bookmarks
  }

  // see if we have any URL guesses
  // we only do this if the input changed, in case the user deleted our suggested guess
  ctx.urlGuess = undefined
  if (ctx.lastInputValue !== ctx.inputValue) {
    for (let res of finalResults) {
      let start = 0
      if (!ctx.inputValue.includes('://')) {
        start = res.url.indexOf('://') + 3 // skip the scheme
      }
      if (!ctx.inputValue.includes('www.') && res.url.slice(start).startsWith('www.')) {
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

function networkResultToItem (record, termsRe) {
  if (record.path.startsWith('/bookmarks/')) {
    if (!record.metadata.href) return
    let title = record.metadata.title || record.metadata.href || ''
    return {
      url: record.metadata.href,
      title,
      titleDecorated: title.split(termsRe),
      origin: {icon: 'far fa-star', label: `Bookmarked by ${record.site.title}`}
    }
  }
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