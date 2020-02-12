import {css} from '../../../vendor/lit-element/lit-element.js'
import emptyCSS from '../empty.css.js'
import spinnerCSS from '../spinner.css.js'
import buttonsCSS from '../../buttons.css.js'
import votectrlCSS from '../votectrl.css.js'

const cssStr = css`
${emptyCSS}
${spinnerCSS}
${buttonsCSS}
${votectrlCSS}

:host {
  --body-font-size: 15px;
  --header-font-size: 14px;
  --title-font-size: 14px;
  --footer-font-size: 13px;
  --title-color: var(--color-link);
  --header-color: #888;

  display: block;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.comment {
  display: grid;
  grid-template-columns: 20px 1fr;
  align-items: baseline;
  padding: 8px 14px 12px;
}

.header {
  display: flex;
  align-items: center;
  padding: 4px 16px 4px;
  font-size: var(--header-font-size);
  line-height: var(--header-font-size);
  color: var(--header-color);
}

.header .menu {
  padding: 2px 4px;
}

.title {
  font-size: var(--title-font-size);
  color: var(--title-color);
  margin-right: 10px;
  line-height: 17px;
}

.permalink {
  color: inherit;
}

.body {
  color: rgba(0, 0, 0, 0.9);
  padding: 0 16px;
  margin: 0 0 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: var(--body-font-size);
  line-height: 1.4;
  white-space: pre-line;
}

.footer {
  padding: 4px 16px 0;
  font-size: var(--footer-font-size);
}

.view-context {
  background: #f0f0f5;
  color: #778;
  padding: 2px 6px;
  border-radius: 4px;
}

.view-context:hover {
  text-decoration: none;
  background: #eaeaef;
}

`
export default cssStr
