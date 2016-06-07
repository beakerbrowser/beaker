
// globals
// =
var bookmarks

// exported api
// =

export function setup () {
  // load bookmarks from local storage
  try { bookmarks = JSON.parse(localStorage.bookmarks) }
  catch (e) {
    // set defaults
    bookmarks = [
      { name: 'Beaker Project', url: 'https://github.com/pfraze/beaker' },
      { name: 'Dat Project', url: 'http://dat-data.com/' },
      { name: 'DuckDuckGo (the default search engine)', url: 'https://duckduckgo.com' },
      { name: 'Test Dat Site', url: 'dat://dd727d096a12813f675bbe1a1438db8d444d0aee6446abc4e191ae8ee1da66fa/' }
    ]
  }

  // sort by name
  bookmarks.sort((a, b) => a.name.localeCompare(b.name))
}

export function getAll () {
  return bookmarks
}

export function setAll (bs) {
  bookmarks = bs
  localStorage.bookmarks = JSON.stringify(bs)
}