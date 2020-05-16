import {css} from '../../../vendor/lit-element/lit-element.js'
import typographyCSS from '../../typography.css.js'

const cssStr = css`
${typographyCSS}

:host {
  display: block;
  --file-height: auto;
  --text-font-size: 14px;
  --text-padding: 0;
  --text-min-height: none;
  --text-max-height: none;
  --text-min-width: none;
  --text-max-width: none;
  --text-white-space: pre-wrap;
  --text-border-width: 0;
  --text-border-radius: 4px;
  --img-border-radius: 4px;
  --media-max-height: none;
  --media-padding: 0;
  --mount-padding: 0;
  --goto-padding: 12px 14px;
  --color-drive: #6c8c9e;
  --color-folder: #9ec2e0;
  --color-viewfile-outline: #a7a7ad;
}

a {
  text-decoration: none;
  color: var(--blue);
}

a:hover {
  text-decoration: underline;
}

.text {
  min-height: var(--text-min-height);
  max-height: var(--text-max-height);
  max-width: 100%;
  box-sizing: border-box;
  white-space: var(--text-white-space);
  font-style: normal;
  word-break: break-all;
  font-size: var(--text-font-size);
  padding: var(--text-padding);
  max-width: var(--text-max-width);
  border: var(--text-border-width) solid #ccc;
  border-radius: var(--text-border-radius);
}

.markdown {
  box-sizing: border-box;
  padding: var(--text-padding);
  min-height: var(--text-min-height);
  max-height: var(--text-max-height);
  max-width: var(--text-max-width);
  font-size: var(--text-font-size);
  border: var(--text-border-width) solid #ccc;
  border-radius: var(--text-border-radius);
  line-height: 1.4;
}

.markdown > :first-child {
  margin-top: 0;
}

.markdown > :last-child {
  margin-bottom: 0;
}

img,
video,
audio {
  max-width: 100%;
  max-height: var(--media-max-height);
  padding: var(--media-padding);
  box-sizing: border-box;
}

:host > img,
:host > video,
:host > audio {
  display: block;
  margin: 0 auto;
}

:host([horz]) > img,
:host([horz]) > video,
:host([horz]) > audio {
  margin: 0;
}

:host > img {
  border-radius: var(--img-border-radius);
}

:host([fullwidth]) > img {
  width: 100%;
  object-fit: cover;
}

.icon {
  position: relative;
  padding: 0 4px;
}

.icon > span {
  font-size: 80px;
  line-height: 70px;
}

.icon .fa-folder {
  color: var(--color-folder);
}

.icon .mainicon.fa-hdd {
  color: var(--color-drive);
}

.icon .fa-layer-group {
  -webkit-text-stroke: 1px var(--color-viewfile-outline);
  color: #fff;
  font-size: 64px;
}

.icon .subicon {
  position: absolute;
  color: rgba(0,0,0,.4);
  font-size: 30px;
  left: 13px;
  top: 8px;
}

.mount {
  box-sizing: border-box;
  padding: var(--mount-padding);
}

.mount img {
  display: block;
  width: 100%;
  height: 120px;
  border-radius: 8px;
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid #ddd;
  border-bottom: 0;
  object-fit: cover;
  object-position: top;
  box-sizing: border-box;
}

.mount .info {
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 8px;
  border-top-left-radius: 0;
  border-top-right-radius: 0;
  box-sizing: border-box;
}

.mount .info .title {
  font-weight: 500;
  font-size: 15px;
}

.mount .info .description {
  display: none;
}

:host([horz]) .mount {
  display: grid;
  grid-template-columns: 100px 1fr;
}

:host([horz]) .mount img {
  height: 100%;
  border-radius: 8px;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
  border: 1px solid #ddd;
  border-right: 0;
}

:host([horz]) .mount .info {
  padding: 12px 15px;
  border-radius: 8px;
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

:host([horz]) .mount .info .title {
  font-size: 18px;
  font-weight: bold;
}

:host([horz]) .mount .info .description {
  display: block;
}

.goto {
  box-sizing: border-box;
  padding: var(--goto-padding);
  border: 1px solid #ddd;
  border-radius: 8px;
  box-sizing: border-box;
}

.goto > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.goto .title {
  font-weight: bold;
  font-size: 15px;
  margin-bottom: 2px;
}

.goto .description {
  color: gray;
}

.goto .fas {
  color: var(--blue);
  font-size: 80%;
  position: relative;
  top: -1px;
}

:host([horz]) .goto .title {
  font-size: 16px;
  font-weight: bold;
}

`
export default cssStr