import * as svg from '../../lib/svg'

export default function render () {
  return svg.render(`
    <svg class="icon close" width="58px" height="58px" viewBox="0 0 58 58" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-linecap="round">
        <g id="close" transform="translate(4, 5)" stroke="#000000" stroke-width="10">
          <path d="M1.5,0.5 L48.5,47.5"/>
          <path d="M48.5,0 L1,48"/>
        </g>
      </g>
    </svg>`)
}
