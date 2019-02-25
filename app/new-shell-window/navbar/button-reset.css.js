import {css} from '../../vendor/lit-element/lit-element'

export default css`
button {
  background: transparent;
  border: 0;
  border-radius: 4px;
  padding: 0;
}

button:focus {
  outline: 0;
}

button:not(:disabled):hover {
  background: rgba(0,0,0,.1);
}

button:disabled {
  opacity: 0.5;
}
`