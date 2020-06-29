import {css} from '../vendor/lit-element/lit-element.js'
const cssStr = css`
/**
 * New button styles
 * We should replace buttons.css with this
 */
button {
  --bg-color--button: #fff;
  --bg-color--button--hover: #f5f5f5;
  --bg-color--button--active: #eee;
  --bg-color--button--pressed: #6d6d79;
  --bg-color--button--disabled: #fff;
  --bg-color--primary-button: #5289f7;
  --bg-color--primary-button--hover: rgb(73, 126, 234);
  --bg-color--transparent-button: transparent;
  --bg-color--transparent-button--hover: #f5f5fa;
  --bg-color--transparent-button--pressed: rgba(0,0,0,.1);
  --bg-color--button-gray: #fafafa;
  --bg-color--button-gray--hover: #f5f5f5;
  --text-color--button: #333;
  --text-color--button--pressed: #fff;
  --text-color--button--disabled: #999;
  --text-color--primary-button: #fff;
  --border-color--button: #d4d7dc;
  --border-color--primary-button: #2864dc;
  --box-shadow-color--button: rgba(0,0,0,.05);
  --box-shadow-color--button--hover: rgba(0,0,0,.5);
  --box-shadow-color--transparent-button: rgba(0,0,0,.25);

  background: var(--bg-color--button);
  border: 1px solid var(--border-color--button);
  border-radius: 3px;
  box-shadow: 0 1px 1px var(--box-shadow-color--button);
  padding: 5px 10px;
  color: var(--text-color--button);
  outline: 0;
  cursor: pointer;
}

@media (prefers-color-scheme: dark) {
  button {
    --bg-color--button: #446;
    --bg-color--button--hover: #668;
    --bg-color--button--active: #eee;
    --bg-color--button--pressed: #6d6d79;
    --bg-color--button--disabled: #445;
    --bg-color--primary-button: #5289f7;
    --bg-color--primary-button--hover: rgb(73, 126, 234);
    --bg-color--transparent-button: transparent;
    --bg-color--transparent-button--hover: #445;
    --bg-color--transparent-button--pressed: rgba(0,0,0,.1);
    --bg-color--button-gray: #fafafa;
    --bg-color--button-gray--hover: #f5f5f5;
    --text-color--button: #ccd;
    --text-color--button--pressed: #fff;
    --text-color--button--disabled: #aac;
    --text-color--primary-button: #fff;
    --border-color--button: #779;
    --border-color--primary-button: #2864dc;
    --box-shadow-color--button: rgba(0,0,0,.05);
    --box-shadow-color--button--hover: rgba(0,0,0,.5);
    --box-shadow-color--transparent-button: rgba(0,0,0,.25);
  }
}

button:hover {
  background: var(--bg-color--button--hover);
}

button:active {
  background: var(--bg-color--button--active);
}

button.big {
  padding: 6px 12px;
}

button.block {
  display: block;
  width: 100%;
}

button.pressed {
  box-shadow: inset 0 1px 1px var(--box-shadow-color--button--hover);
  background: var(--bg-color--button--pressed);
  color: var(--text-color--button--pressed);
  border-color: transparent;
  border-radius: 4px;
}

button.primary {
  background: var(--bg-color--primary-button);
  border-color: var(--border-color--primary-button);
  color: var(--text-color--primary-button);
  box-shadow: 0 1px 1px rgba(0,0,0,.1);
}

button.primary:hover {
  background: var(--bg-color--primary-button--hover);
}

button.gray {
  background: var(--bg-color--button-gray);
}

button.gray:hover {
  background: var(--bg-color--button-gray--hover);
}

button[disabled] {
  border-color: var(--border-color) !important;
  background: var(--bg-color--button--disabled) !important;
  color: var(--text-color--button--disabled) !important;
  cursor: default !important;
}

button.rounded {
  border-radius: 16px;
}

button.flat {
  box-shadow: none; 
}

button.noborder {
  border-color: transparent;
}

button.transparent {
  background: var(--bg-color--transparent-button);
  border-color: transparent;
  box-shadow: none; 
}

button.transparent[disabled] {
  border-color: transparent !important;
}

button.transparent:hover {
  background: var(--bg-color--transparent-button--hover);
}

button.transparent.pressed {
  background: var(--bg-color--transparent-button--pressed);
  box-shadow: inset 0 1px 2px var(--box-shadow-color--transparent-button);
  color: inherit;
}

.radio-group button {
  background: transparent;
  border: 0;
  box-shadow: none;
}

.radio-group button.pressed {
  background: var(--bg-color--button--pressed);
  border-radius: 30px;
}

.btn-group {
  display: inline-flex;
}

.btn-group button {
  border-radius: 0;
  border-right-width: 0;
}

.btn-group button:first-child {
  border-top-left-radius: 3px;
  border-bottom-left-radius: 3px;
}

.btn-group button:last-child {
  border-top-right-radius: 3px;
  border-bottom-right-radius: 3px;
  border-right-width: 1px;
}

.btn-group.rounded button:first-child {
  border-top-left-radius: 14px;
  border-bottom-left-radius: 14px;
  padding-left: 14px;
}

.btn-group.rounded button:last-child {
  border-top-right-radius: 14px;
  border-bottom-right-radius: 14px;
  padding-right: 14px;
}
`
export default cssStr
