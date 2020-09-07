import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import colorsCSS from '../../../app-stdlib/css/colors.css.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'
import tooltipCSS from '../../../app-stdlib/css/tooltip.css.js'

const cssStr = css`
${colorsCSS}
${buttonsCSS}
${tooltipCSS}

:host {
  display: block;
  max-width: 600px;
}

a {
  color: var(--blue);
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.section {
  margin-bottom: 30px;
}

.session {
  border: 1px solid var(--border-color--light);
  border-radius: 4px;
  margin-bottom: 10px;
}

.site {
  border-bottom: 1px solid var(--border-color--light);
  padding: 10px;
}

.site h3 {
  margin: 0;
  font-size: 16px;
}

.user {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border-color--light);
  padding: 10px;
}

.user img {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 10px;
}

.user .title {
  font-weight: bold;
}

.permissions {
  background: var(--bg-color--light);
  padding: 10px;
  border-bottom-left-radius: 3px;
  border-bottom-right-radius: 3px;
}

.permissions h4 {
  font-size: 12px;
  margin: 0;
}

.permissions ul {
  margin: 4px 0 0;
  padding: 0 0 0 24px;
}
`
export default cssStr
