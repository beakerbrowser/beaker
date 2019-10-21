import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
:host {
  display: block;
  padding-bottom: 100px;
}

a {
  text-decoration: none;
}

a:hover {
  text-decoration: underline;
}

.feed {
}

.item {
  max-width: 540px;
  margin: 0 auto 10px;
  border: 1px solid #d0d0d9;
  border-radius: 8px;
  margin-bottom: 10px;
}

.item.selected {
  border-color: #d3d3de;
  background: #fafafd;
}

.item .header {
  display: flex;
  align-items: center;
  padding: 10px;
  font-size: 12px;
  color: #556;
}

.item .header > * {
  margin-right: 5px;
}

.item .header img {
  display: inline-block;
  object-fit: cover;
  width: 20px;
  height: 20px;
  margin-right: 8px;
  border-radius: 50%;
}

.item .header .date {
  color: #99a;
}

.item .header .author {
  font-weight: 500;
  color: inherit;
}

.item .header .name {
  margin-right: 5px;
  color: inherit;
}

.item .content {
  max-height: 400px;
  overflow: hidden;
  padding: 2px 12px 12px;
}

.item .footer {
  background: var(--bg-color--light);
  border-top: 1px solid #e0e0e9;
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
}

.item .footer social-signals {
  padding: 6px 10px;
}

`
export default cssStr