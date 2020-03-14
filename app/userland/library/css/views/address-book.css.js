import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${tooltipCSS}
${spinnerCSS}

a {
  text-decoration: none;
}

.contacts {
  font-size: 13px;
  box-sizing: border-box;
}

.contacts .empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: #a3a3a8;
  padding: 120px 0px;
  background: #fafafd;
  text-align: center;
}

.contacts .empty .far {
  font-size: 120px;
  margin-bottom: 30px;
  color: #d3d3d8;
}

:host(.top-border) .contact:first-child {
  border-top: 1px solid #dde;
}

.contact {
  display: flex;
  align-items: center;
  padding: 18px 24px;
  color: #555;
  border-bottom: 1px solid #dde;
}

.contact:hover {
  text-decoration: none;
  background: #fafafd;
}

.contact .thumb {
  display: block;
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 50%;
  margin-right: 20px;
}

.contact .info {
  flex: 1;
}

.contact .title {
  font-size: 15px;
  line-height: 1;
  font-weight: 600;
  margin-right: 10px;
}

.contact .description {
  color: #99a;
}

.contact .ctrls {
  width: 40px;
}

`
export default cssStr