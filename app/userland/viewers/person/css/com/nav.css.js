import {css} from 'beaker://app-stdlib/vendor/lit-element/lit-element.js'

const cssStr = css`
a {
  display: block;
  color: rgba(0,0,0,.75);
  text-decoration: none;
  padding: 5px 0;
  margin: 0 0 8px;
  cursor: pointer;
}

a span {
  margin: 0 5px;
}

a:hover,
a.current {
  color: var(--blue);
}

a.current {
  font-weight: 500;
}

hr {
  border: 0;
  border-top: 1px solid #ddd; 
}
`
export default cssStr