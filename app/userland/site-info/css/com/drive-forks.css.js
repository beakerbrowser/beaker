import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'

const cssStr = css`
${buttonsCSS}

:host {
  display: block;
}

.list {
  max-height: 180px;
  overflow: auto;
}

.fork {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  box-sizing: border-box;
  padding: 5px 5px 5px 10px;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid #dde;
  letter-spacing: 0.5px;
  cursor: pointer;
}

.fork.current small {
  margin-right: 5px;
  font-size: 11px;
}

.fork:last-child {
  border-bottom: 0;
}

.fork:hover {
  background: #f8f8fa;
}
`
export default cssStr