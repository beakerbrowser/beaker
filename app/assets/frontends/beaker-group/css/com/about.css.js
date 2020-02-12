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

.counts {
  display: flex;
  padding: 0 2px;
  margin-bottom: 10px;
}

.counts a {
  display: flex;
  align-items: baseline;
  color: inherit;
  font-weight: 500;
  text-decoration: none;
  background: #f3f3f8;
  border-radius: 4px;
  padding: 5px 10px;
}

.counts a .number {
  font-size: 14px;
  margin-right: 4px;
}

.counts a .label {
  font-size: 12px;
}

.rules > :first-child {
  margin-top: 0;
}

.rules > :last-child {
  margin-bottom: 0;
}
`
export default cssStr
