import {css} from '../../../vendor/lit-element/lit-element.js'
import typographyCSS from '../../typography.css.js'

const cssStr = css`
${typographyCSS}

:host {
  display: block;
  --file-height: auto;
  --text-font-size: 14px;
  --text-padding: 0;
  --text-height: auto;
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
  color: inherit;
}

a:hover {
  text-decoration: underline;
}

.tohtml {
  font-size: 14px;
}
.tohtml :-webkit-any(h1, h2, h3, h4, h5, p) {
  margin: 0.3rem 0;
}
.tohtml > :first-child { margin-top: 0; }
.tohtml > :last-child { margin-bottom: 0; }
.tohtml h1 { font-weight: 600; font-size: 18px; }
.tohtml h2 { font-weight: 600; font-size: 17px; }
.tohtml h3 { font-weight: 600; font-size: 16px; }
.tohtml h4 { font-weight: 600; font-size: 15px; }
.tohtml h5 { font-weight: 600; font-size: 14px; }
.tohtml q { color: #778; }
.tohtml q:before { content: ''; }
.tohtml q:after { content: ''; }
.tohtml a { color: var(--link-color); }

.title {
  margin: 0 0 4px;
  font-weight: 500;
  color: var(--link-color);
}

.text {
  height: var(--text-height);
  min-height: var(--text-min-height);
  max-height: var(--text-max-height);
  max-width: 100%;
  white-space: var(--text-white-space);
  font-style: normal;
  word-break: break-all;
  font-size: var(--text-font-size);
  max-width: var(--text-max-width);
}

.markdown {
  height: var(--text-height);
  min-height: var(--text-min-height);
  max-height: var(--text-max-height);
  max-width: var(--text-max-width);
  font-size: var(--text-font-size);
  line-height: 1.2;
  pointer-events: none;
}

.markdown > :first-child {
  margin-top: 0;
}

.markdown > :last-child {
  margin-bottom: 0;
}

.markdown * {
  font-size: 13px;
  display: inline;
  font-weight: normal;
}

.markdown h1,
.markdown h2,
.markdown h3,
.markdown h4,
.markdown h5,
.markdown p {
  margin: 0.5em 0;
}

.markdown img,
.markdown video,
.markdown audio {
  display: none;
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
  background: var(--primary-bg);
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
}

.goto > * {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.goto .title {
  margin-bottom: 2px;
}

.goto .description {
  font-size: 13px;
}

.goto .fas {
  color: var(--blue);
  font-size: 80%;
  position: relative;
  top: -1px;
}
`
export default cssStr