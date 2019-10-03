import {css} from '../../app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: block;
}

.close-btn {
  position: absolute;
  top: 1px;
  right: 2px;
  padding: 5px;
  color: #fff;
  border-radius: 3px;
  background: #222;
}

.close-btn:hover {
  background: #444;
}
`
export default cssStr