import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${spinnerCSS}

:host {
  --default: #eef;
  --background: #223;
  --lightgray: #aab;
  --gray: #889;
  --darkgray: #556;
  --error: #f00;
  --success: #0f0;
  --warning: #ff0;
  --info: #83f;
  --font: Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif;

  display: block;
  box-sizing: border-box;
  font-family: var(--font);
  padding: 1rem;
  height: 100vh;
  overflow-y: auto;
  background: var(--background);
  color: var(--default);
}

:host::-webkit-scrollbar {
  display: none;
}

a {
  text-decoration: none;
  cursor: pointer;
  color: inherit;
}

a:hover {
  text-decoration: underline;
}

img,
video,
audio {
  max-width: 100%;
}

input,
textarea {
  background: var(--background);
  border: 1px solid var(--darkgray);
  color: var(--default);
  border-radius: 2px;
}

button {
  background: var(--default);
  border: 1px solid var(--lightgray);
  color: var(--darkgray);
  border-radius: 2px;
}

pre {
  margin: 0;
  font-size: inherit;
  font-family: inherit;
}

.output .header {
  display: flex;
  align-items: center;
  line-height: 1;
  margin-top: 8px;
  margin-bottom: 8px;
  border-left: 2px solid var(--lightgray);
  padding-left: 5px;
}

.output .header > *:first-child {
  max-width: 50vw;
  word-break: break-all;
}

.output .header > *:last-child {
  flex: 1;
  word-break: break-all;
  padding: 0 0 0 3px;
  margin: 0 0 0 8px;
}

.output .entry {
  word-break: break-word;
}

.output .error {
  color: var(--error);
}

.output .error-stack {
  padding: 1rem;
  border: 1px solid var(--error);
  font-weight: bold;
  font-size: 12px;
}

.prompt {
  display: flex;
  line-height: 1;
  margin-top: 8px;
  border-left: 2px solid var(--lightgray);
  padding-left: 5px;
}

.prompt strong {
  max-width: 50vw;
  word-break: break-all;
}

.prompt input {
  flex: 1;
  position: relative;
  background: transparent;
  top: -1px;
  left: -2px;
  line-height: 1;
  font-size: inherit;
  font-weight: inherit;
  outline: 0;
  border: 0;
  padding: 0 0 0 5px;
  margin: 0 0 0 8px;
  font-family: var(--font);
  color: inherit;
}

.prompt input:focus {
  background: #fff2;
}

.subprompt {
  display: flex;
  align-items: center;
  margin: 2px 0;
}

.subprompt .def {
  margin-left: 5px;
  color: var(--lightgray);
}

.subprompt input {
  flex: 1;
  margin-left: 5px;
}

.subprompt.active-prompt + .entry .spinner {
  display: none;
}

.floating-help-outer {
  position: relative;
  min-height: 140px;
}

.floating-help-inner {
  position: absolute;
}

.tab-completion {
  display: grid;
  grid-template-columns: repeat(auto-fill, 300px);
  grid-gap: 5px;
  border: 1px solid var(--gray);
  border-radius: 4px;
  margin: 5px 0;
  padding: 10px;
  width: calc(100vw - 20px);
  box-sizing: border-box;
  max-width: 920px;
}

.tab-completion a {
  color: var(--lightgray);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  box-sizing: border-box;
}

.tab-completion a strong {
  color: var(--default);
}

.live-help {
  padding: 10px;
  word-break: break-word;
  width: calc(100vw - 20px);
  box-sizing: border-box;
}

.color-default { color: var(--default); }
.color-background { color: var(--background); }
.color-lightgray { color: var(--lightgray); }
.color-gray { color: var(--gray); }
.color-darkgray { color: var(--darkgray); }
.color-error { color: var(--error); }
.color-warning { color: var(--warning); }
.color-success { color: var(--success); }
.color-info { color: var(--info); }

.bg-default { background: var(--default); }
.bg-background { background: var(--background); }
.bg-lightgray { background: var(--lightgray); }
.bg-gray { background: var(--gray); }
.bg-darkgray { background: var(--darkgray); }
.bg-error { background: var(--error); }
.bg-warning { background: var(--warning); }
.bg-success { background: var(--success); }
.bg-info { background: var(--info); }
.bg-background { background: var(--background); }

.border-default { border-radius: 4px; border: 1px solid var(--default); }
.border-lightgray { border-radius: 4px; border: 1px solid var(--lightgray); }
.border-gray { border-radius: 4px; border: 1px solid var(--gray); }
.border-darkgray { border-radius: 4px; border: 1px solid var(--darkgray); }
.border-error { border-radius: 4px; border: 1px solid var(--error); }
.border-warning { border-radius: 4px; border: 1px solid var(--warning); }
.border-success { border-radius: 4px; border: 1px solid var(--success); }
.border-info { border-radius: 4px; border: 1px solid var(--info); }

.weight-thin { font-weight: 400; }
.weight-normal { font-weight: 500; }
.weight-bold { font-weight: 600; }
`
export default cssStr