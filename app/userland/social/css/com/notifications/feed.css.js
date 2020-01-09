import {css} from '../../../vendor/lit-element/lit-element.js'
import emptyCSS from '../empty.css.js'
import spinnerCSS from '../spinner.css.js'
import buttonsCSS from '../../buttons.css.js'

const cssStr = css`
${emptyCSS}
${spinnerCSS}
${buttonsCSS}

:host {
  --body-font-size: 15px;
  --header-font-size: 12px;
  --title-font-size: 13px;
  --footer-font-size: 12px;
  --title-color: var(--color-link);
  --header-color: #888;

  display: block;
  padding-right: 10px;
}

.notification {
  display: grid;
  grid-template-columns: 40px 1fr;
  align-items: center;
  padding: 16px 16px;
  border-top: 1px solid #ccd;
  color: var(--blue);
  text-decoration: none;
}

.notification:hover {
  background: #f3f3fa;
}

.notification.unread {
  background: #dcedff;
  border-top-color: var(--blue);
}

.notification.unread:hover {
  background: #ccddef;
}

.icon {
  font-size: 24px;
  color: #2864dc7a;
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
  border: 1px solid #dde;
}

.notification.unread .target .comment {
  border-color: #80a1e2;
}

`
export default cssStr
