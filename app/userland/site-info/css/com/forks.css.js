import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'

const cssStr = css`
${buttonsCSS}

:host {
  display: block;
}

.list {
  padding: 5px;
}

.fork-of {
  background: #f5f5f5;
  padding: 10px;
  border-radius: 4px;
  color: #555;
}

.fork {
  display: flex;
  align-items: center;
  padding: 5px;
}

.fork > * {
  margin-right: 5px;
}

a {
  text-decoration: none;
  color: var(--blue);
}

a:hover {
  text-decoration: underline;
}
`
export default cssStr