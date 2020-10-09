const fs = require('fs')
const path = require('path')

const litElementPath = path.join(__dirname, '..', 'vendor', 'lit-element', 'lit-element.js')
console.log('Path:', litElementPath)
const cssdir = path.join(__dirname, '..', 'css')
handleFolder(cssdir)

function handleFolder (dirpath) {
  console.log('->', dirpath)
  for (let name of fs.readdirSync(dirpath)) {
    let itempath = path.join(dirpath, name)
    let stat = fs.statSync(itempath)
    if (stat.isDirectory()) {
      handleFolder(itempath)
    } else if (itempath.endsWith('.css')) {
      handleCSSFile(itempath)
    }
  }
}

// generates the css-js files
function handleCSSFile (cssPath) {
  const cssJsPath = cssPathToJsPath(cssPath)
  console.log('Generating', cssJsPath)

  // read the css
  const css = fs.readFileSync(cssPath, 'utf8')

  // replace the css imports with js imports
  const [newCss, imports] = extractAndReplaceImports(css)

  // write the css-js file
  fs.writeFileSync(cssJsPath, `import {css} from '${path.relative(path.dirname(cssPath), litElementPath)}'
${imports}
const cssStr = css\`
${newCss}
\`
export default cssStr
`)
}

// converts a css path to a css-js path
// eg reset.css -> reset.css.js
function cssPathToJsPath (cssPath) {
  return cssPath.slice(0, cssPath.length - '.css'.length) + '.css.js'
}

// finds all css imports and converts them into css-js module imports
// eg @import "./reset.less" -> import resetcss from './reset.css.js'
function extractAndReplaceImports (css) {
  var imports = []
  var newCss = css.replace(/^@import "([^"]*)";$/gm, (line, path) => {
    const importObj = {
      path: cssPathToJsPath(path),
      varname: path.split('/').pop().replace(/\./g, '').replace(/-/g, '')
    }
    imports.push(importObj)
    return `\${${importObj.varname}}`
  })
  var importsStr = imports.map(i => `import ${i.varname} from '${i.path}'`).join('\n')
  return [newCss, importsStr]
}