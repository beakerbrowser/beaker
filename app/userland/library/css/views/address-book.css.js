import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
}

a {
  text-decoration: none;
}

.contacts {
  font-size: 13px;
  box-sizing: border-box;
  user-select: none;
}

.empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: #a3a3a8;
  padding: 120px 0px;
  background: #fafafd;
  text-align: center;
}

.empty .far {
  font-size: 120px;
  margin-bottom: 30px;
  color: #d3d3d8;
}

:host(.top-border) .contacts {
  border-top: 1px solid #dde;
}

.contact {
  display: flex;
  align-items: center;
  color: #555;
  padding: 12px 20px;
  border-bottom: 1px solid #dde;
}

.contact:hover {
  text-decoration: none;
  background: #fafafd;
}

.contact .thumb {
  display: inline-block;
  width: 30px;
  height: 30px;
  object-fit: cover;
  border-radius: 50%;
  margin-right: 16px;
}

.contact .title {
  flex: 1;
  font-size: 14px;
  font-weight: 600;
}

.contact .description {
  flex: 1;
  color: #99a;
  overflow: hidden;
}

.profile-badge {
  width: 80px;
}

.profile-badge span {
  font-size: 10px;
  background: #f3f3f8;
  color: #778;
  padding: 2px 8px;
  border-radius: 8px;
}

`
export default cssStr