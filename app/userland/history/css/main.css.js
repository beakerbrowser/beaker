import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from 'beaker://app-stdlib/css/buttons2.css.js'
import inputsCSS from 'beaker://app-stdlib/css/inputs.css.js'

const cssStr = css`
${buttonsCSS}
${inputsCSS}

:host {
  display: block;
  overflow-y: auto;
  height: 100vh;
}

header {
  padding: 14px 20px 0;
  position: sticky;
  top: 0;
  max-width: 700px;
  margin: 0 auto;
  background: var(--bg-color--default);
  z-index: 10;
}

main {
  max-width: 700px;
  margin: 0 auto;
  background: var(--bg-color--default);
  padding: 0 20px;
  min-height: calc(100vh - 150px);
}

nav {
  display: flex;
  margin-bottom: 12px;
}

nav a {
  padding: 10px 12px;
  border-radius: 4px;
  margin-right: 5px;
  cursor: pointer;
  font-weight: 500;
}

nav a.current,
nav a:hover {
  background: var(--bg-color--semi-light);
}

.search-container {
  position: relative;
  width: 100%;
  height: 32px;
  z-index: 3;
  margin-bottom: 10px;
}

.search-container .spinner,
.search-container .close-btn,
.search-container .search {
  position: absolute;
}

.search-container i.fa-search {
  position: absolute;
  left: 10px;
  top: 8.75px;
  color: var(--text-color--light);
}

.search-container .close-btn {
  right: 7px;
  top: 7px;
}

.search-container input.search {
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  padding: 0 10px;
  padding-left: 28px;
  box-sizing: border-box;
  border-color: var(--border-color--light);
}

.clear-history {
  display: inline-block;
  text-align: right;
  margin-bottom: 10px;
  cursor: pointer;
  color: var(--blue);
}

.clear-history:hover {
  text-decoration: underline;
}

.clear-history select {
  margin-left: 5px;
}

select {
  background: var(--bg-color--secondary);
  color: var(--text-color--default);
  border-color: var(--border-color--light);
}

.heading {
  position: sticky;
  top: 130px;
  z-index: 1;
  padding: 5px 0;
  margin: 0;
  color: var(--text-color--light);
  background: var(--bg-color--default);
  border-bottom: 1px solid var(--border-color--light);
  margin-bottom: -1px;
  font-weight: 400;
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.15px;
}

.heading:not(:first-of-type) {
  margin-top: 40px;
}

.empty {
  margin: 0;
  padding: 10px;
  background: var(--bg-color--light);
  text-align: center;
}

.row {
  display: flex;
  align-items: center;
  border: 1px solid var(--border-color--light);
  border-top: 0;
  padding: 0 15px;
  height: 40px;
  background: var(--bg-color--default);
}

.row:hover {
  background: var(--bg-color--light);
}

.row .link {
  display: flex;
  align-items: center;
  text-decoration: none;
  color: var(--text-color--default);
}

.row .favicon {
  display: inline;
  flex-basis: 20px;
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.row .title {
  max-width: 450px;
  display: inline-block;
  margin-right: 5px;
  color: var(--text-color--default);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row .url {
  max-width: 200px;
  margin-right: 20px;
  color: var(--text-color--light);
  font-weight: 300;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.row .actions {
  margin-left: auto;
  opacity: 0;
}

.row:hover .actions {
  opacity: 1;
}

`
export default cssStr