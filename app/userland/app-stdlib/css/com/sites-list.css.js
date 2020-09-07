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
}

.sites.single-row {
  display: grid;
  justify-content: flex-start;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  grid-gap: 15px;
}

.site {
  position: relative;
  border: 1px solid var(--border-color--light);
  background: var(--bg-color--default);
  border-radius: 4px;
}

.sites.full .site {
  display: flex;
  align-items: center;
  border-bottom-width: 0;
  border-radius: 0;
}

.sites.full .site:last-child {
  border-bottom-width: 1px;
}

.site .thumb {
  padding: 8px 10px 4px;
}

.sites.single-row .site .thumb {
  border-bottom: 1px solid var(--border-color--very-light);
  padding: 8px 10px 4px;
}

.sites.full .site .thumb {
  padding: 8px 10px 8px;
}

.site .thumb img {
  display: inline-block;
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--border-color--light);
}

.sites.full .site .thumb img {
  display: block;
}

.sites.single-row .site button {
  position: absolute;
  font-size: 12px;
  top: 6px;
  right: 4px;
  box-shadow: none;
  border-radius: 16px;
}

.sites.full .site button {
  align-self: normal;
  white-space: nowrap;
}

.site .info {
  flex: 1;
  font-size: 13px;
  line-height: 1;
  padding: 8px 12px 10px;
}

.sites.full .site .info {
  padding: 12px 4px; 
}

.site .title {
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
  margin-top: 4px;
  word-break: break-word;
}

.fork-of {
  margin-top: 6px;
  color: var(--text-color--light);
  font-size: 12px;
}

.fork-of a {
  color: var(--text-color--link);
}

.label {
  position: relative;
  top: -1px;
  background: var(--bg-color--semi-light);
  padding: 1px 4px 2px;
  border-radius: 4px;
  font-size: 10px;
}

.sites.single-row .site .description {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.site .known-subscribers {
  margin-top: 4px;
}

.site .known-subscribers a {
  color: var(--text-color--light);
}

.site .known-subscribers a strong {
  color: var(--text-color--default);
}
`
export default cssStr