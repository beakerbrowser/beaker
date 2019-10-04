import {css} from '../../vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: flex;
}

a {
  border-bottom: 2px solid transparent;
  cursor: pointer;
}

a:hover {
  border-bottom-color: #aaa;
}

a.active {
  border-bottom-color: var(--blue);
}
`
export default cssStr
