import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import markdownCSS from 'beaker://app-stdlib/css/markdown.css.js'

const cssStr = css`
${markdownCSS}

a {
  text-decoration: none;
  color: #2864dc;
}

a:hover {
  text-decoration: underline;
}

.markdown {
  display: block;
  margin: 20px 0 10px;
}

.markdown > :first-child {
  padding-top: 14px;
  margin-top: 0;
}

.markdown > :last-child {
  padding-bottom: 16px;
  margin-bottom: 0;
}
`
export default cssStr