import {css} from '../vendor/lit-element/lit-element'

export default css`
input,
textarea {
  height: 30px;
  padding: 0 7px;
  border-radius: 4px;
  border: 1px solid var(--border-color--default);
  background: inherit;
  color: inherit;
}

input:focus,
textarea:focus {
  outline: 0;
  border: 1px solid rgba(41, 95, 203, 0.8);
  box-shadow: 0 0 0 2px rgba(41, 95, 203, 0.2);
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

.toggle {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
  cursor: pointer;
  overflow: initial;
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
  color: #b8b8b8;
}
`