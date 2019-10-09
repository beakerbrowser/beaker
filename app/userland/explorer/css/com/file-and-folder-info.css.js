import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  box-sizing: border-box;
  padding: 10px;
  border-radius: 8px;
  background: #f1f1f6;
}

section {
  background: #fff;
  padding: 16px 12px;
  border-radius: 8px;
  margin-bottom: 10px;
}

section > :first-child {
  margin-top: 0;
}

section > :last-child {
  margin-bottom: 0;
}

h3 {
  max-width: 100%;
  word-break: break-word;
}

.real-url {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

file-display {
  display: block;
  max-height: 500px;
  overflow: hidden;
}

`
export default cssStr