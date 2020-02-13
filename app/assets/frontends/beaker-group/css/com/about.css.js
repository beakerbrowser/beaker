import {css} from '../../vendor/lit-element/lit-element.js'
import buttonsCSS from '../buttons.css.js'

const cssStr = css`
${buttonsCSS}

:host {
  display: block;
}

h4 {
  margin: 0;
  padding: 0 4px;
  border-bottom: 1px solid #ccd;
  height: 29px;
  line-height: 29px;
  font-weight: 500;
}

.description,
.rules,
.admin {
  padding: 12px 4px;
  font-size: 15px;
}

.description,
.rules {
  opacity: 0.75;
  letter-spacing: 0.4px;
}

.counts {
  display: flex;
  padding: 8px 12px;
  background: var(--header-background);
  border-radius: 4px;
  margin-bottom: 10px;
}

.counts a {
  display: flex;
  flex-direction: column-reverse;
  align-items: baseline;
  color: inherit;
  font-weight: 500;
  text-decoration: none;
  padding: 0 0px;
}

.counts a:hover {
  color: var(--link-color);
}

.counts a .number {
  font-size: 16px;
  margin-right: 4px;
  letter-spacing: 2px;
}

.counts a .label {
  font-size: 10px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.rules > :first-child {
  margin-top: 0;
}

.rules > :last-child {
  margin-bottom: 0;
}
`
export default cssStr
