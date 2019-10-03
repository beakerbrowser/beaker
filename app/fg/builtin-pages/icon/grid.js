import * as svg from '../../lib/svg'

export default function render () {
  return svg.render(`
    <svg class="icon grid" width="100px" height="99px" viewBox="0 0 100 99" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd" stroke-opacity="0.85">
        <g id="grid" stroke="#FFFFFF" stroke-width="9">
          <rect id="Rectangle-3" x="4.5" y="4.5" width="36" height="36" rx="4"/>
          <rect id="Rectangle-3-Copy" x="59.5" y="58.5" width="36" height="36" rx="4"/>
          <rect id="Rectangle-3-Copy-2" x="5.5" y="58.5" width="36" height="36" rx="4"/>
          <rect id="Rectangle-3-Copy-3" x="59.5" y="4.5" width="36" height="36" rx="4"/>
        </g>
      </g>
    </svg>
  `)
}
