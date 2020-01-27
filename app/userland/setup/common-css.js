export const commonCSS = `
a,
button {
  -webkit-app-region: no-drag;
}

form {
  padding-top: 10px;
}

form textarea,
form input,
form .input,
form details {
  display: block;
  width: 100%;
  margin: 5px 0 15px 0;
  box-sizing: border-box;
  -webkit-app-region: no-drag;
}

form textarea {
  resize: none;
  padding: 10px;
  height: 55px;
}

.form-actions {
  text-align: right;
}

select {
  -webkit-app-region: no-drag;
}

input,
textarea {
  font-size: 15px;
  padding: 0 10px;
  height: 36px;
  border-radius: 4px;
  color: rgba(51, 51, 51, 0.95);
  border: 1px solid #d9d9d9;
}

input:focus,
textarea:focus {
  outline: 0;
  border: 1px solid rgba(41, 95, 203, 0.8);
  box-shadow: 0 0 0 2px rgba(41, 95, 203, 0.2);
}

input.has-error,
textarea.has-error {
  border-color: red;
  margin-bottom: 0;
}

.error {
  color: red;
  margin-bottom: 15px;
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

button {
  background: transparent;
  border: 0;
  padding: 0;
}

button:focus {
  outline: 0;
}

button:disabled {
  opacity: 0.5;
}

.btn {
  display: inline-block;
  height: 30px;
  padding: 0 10px;
  border: 1px solid #ddd;
  background: #fafafa;
  border-radius: 2px;
  color: #333;
  font-size: 13px;
  line-height: 26px;
  letter-spacing: 0.25px;
  font-weight: 400;
  cursor: pointer !important;
}

.btn.small {
  height: 24px;
  line-height: 20px;
}

.btn.small * {
  vertical-align: top;
  line-height: 20px;
}

.btn.plain {
  background: none;
  border: none;
  color: #707070;
  line-height: 28px;
  padding: 0 3px;
}

.btn.plain:hover {
  color: #333;
  background: none;
}

.btn.plain:focus {
  box-shadow: none;
}

.btn i {
  line-height: 100%;
  line-height: 30px;
  vertical-align: middle;
}

.btn i:last-child {
  margin-left: 2px;
  margin-right: 0;
}

.btn i:first-child {
  margin-left: 0;
  margin-right: 2px;
}

.btn i:first-child:last-child {
  margin-left: 0;
  margin-right: 0;
}

.btn:focus {
  box-shadow: 0 0 0 2px rgba(41, 95, 203, 0.5);
}

.btn.full-width {
  width: 100%;
}

.btn.center {
  text-align: center;
}

.btn.thick {
  font-size: 14px;
  font-weight: normal;
  height: 35px;
  padding: 0 12px;
}

.btn.pressed {
  box-shadow: inset 0px 0 5px rgba(0, 0, 0, 0.1);
  background: linear-gradient(to top, #ddd, #ccc);
}

.btn.pressed:hover {
  box-shadow: inset 0px 0 2px rgba(0, 0, 0, 0.1);
  background: linear-gradient(to top, #ddd, #ccc);
  cursor: default;
}

.btn:hover {
  text-decoration: none;
  background: #eee;
}

.btn[disabled="disabled"],
.btn.disabled,
.btn:disabled {
  cursor: default;
  background: #fafafa !important;
  color: rgba(0, 0, 0, 0.4) !important;
  border: 1px solid #eee !important;
  font-weight: 400 !important;
  -webkit-font-smoothing: initial !important;
}

.btn[disabled="disabled"] .spinner,
.btn.disabled .spinner,
.btn:disabled .spinner {
  color: #aaa !important;
}

.btn[disabled="disabled"]:hover,
.btn.disabled:hover,
.btn:disabled:hover {
  cursor: default;
  background: #fafafa;
}

.btn .spinner {
  display: inline-block;
  position: relative;
  top: 1px;
  color: inherit;
}

.btn.warning {
  color: #fff;
  background: #cc2f26;
  border-color: #cc2f26;
}

.btn.warning.pressed,
.btn.warning:hover {
  background: #c42d25;
  border-color: #c42d25;
}

.btn.success {
  background: #41bb56;
  color: #fff;
  border-color: #41bb56;
}

.btn.success.pressed,
.btn.success:hover {
  background: #3baa4e;
  border-color: #3baa4e;
}

.btn.transparent {
  border-color: transparent;
  background: none;
  font-weight: 400;
}

.btn.transparent:hover {
  background: rgba(0, 0, 0, 0.075);
  color: #424242;
}

.btn.primary {
  background: #2864dc;
  color: #fff;
  border: 1px solid #2864dc;
  transition: background 0.1s ease;
}

.btn.primary.pressed {
  box-shadow: inset 0px 0 5px rgba(0, 0, 0, 0.25);
}

.btn.primary:hover {
  background: #2357bf;
}
`