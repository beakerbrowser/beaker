import {css} from '../vendor/lit-element/lit-element.js'
import emptyCSS from './com/empty.css.js'
import spinnerCSS from './com/spinner.css.js'

const cssStr = css`
${emptyCSS}
${spinnerCSS}

:host {
  display: block;
}

.layout {
  max-width: 640px;
  margin: 0 auto;
  padding: 0 10px;
}

.layout.wide {
  max-width: 960px;
}

.layout.left-col {
  display: grid;
  grid-template-columns: 300px 1fr;
  grid-gap: 10px;
}

.layout.right-col {
  display: grid;
  grid-template-columns: 1fr 300px;
  grid-gap: 10px;
}

.layout.split-col {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-gap: 10px;
}

@media (max-width: 900px) {
  .layout.right-col {
    grid-template-columns: 1fr;
  }
  .layout.right-col > :last-child {
    display: none;
  }
}

header {
  background: #fff;
  padding: 0 10px;
  margin-bottom: 20px;
}

header .inner {
  display: flex;
  max-width: 960px;
  margin: 0 auto;
}

header a {
  display: block;
  color: #556;
  font-weight: 500;
  text-decoration: none;
  font-size: 16px;
  padding: 2px 5px;
  margin-right: 20px;
  border-bottom: 2px solid transparent;
}

header a:last-child {
  margin-right: 10px;
}

header a:hover,
header a.active {
  color: var(--blue);
  border-bottom: 2px solid var(--blue);
}

header a .fa-fw {
  margin-right: 4px;
  width: 26px;
}

header img {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  object-fit: cover;
  margin-right: 4px;
  border: 2px solid #fff;
  
  vertical-align: middle;
  position: relative;
  top: -2px;
}

header .spacer {
  flex: 1;
}

`
export default cssStr