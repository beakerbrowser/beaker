import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import typographyCSS from 'beaker://app-stdlib/css/typography.css.js'

const cssStr = css`
${typographyCSS}

:host {
}

.text {
  white-space: pre-wrap;
  max-width: 100%;
  font-family: var(--code-font);
  font-style: normal;
  font-size: 12px;
  word-break: break-all;
}

img,
video,
audio {
  max-width: 100%;
}

`
export default cssStr