import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import typographyCSS from 'beaker://app-stdlib/css/typography.css.js'

const cssStr = css`
${typographyCSS}

:host {
  display: block;
  --text-font-size: 14px;
  --text-padding: 0;
  --text-background: transparent;
  --text-max-width: none;
}

a {
  text-decoration: none;
  color: var(--blue);
}

a:hover {
  text-decoration: underline;
}

.text {
  white-space: pre-wrap;
  max-width: 100%;
  font-style: normal;
  word-break: break-all;
  font-size: var(--text-font-size);
  padding: var(--text-padding);
  background: var(--text-background);
  max-width: var(--text-max-width);
  border-radius: 4px;
}

.markdown {
  padding: var(--text-padding);
  background: var(--text-background);
  max-width: var(--text-max-width);
  border-radius: 4px;
}

.markdown > :first-child {
  margin-top: 0;
}

.markdown > :last-child {
  margin-bottom: 0;
}

img,
video,
audio {
  max-width: 100%;
}

:host > img {
  border-radius: 4px;
}

:host([fullwidth]) > img {
  width: 100%;
  object-fit: cover;
  border-radius: 8px;
}

`
export default cssStr