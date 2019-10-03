import {css} from '../../../app-stdlib/vendor/lit-element/lit-element.js'
import buttonsCSS from '../../../app-stdlib/css/buttons2.css.js'

const cssStr = css`
${buttonsCSS}

:host {
  display: block;
  border-bottom: 1px solid #ccc;
  padding: 5px 0;
}

h5 {
  margin: 5px 10px;
}

.content {
  padding: 5px 5px 10px;
}

.footer {
}

a:hover {
  cursor: pointer;
  text-decoration: underline;
}

.revision-indicator {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: -.4px;
  margin-left: -2px;
  margin-left: 4px;
  margin-right: 4px;
}

.revision-indicator.add { background: #44c35a; }
.revision-indicator.mod { background: #fac800; }
.revision-indicator.del { background: #d93229; }

a.add { color: #116520; }
a.mod { color: #9a7c05; }
a.del { color: #86120c; }
`
export default cssStr