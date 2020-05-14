import {css} from '../../vendor/lit-element/lit-element.js'
import buttonscss from '../buttons.css.js'
import inputscss from '../inputs.css.js'
const cssStr = css`
${buttonscss}
${inputscss}

.popup-wrapper {
  position: fixed;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  z-index: 6000;
  background: rgba(0, 0, 0, 0.45);
  font-style: normal;
  overflow-y: auto;
}

.popup-inner {
  background: #fff;
  box-shadow: 0 2px 25px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(0, 0, 0, 0.55);
  border-radius: 4px;
  width: 450px;
  margin: 80px auto;
  overflow: hidden;
}

.popup-inner .error {
  color: #d80b00 !important;
  margin: 10px 0 !important;
  font-style: italic;
}

.popup-inner .head {
  position: relative;
  background: #f1f1f6;
  padding: 7px 12px;
  width: 100%;
  border-bottom: 1px solid #e0e0ee;
  border-radius: 4px 4px 0 0;
}

.popup-inner .head .title {
  font-size: 0.95rem;
  font-weight: 500;
}

.popup-inner .head .close-btn {
  position: absolute;
  top: 8px;
  right: 12px;
  cursor: pointer;
}

.popup-inner .body {
  padding: 12px;
}

.popup-inner .body > div:not(:first-child) {
  margin-top: 20px;
}

.popup-inner p:first-child {
  margin-top: 0;
}

.popup-inner p:last-child {
  margin-bottom: 0;
}

.popup-inner select {
  height: 28px;
}

.popup-inner textarea,
.popup-inner label:not(.checkbox-container),
.popup-inner select,
.popup-inner input {
  display: block;
  width: 100%;
}

.popup-inner label.toggle {
  display: flex;
  justify-content: flex-start;
}

.popup-inner label.toggle .text {
  margin-right: 10px;
}

.popup-inner label.toggle input {
  display: none;
}

.popup-inner label {
  margin-bottom: 3px;
  color: rgba(51, 51, 51, 0.9);
}

.popup-inner textarea,
.popup-inner input {
  margin-bottom: 10px;
}

.popup-inner textarea {
  height: 60px;
  resize: vertical;
}

.popup-inner .actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid #eee;
}

.popup-inner .actions .left,
.popup-inner .actions .link {
  margin-right: auto;
}

.popup-inner .actions .btn,
.popup-inner .actions .success,
.popup-inner .actions .primary {
  margin-left: 5px;
}

.popup-inner .actions .spinner {
  width: 10px;
  height: 10px;
  border-width: 1.2px;
}
`
export default cssStr
