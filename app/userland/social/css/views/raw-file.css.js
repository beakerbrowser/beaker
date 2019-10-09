import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: block;
}

h3 {
  margin: 0 0 10px;
}

pre {
  max-width: 100%;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  padding: 10px 12px;
  background: #f5f5fa;
  border-radius: 4px;
}

img,
video,
audio {
  max-width: 100%;
}
`
export default cssStr