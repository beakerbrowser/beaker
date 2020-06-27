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
  background: rgba(0,0,0,.05);
}
@media (prefers-color-scheme: dark) {
  button:not(:disabled):hover {
    background: rgba(0,0,0,.2);
  }
}

button:disabled {
  opacity: 0.5;
}

button.pressed {
  background: rgba(0,0,0,.1);
  box-shadow: inset 0 2px 3px rgba(0,0,0,.2);
}
@media (prefers-color-scheme: dark) {
  button.pressed {
    background: rgba(0,0,0,.25);
  }
}
`