import {css} from '../vendor/lit-element/lit-element.js'

const cssStr = css`
.markdown :-webkit-any(h1, h2, h3, h4, h5) {
  font-family: arial;
}
.markdown pre { font-size: 13px; }
.markdown :-webkit-any(video, audio, img) { max-width: 100%; }
.markdown a { color: var(--text-color--markdown-link); }
.markdown hr { border: 0; border-bottom: 1px solid var(--border-color--semi-light); }
`
export default cssStr
