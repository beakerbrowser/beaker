import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import spinnerCSS from 'beaker://app-stdlib/css/com/spinner.css.js'

const cssStr = css`
${spinnerCSS}

:host {
  --black: #223;
  --white: #eef;
  --lightgray: #aab;
  --gray: #889;
  --darkgray: #556;
  --darkergray: #334;
  --red: #f00;
  --green: #0f0;
  --yellow: #ff0;
  --blue: #97f;
  --darkblue: #83f;
  --link: var(--blue);
  --font: Consolas, Menlo, Monaco, Lucida Console, Liberation Mono, DejaVu Sans Mono, Bitstream Vera Sans Mono, Courier New, monospace, serif;

  display: block;
  background: var(--black);
  color: var(--white);
  padding: 10px 32px 10px 10px;
  overflow-y: auto;
}

:host section {
  position: relative;
  border-top: 1px solid var(--lightgray);
  padding: 16px 0 0;
  opacity: 0;
  animation: entry-reveal 0.5s forwards;
}

@keyframes entry-reveal {
  from { opacity: 0; }
  to { opacity: 1; }
}

.heading {
  position: absolute;
  top: 0;
  left: 0;
  font-size: 10px;
  background: var(--white);
  color: var(--black);
  letter-spacing: 0.5px;
  padding: 2px 4px;
  text-shadow: none;

  white-space: nowrap;
  overflow: hidden;
  animation: heading-reveal 0.5s forwards;
  width: 0;
}

@keyframes heading-reveal {
  from { width: 0; }
  to { width: 130px; }
}

:host > .in2 { animation-delay: 0.2s; }
:host > .in2 .heading { animation-delay: 0.2s; }
:host > .in3 { animation-delay: 0.4s; }
:host > .in3 .heading { animation-delay: 0.4s; }
:host > .in4 { animation-delay: 0.6s; }
:host > .in4 .heading { animation-delay: 0.6s; }

.content {
  padding: 14px 14px 18px;
}

a {
  color: var(--link);
}

button {
  background: var(--black);
  color: var(--white);
  padding: 1px 4px 2px;
  border: 0;
  border-radius: 2px;
  outline: 0;
}

button:hover {
  cursor: pointer;
  background: var(--black);
}

button[disabled] {
  opacity: 0.5;
  cursor: default;
}

h1 {
  font-size: 24px;
  line-height: 1;
  letter-spacing: 1px;
  margin: 0;
}

p.description {
  font-size: 16px;
  letter-spacing: 1px;
  margin: 5px 0 0;
}

input[type=range] {
  height: 25px;
  -webkit-appearance: none;
  margin: 10px 0;
  width: 100%;
  background: none;
}

input[type=range]:focus {
  outline: none;
}

input[type=range]::-webkit-slider-runnable-track {
  width: 100%;
  height: 12px;
  cursor: pointer;
  animate: 0.2s;
  background: transparent;
  border-radius: 12px;
  border: 1px solid var(--gray);
}

input[type=range]::-webkit-slider-thumb {
  border: 1px solid var(--white);
  height: 11px;
  width: 11px;
  border-radius: 50%;
  background: var(--black);
  cursor: pointer;
  -webkit-appearance: none;
}

input[type=range]:focus::-webkit-slider-runnable-track {
  background: inheerit;
}

.diff-merge-icon {
  font-size: 12px;
  line-height: 1;
}

.list {
  margin: 0 0 8px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid var(--darkgray);
  overflow: hidden;
  max-height: 180px;
  overflow: auto;
}

.fork {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  box-sizing: border-box;
  padding: 5px 10px;
  text-decoration: none;
  color: var(--white);
  background: var(--black);
  border-bottom: 1px solid var(--darkgray);
  letter-spacing: 0.5px;
  cursor: pointer;
}

.fork:hover {
  background: var(--black);
}

.fork.current small {
  margin-right: 5px;
  font-size: 11px;
}

.fork:last-child {
  border-bottom: 0;
}

input[name=version] {
  display: block;
  width: 100%;
  margin: 10px 0 0;
}

.history-ctrls {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.history-ctrls label {
  font-weight: normal;
}
`
export default cssStr