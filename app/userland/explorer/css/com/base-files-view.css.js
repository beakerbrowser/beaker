import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
}

.container {
  min-height: calc(100vh - 50px);
}

h4 {
  border-top: 1px solid #e3e3ee;
  color: #b0b0bc;
  padding-top: 6px;
  padding-left: 4px;
  margin: 0;
  user-select: none;
}

.empty {
  background: var(--bg-color--light);
  padding: 40px;
  margin: 14px 0;
  border-radius: 8px;
  color: #667;
}

.items {
  user-select: none;
}

.drag-selector {
  position: fixed;
  background: #5591ff33;
  border: 1px solid #77adffee;
  pointer-events: none;
}

`
export default cssStr