import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'

const cssStr = css`
${buttonsCSS}

:host {
  display: block;
  padding: 10px;
}

a {
  color: var(--text-color--link);
}

button {
  padding: 5px;
  font-size: 11px;
}

.diff-merge-icon {
  font-size: 12px;
  line-height: 1;
}

.list {
  margin: 0 0 8px;
  background: var(--bg-color--main);
  border-radius: 4px;
  border: 1px solid var(--border-color--forks);
  overflow: hidden;
  max-height: 180px;
  overflow: auto;
}

.fork {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  box-sizing: border-box;
  padding: 5px 10px;
  text-decoration: none;
  color: inherit;
  border-bottom: 1px solid var(--border-color--forks);
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
`
export default cssStr