import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}
${tooltipCSS}
${spinnerCSS}

:host {
  display: block;
  background: #fafafd;
}

a {
  text-decoration: none;
  cursor: initial;
}

a[href]:hover {
  text-decoration: underline;
  cursor: pointer;
}

.posts {
  background: #fff;
  max-width: 700px;
  margin: 0 auto;
  font-size: 14px;
  line-height: 1.5;
  box-sizing: border-box;
  padding: 10px;
}

.posts .empty {
  font-size: 16px;
  letter-spacing: 0.7px;
  color: #a3a3a8;
  padding: 120px 0px;
  background: #fafafd;
  text-align: center;
}

.posts .empty .fas {
  font-size: 120px;
  margin-bottom: 10px;
  color: #d3d3d8;
}

.post {
  display: grid;
  grid-gap: 0;
  grid-template-columns: 65px 1fr;
  grid-template-rows: auto auto;
  margin-bottom: 10px;
  padding: 10px 50px 10px 20px;
}

.post h1 { font-size: 21px; }
.post h2 { font-size: 20px; }
.post h3 { font-size: 19px; }
.post h4 { font-size: 18px; }
.post h5 { font-size: 17px; }
.post h6 { font-size: 16px; }

.post .thumb {
  grid-row-start: 1;
  grid-row-end: 3;
}

.post .thumb img {
  width: 50px;
  height: 50px;
  object-fit: cover;
  border-radius: 2px;
}

.post .meta {
  margin-bottom: 5px;
}

.post .meta a {
  color: #556;
}

.post .content {
  min-height: 26px;
}

.post .content > * {
  margin: 0;
}

.post .content > * + * {
  margin-top: 1rem;
}

.post .content img,
.post .content video {
  max-width: 100%;
}

`
export default cssStr