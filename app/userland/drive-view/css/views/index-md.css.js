import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import markdownCSS from 'beaker://app-stdlib/css/markdown.css.js'

const cssStr = css`
${markdownCSS}

:host {
  display: block;
}

a {
  text-decoration: none;
  color: #2864dc;
}

a:hover {
  text-decoration: underline;
}

.markdown {
  display: block;
  font-size: 15px;
  line-height: 1.4;
  padding: 40px 20px 40px 0;
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