import {css} from '../../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../../buttons.css.js'
import tooltipCSS from '../tooltip.css.js'
import votectrlCSS from '../votectrl.css.js'

const cssStr = css`
${buttonsCSS}
${tooltipCSS}
${votectrlCSS}

:host {
  display: grid;
  grid-template-columns: 40px 1fr;
  align-items: center;
  letter-spacing: 0.5px;
  font-size: 14px;
  margin-bottom: 10px;
}

:host([expanded]) {
  align-items: flex-start;
  font-size: 16px;
}

a {
  text-decoration: none;
  color: #667;
  cursor: pointer;
}

a:hover {
  text-decoration: underline;
}

:host([expanded]) .votectrl .fas {
  font-size: 20px;
}
:host([expanded]) .votectrl .karma {
  font-size: 18px;
}

.title {
  font-size: 17px;
  font-weight: bold;
  color: var(--blue);
}

:host([expanded]) .title {
  font-size: 22px;
}

.drive-type,
.domain {
  color: #778;
}

.drive-type .far,
.drive-type .fas,
.domain .far,
.domain .fas {
  position: relative;
  top: -1px;
  font-size: 10px;
}

button.menu {
  padding: 0;
}

.topic {
  font-weight: bold;
  color: #445;
}

.text-post-content {
  border: 1px solid #ccd;
  border-radius: 4px;
  padding: 14px;
  margin: 10px 0 0;
}

.text-post-content > :first-child {
  margin-top: 0;
}

.text-post-content > :last-child {
  margin-bottom: 0;
}

.text-post-content a {
  color: var(--blue);
}

.file-content {
  border: 1px solid #ccd;
  border-radius: 4px;
  padding: 14px;
  margin: 10px 0 0;
}

.file-content h3 {
  margin: 0;
}

.file-content h3 + * {
  margin-top: 10px;
}

.file-content > * {
  max-width: 100%;
}
`
export default cssStr
