import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
  position: relative;
}

a {
  text-decoration: none;
  cursor: initial;
}

a[href]:hover {
  text-decoration: underline;
  cursor: pointer;
}

h2 {
  box-sizing: border-box;
  letter-spacing: 1px;
  margin: 6px 0 8px;
  font-weight: bold;
  font-size: 11px;
  color: var(--text-color--pretty-light);
  text-transform: uppercase;
}

.container {
  background: var(--bg-color--light);
  padding: 14px 10px 10px;
  box-shadow: rgba(0, 0, 0, 0.133) 0px 2px 4px inset;
  border-radius: 5px;
  border: 1px solid var(--border-color--semi-light);
}

.sites {
  display: grid;
  justify-content: flex-start;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-gap: 15px;
}

.site {
  border: 1px solid var(--border-color--light);
  background: var(--bg-color--default);
  border-radius: 4px;
}

.site .thumb {
  position: relative;
  border-bottom: 1px solid var(--border-color--very-light);
  padding: 8px 10px 4px;
}

.site .thumb img {
  display: inline-block;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-color--light);s
}

.site .thumb button,
.site .thumb .writable {
  position: absolute;
  font-size: 12px;
}

.site .thumb button {
  top: 6px;
  right: 4px;
  box-shadow: none;
  border-radius: 16px;
}

.site .thumb .writable {
  top: 10px;
  right: 12px;
  color: var(--text-color--very-light);
  font-weight: 500;
}

.site .info {
  font-size: 13px;
  line-height: 1.2;
  padding: 8px 12px 10px;
}

.site .title {
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site .title a {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-color--default);
}

.site .description {
  margin-bottom: 4px;
  word-break: break-word;
}

.sites.single-row .site .description {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site .known-subscribers a {
  color: var(--text-color--light);
}

.site .known-subscribers a strong {
  color: var(--text-color--default);
}

.show-more {
  font-size: 14px;
  color: var(--text-color--light);
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  margin-top: 8px;
}

.show-more:hover {
  background: var(--bg-color--light);
}

.show-more .fas {
  font-size: 12px;
}
`
export default cssStr