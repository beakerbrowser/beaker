import {css} from '../vendor/lit-element/lit-element.js'

const cssStr = css`
/**
 * New button styles
 * We should replace buttons.css with this
 */

button {
  background: #fff;
  border: 1px solid #d4d7dc;
  border-radius: 3px;
  box-shadow: 0 1px 1px rgba(0,0,0,.05);
  padding: 5px 10px;
  color: #333;
  outline: 0;
}

button:active {
  background: #eee;
}

button.pressed {
  box-shadow: inset 0 1px 1px rgba(0,0,0,.5);
  background: #6d6d79;
  color: rgba(255,255,255,1);
  border-color: transparent;
  border-radius: 4px;
}

button.primary {
  background: #5289f7;
  border-color: #2864dc;
  color: #fff;
  box-shadow: 0 1px 1px rgba(0,0,0,.1);
}

button[disabled] {
  border-color: #d4d7dc;
  background: #fff;
  color: #999;
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
  background: transparent;
  border-color: transparent;
  box-shadow: none; 
}

button.transparent:hover {
  background: #f5f5f5;
}

button.transparent.pressed {
  background: rgba(0,0,0,.1);
  box-shadow: inset 0 1px 2px rgba(0,0,0,.25);
  color: inherit;
}


.radio-group button {
  background: transparent;
  border: 0;
  box-shadow: none;
}

.radio-group button.pressed {
  background: #6d6d79;
  border-radius: 30px;
}

.btn-group {
  display: flex;
  margin: 0 6px;
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
