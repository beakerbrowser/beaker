import {css} from '../../../vendor/lit-element/lit-element.js'
import emptyCSS from '../empty.css.js'
import spinnerCSS from '../spinner.css.js'
import buttonsCSS from '../../buttons.css.js'

const cssStr = css`
${emptyCSS}
${spinnerCSS}
${buttonsCSS}

:host {
  display: block;
}

.notification {
  display: grid;
  grid-template-columns: 40px 1fr;
  align-items: center;
  padding: 14px 16px;
  text-decoration: none;
  color: inherit;
}

.notification:hover {
  background: #f8f8fa;
}

.notification.unread {
  background: #dcedff;
}

.notification.unread:hover {
  background: #ccddef;
}

.icon {
  font-size: 24px;
  color: #0002;
}

.notification .description,
.notification .target {
  display: block;
}

.notification .target .post {
  font-size: 17px;
  font-weight: bold;
}

.notification .target .comment {
  display: block;
  margin-top: 2px;
  padding: 10px;
  border-radius: 4px;
  border: 1px solid #0002;
}

`
export default cssStr
