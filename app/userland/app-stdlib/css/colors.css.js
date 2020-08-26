import {css} from '../vendor/lit-element/lit-element.js'

const cssStr = css`
body {
  --blue: #2864dc; /* this is a leftover that ought to get replaced */
  --border-color--default: #bbc;
  --border-color--light: #ccd;
  --border-color--dark: #99a;
  --border-color--semi-light: #dde;
  --border-color--very-light: #eef;
  --text-color--default: #333;
  --text-color--lightish: #555;
  --text-color--light: #667;
  --text-color--pretty-light: #889;
  --text-color--very-light: #bbc;
  --text-color--markdown-link: #4040e7;
  --text-color--private-default: #4c6f3f;
  --text-color--private-link: #206d01;
  --bg-color--default: #fff;
  --bg-color--light: #fafafd;
  --bg-color--semi-light: #f0f0f6;
  --bg-color--private-light: #f7fbf7;
}

@media (prefers-color-scheme: dark) {
  body {
    --border-color--default: #669;
    --border-color--light: #558;
    --border-color--dark: #88a;
    --border-color--semi-light: #447;
    --border-color--very-light: #334;
    --text-color--default: #ccd;
    --text-color--lightish: #bbc;
    --text-color--light: #aab;
    --text-color--pretty-light: #99a;
    --text-color--very-light: #557;
    --text-color--markdown-link: #4040e7;
    --text-color--private-default: #4c6f3f;
    --text-color--private-link: #206d01;
    --bg-color--default: #223;
    --bg-color--light: #334;
    --bg-color--semi-light: #445;
    --bg-color--private-light: #f7fbf7;
  }
}
`
export default cssStr
