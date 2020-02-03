import _get from 'lodash.get'

const WEBSITE_INDEX_SCAFFOLD = `<!doctype html5>
<html>
  <head>
    <meta charset="utf-8">
    <link rel="stylesheet" href="/styles.css">
  </head>
  <body>
    <main>
      <h1>New website</h1>
      <p>
        This website was created with <a href="https://beakerbrowser.com/" title="The Beaker Browser">The Beaker Browser</a>.
      </p>

      <hr>

      <p>
        Want to share this website with friends? Share the URL:
      </p>

      <p><a href="/" id="url"></a></p>

      <hr>

      <p>
        Learn more about how HTML works: <a href="https://developer.mozilla.org/en-US/docs/Learn/HTML/Introduction_to_HTML">MDN Introduction to HTML</a>.
      </p>
    </main>
    <script type="module" src="/scripts.js"></script>
  </body>
</html>
`

const WEBSITE_CSS_SCAFFOLD = `body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background: #fafafd;
}

main {
  max-width: 800px;
  margin: 0 auto;
  padding: 1rem 1.5rem;
  box-sizing: border-box;
  height: 100vh;
  background: #fff;
}

main h1 {
  margin: 2rem 0;
}

main hr {
  border: 0;
  border-top: 1px solid #ccd;
  margin: 2rem 0;
}
`

const WEBSITE_JS_SCAFFOLD = `console.log("Hello, world!")
document.getElementById('url').textContent = location.toString()
`

export const BUILTIN_TYPES = [
  {type: '', theme: '', title: 'Files Drive', img: 'files-drive'},
  {type: 'website', theme: '', title: 'Website', img: 'website', scaffold: [
    {pathname: '/index.html', content: WEBSITE_INDEX_SCAFFOLD},
    {pathname: '/styles.css', content: WEBSITE_CSS_SCAFFOLD},
    {pathname: '/scripts.js', content: WEBSITE_JS_SCAFFOLD}
  ]},
  {type: 'wiki', theme: 'builtin:simple-wiki', img: 'simple-wiki', title: 'Wiki Site'},
  {type: 'module', theme: 'builtin:simple-module', img: 'simple-module', title: 'Module'}
]

export const BUILTIN_THEMES = [
  {url: 'builtin:blogger', title: 'Blogger', manifest: {theme: {drive_types: 'user'}}},
  {url: 'builtin:simple-wiki', title: 'Simple Wiki', manifest: {theme: {drive_types: 'website'}}},
  {url: 'builtin:simple-module', title: 'Simple Module', manifest: {theme: {drive_types: 'module'}}}
]

export function filterThemeByType (manifest, targetType) {
  var matchingTypes = _get(manifest, 'theme.drive_types', undefined)
  if (!matchingTypes) return true
  matchingTypes = Array.isArray(matchingTypes) ? matchingTypes : [matchingTypes]
  for (let matchingType of matchingTypes) {
    if (matchingType === '*') return true
    if (!matchingType && !targetType) return true
    if (matchingType === targetType) return true
  }
  return false
}