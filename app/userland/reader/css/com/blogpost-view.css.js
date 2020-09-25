import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'
import markdownCSS from 'beaker://app-stdlib/css/markdown.css.js'

const cssStr = css`
${spinnerCSS}
${markdownCSS}

:host {
  display: block;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.postmeta {
  width: 180px;
  float: right;
  padding: 20px 10px;
  margin: 0 20px 20px;
  text-align: center;
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  font-size: 15px;
}

.postmeta > * {
  display: block;
}

.postmeta .thumb img {
  width: 80px;
  height: 80px;
  border-radius: 50px;
  object-fit: cover;
}

.postmeta .author {
  font-size: 21px;
  font-weight: bold;
  color: inherit;
}

.content {
  max-width: 90ch;
  margin: 10px 20px;
}

.markdown {
  line-height: 1.4;
  letter-spacing: 0.1px;
  margin-bottom: 30px;
  font-size: 15px;
}

.markdown > :first-child {
  margin-top: 0;
}

.markdown :-webkit-any(h1, h2, h3, h4, h5) {
  font-family: arial;
}

.markdown hr {
  border: 0;
  border-top: 1px solid var(--border-color--light);
  margin: 2em 0;
}

.markdown blockquote {
  border-left: 10px solid var(--bg-color--semi-light);
  margin: 0 0 0.6em;
  padding: 10px 0px 10px 20px;
  color: var(--text-color--light);
}

.markdown blockquote + blockquote {
  margin-top: -14px;
}

.markdown blockquote p {
  margin: 0;
}

.markdown * {
  max-width: 100%;
}

`
export default cssStr