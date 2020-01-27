import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import commonCSS from 'beaker://app-stdlib/css/common.css.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import tooltipCSS from 'beaker://app-stdlib/css/tooltip.css.js'

const cssStr = css`
${commonCSS}
${buttonsCSS}
${tooltipCSS}

:host {
  display: block;
}

.files {
  display: grid;
  padding: 10vh 15px 5px 15px;
  margin: 0 auto;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  grid-gap: 15px;
  width: 100%;
  max-width: 800px;
  user-select: none;
}

.file {
  cursor: pointer;
  position: relative;
  border-radius: 3px;
  color: inherit;
  border-radius: 3px;
  background: #fff;
  overflow: hidden;
  user-select: none;
  min-height: 100px;
}

.file:hover {
  text-decoration: none;
}

.file .favicon-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 1;
  border-radius: 50%;
  background: #f2f2f8;
  width: 36px;
  height: 36px;
}

.file:hover .favicon-wrapper {
  background: #e6e6ea;
}

.file .favicon {
  border-radius: 4px;
  width: 20px;
  height: 20px;
}

.file .details {
  padding: 60px 2px 20px;
}

.file .details > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file .title {
  font-size: 12px;
  line-height: 20px;
  text-align: center;
}

.file.add span {
  position: absolute;
  left: 50%;
  top: 45%;
  transform: translate(-50%, -50%);
  font-size: 22px;
  color: rgba(0, 0, 150, 0.15);
}

.file.add:hover span {
  color: rgba(0, 0, 150, 0.25);
}

.dock-wrapper {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  text-align: center;
  background: #fff;
}

.dock {
  padding: 5px 15px 30px;
}

.dock-separator {
  width: auto;
  padding: 3px 7px;
  margin-right: 25px;
  color: #bbb;
}

.dock-item {
  display: inline-block;
  width: auto;
  cursor: pointer;
  margin-bottom: 0;
  padding: 3px 7px;
  font-weight: 400;
  font-size: .7rem;
  text-transform: uppercase;
  letter-spacing: .15px;
  color: rgba(0,0,0,.75);
}

.dock-item:not(:last-child) {
  margin-right: 25px;
}

.dock-item:hover {
  color: @color-text;
  background: rgba(0,0,0,.075);
  border-radius: 2px;
}

.beta-notice {
  position: fixed;
  top: 10px;
  left: 10px;
  width: 300px;
  padding: 0 12px 6px;
  border: 1px solid var(--blue);
  border-radius: 8px;
  box-shadow: 0 0 2px #2864dc;
}

.beta-notice a {
  color: var(--blue);
}

.beta-notice a:hover {
  text-decoration: underline;
}

@media (max-width: 1300px) {
  .beta-notice {
    top: unset;
    bottom: 70px;
  }
}
`
export default cssStr