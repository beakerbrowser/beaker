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
  font-size: 15px;
  line-height: 1.4;
  max-width: 640px;
}

.markdown :-webkit-any(h1, h2, h3, h4, h5) {
  border: 0;
  padding: 0;
  line-height: 1;
  margin-top: 1.5em;
  margin-bottom: 1rem;
}

.markdown h1 { font-size: 36px; }
.markdown h2 { font-size: 24px; }
.markdown > :first-child { margin-top: 20px; }
`
export default cssStr