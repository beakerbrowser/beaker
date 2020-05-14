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
  margin: -12px 0 10px !important;
}

.popup-inner .help {
  margin: -6px 0 14px;
  opacity: 0.75;
  letter-spacing: 0.4px;
  margin-bottom: 14px;
  font-size: 11px;
}

.popup-inner .head {
  position: relative;
  background: #f1f1f6;
  padding: 7px 12px;
  box-sizing: border-box;
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
  padding: 16px;
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
  box-sizing: border-box;
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
  font-size: 15px;
  margin-bottom: 10px;
}

.popup-inner input {
  padding: 0 10px;
  height: 36px;
}

.popup-inner textarea {
  height: 100px;
  resize: vertical;
  padding: 10px;
}

.popup-inner .form-actions button {
  font-size: 14px;
}

.popup-inner .actions .spinner {
  width: 10px;
  height: 10px;
  border-width: 1.2px;
}
`
export default cssStr
