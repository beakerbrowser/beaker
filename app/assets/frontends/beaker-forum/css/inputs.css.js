import {css} from '../vendor/lit-element/lit-element.js'

const cssStr = css`
textarea {
  line-height: 1.4;
}

input,
textarea {
  height: 30px;
  padding: 0 7px;
  border-radius: 4px;
  color: rgba(51, 51, 51, 0.95);
  border: 1px solid #d9d9d9;
}
textarea {
  padding: 7px;
}

input[type="checkbox"],
input[type="radio"],
input[type="range"] {
  padding: 0;
}

input[type="checkbox"]:focus,
input[type="radio"]:focus,
input[type="range"]:focus {
  box-shadow: none;
}

input[type="radio"] {
  width: 14px;
  height: 14px;
  outline: none;
  -webkit-appearance: none;
  border-radius: 50%;
  cursor: pointer;
  transition: border 0.1s ease;
}

input[type="radio"]:hover {
  border: 1px solid var(--color-blue);
}

input[type="radio"]:checked {
  border: 4.5px solid var(--color-blue);
}

input[type="file"] {
  padding: 0;
  border: 0;
  line-height: 1;
}

input[type="file"]:focus {
  border: 0;
  box-shadow: none;
}

input:focus,
textarea:focus,
select:focus {
  outline: 0;
  border: 1px solid rgba(41, 95, 203, 0.8);
  box-shadow: 0 0 0 2px rgba(41, 95, 203, 0.2);
}

input.has-error,
textarea.has-error,
select.has-error {
  border: 1px solid rgba(209, 48, 39, 0.75);
}

input.has-error:focus,
textarea.has-error:focus,
select.has-error:focus {
  box-shadow: 0 0 0 2px rgba(204, 47, 38, 0.15);
}

input.nofocus:focus,
textarea.nofocus:focus,
select.nofocus:focus {
  outline: 0;
  box-shadow: none;
  border: initial;
}

input.inline {
  height: auto;
  border: 1px solid transparent;
  border-radius: 0;
  background: transparent;
  cursor: text;
  padding: 3px 5px;
  line-height: 1;
}

input.big,
textarea.big {
  height: 38px;
  padding: 0 10px;
  font-size: 14px;
}

textarea.big {
  padding: 5px 10px;
}

input.huge,
textarea.huge {
  height: 40px;
  padding: 0 10px;
  font-size: 18px;
}

textarea.huge {
  padding: 5px 10px;
}

input.inline:focus,
input.inline:hover {
  border: 1px solid #ccc;
  box-shadow: none;
}

input.inline:focus {
  background: #fff;
}

.input-file-picker {
  display: flex;
  align-items: center;
  padding: 3px;
  border-radius: 2px;
  border: 1px solid #d9d9d9;
  color: var(--color-text--muted);
}

.input-file-picker span {
  flex: 1;
  padding-left: 3px;
}

::-webkit-input-placeholder {
  color: rgba(0, 0, 0, 0.5);
  font-size: 0.8rem;
}

.big::-webkit-input-placeholder,
.huge::-webkit-input-placeholder {
  font-size: 0.9em;
}

label {
  font-weight: 500;
}

input[disabled][data-tooltip],
label[disabled][data-tooltip] {
  cursor: help;
}

input[disabled][data-tooltip] *,
label[disabled][data-tooltip] * {
  cursor: help;
}

label.required:after {
  content: '*';
  color: red;
}

.toggle {
  display: flex;
  align-items: center;
  flex-direction: row;
  margin-bottom: 10px;
  cursor: pointer;
  overflow: initial;
}

.toggle .switch {
  margin-right: 10px;
}

.toggle * {
  cursor: pointer;
}

.toggle.disabled {
  cursor: default;
}

.toggle.disabled * {
  cursor: default;
}

.toggle input {
  display: none;
}

.toggle .text {
  font-weight: 400;
}

.toggle .switch {
  display: inline-block;
  position: relative;
  width: 32px;
  height: 17px;
}

.toggle .switch:before,
.toggle .switch:after {
  position: absolute;
  display: block;
  content: '';
}

.toggle .switch:before {
  width: 100%;
  height: 100%;
  border-radius: 40px;
  background: #dadada;
}

.toggle .switch:after {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  left: 3px;
  top: 3px;
  background: #fafafa;
  transition: transform 0.15s ease;
}

.toggle input:checked:not(:disabled) + .switch:before {
  background: #41b855;
}

.toggle input:checked:not(:disabled) + .switch:after {
  transform: translateX(15px);
}

.toggle.disabled {
  color: var(--color-text--light);
}

label.checkbox-container {
  display: flex;
  align-items: center;
  height: 15px;
  font-weight: 400;
}

label.checkbox-container input[type="checkbox"] {
  width: 15px;
  height: 15px;
  margin: 0 5px 0 0;
}


`
export default cssStr
