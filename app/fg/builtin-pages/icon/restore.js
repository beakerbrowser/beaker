import * as svg from '../../lib/svg'

export default function render () {
  return svg.render(`
    <svg style="transform: scaleX(-1)" class="icon restore" width="16px" height="15px" viewBox="0 0 16 15" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="refresh" transform="translate(1.000000, 1.000000)">
          <path d="M10.9451459,1.75753722 C9.78269142,0.66752209 8.21929978,0 6.5,0 C2.91014913,0 0,2.91014913 0,6.5 C0,10.0898509 2.91014913,13 6.5,13 C9.00186057,13 11.173586,11.5865234 12.2601674,9.51457898" id="circle" stroke="#000000" stroke-width="2" stroke-linecap="round"/>
          <polygon id="triangle" fill="#000000" points="14.2374369 4.98743687 9.64124279 4.63388348 13.8838835 0.391242789"/>
        </g>
      </g>
    </svg>
  `)
}
