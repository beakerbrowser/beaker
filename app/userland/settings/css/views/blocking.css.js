import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}

:host {
  display: block;
  max-width: 600px;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.section {
  margin-bottom: 30px;
}

.form-group {
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 16px;
}

.form-group .section {
  margin-bottom: 0;
  padding: 0 10px 4px;
}

.form-group .section:not(:last-child) {
  margin-bottom: 0;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-color);
}

.form-group .section > :first-child {
  margin-top: 16px;
}

.form-group h2 {
  margin: 0;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-color);
}


input[type="text"], input[type="url"] {
  height: 24px;
  padding: 0 7px;
  border-radius: 4px;
  color: rgba(51, 51, 51, 0.95);
  border: 1px solid #d9d9d9;
  box-shadow: inset 0 1px 2px #0001;
}

textarea {
  padding: 7px;
  border-radius: 4px;
  color: rgba(51, 51, 51, 0.95);
  border: 1px solid #d9d9d9;
  box-shadow: inset 0 1px 2px #0001;
}

input[type="text"]:focus,
input[type="url"]:focus,
textarea:focus {
  outline: 0;
  border: 1px solid rgba(41, 95, 203, 0.8);
  box-shadow: 0 0 0 2px rgba(41, 95, 203, 0.2);
}

input[type="checkbox"] {
  margin: 0px 7px 0px 2px;
}

.site-block-list .unblock-btn {
  color: var(--text-color--very-light);
  cursor: pointer;
  font-size: 12px;
  margin-right: 3px;
}

.adblock-settings-list {
}

.adblock-settings-list a {
  color: var(--text-color--very-light);
  cursor: pointer;
  font-size: 12px;
  margin-right: 3px;
}

.checkbox-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.checkbox-item:last-child {
  margin-bottom: 0;
}

.checkbox-item small {
  color: var(--text-color--light);
}

form {
  padding: 8px;
  background: var(--bg-color--light);
}

`
export default cssStr
