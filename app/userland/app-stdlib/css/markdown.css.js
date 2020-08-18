import {css} from '../vendor/lit-element/lit-element.js'

const cssStr = css`
.markdown :-webkit-any(h1, h2, h3, h4, h5) {
  font-family: arial;
  color: var(--text-color--light);
}
.markdown h1 { font-size: 21px; font-weight: 600; padding-bottom: 5px; border-bottom: 1px solid var(--border-color--semi-light); }
.markdown h2 { font-size: 19px; font-weight: 600; padding-bottom: 4px; border-bottom: 1px solid var(--border-color--semi-light); }
.markdown h3 { font-size: 19px; font-weight: 500; }
.markdown h4 { font-size: 16px; font-weight: 600; }
.markdown h5 { font-size: 16px; font-weight: 500; }
.markdown pre { font-size: 13px; }
.markdown :-webkit-any(video, audio, img) { max-width: 100%; }
.markdown a { color: var(--text-color--markdown-link); }
.markdown hr { border: 0; border-bottom: 1px solid var(--border-color--semi-light); }
`
export default cssStr
