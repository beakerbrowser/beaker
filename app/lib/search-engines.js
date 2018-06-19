
// TODO: autoCompleteCallback takes a string, calls the search engine autocomplete API,
// and gives back a result / some results so that we can show a result (or results) as
// the user types in the address bar? Maybe in a separate pull request...

var searchEngines = [
  {
    name: "DuckDuckGo",
    makeQueryUrl: (text) => `https://duckduckgo.com?q=${encodeURIComponent(text)}`,
    autoCompleteCallback: (searchStr, cb) => {}
  },
  {
    name: "Google",
    makeQueryUrl: (text) => `https://google.com/search?q=${encodeURIComponent(text)}`,
    autoCompleteCallback: (searchStr, cb) => {}
  }
]

export function getDefaultSearchEngine() {
  return searchEngines[0];
}

export function getAvailableSearchEngines() {
  return searchEngines.map(engine => engine.name)
}

export function getSearchEngineOrDefault(name) {
  if (!name) {
    return getDefaultSearchEngine();
  } else {
    return searchEngines.find( engine => engine.name === name ) || getDefaultSearchEngine();  
  }
}
