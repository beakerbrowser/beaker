import {css} from '../vendor/lit-element/lit-element.js'

const cssStr = css`
.markdown :-webkit-any(h1, h2, h3, h4, h5) {
  font-family: arial;
}
.markdown pre { font-size: 13px; }
.markdown :-webkit-any(video, audio, img) { max-width: 100%; }
.markdown a { color: var(--text-color--markdown-link); }
.markdown hr { border: 0; border-bottom: 1px solid var(--border-color--semi-light); }
.markdown blockquote {
  border-left: 10px solid var(--bg-color--semi-light);
  margin: 0 0 0.6em;
  padding: 10px 0px 10px 20px;
  color: var(--text-color--light);
}
.subject-content .markdown blockquote + blockquote {
  margin-top: -14px;
}
.subject-content .markdown blockquote p {
  margin: 0;
}
`
export default cssStr
