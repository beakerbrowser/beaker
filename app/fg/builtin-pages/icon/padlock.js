import * as svg from '../../lib/svg'

export default function render () {
  return svg.render(`
    <svg class="icon padlock" width="180px" height="221px" viewBox="0 0 180 221" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
      <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="padlock" transform="translate(0.000000, 13.000000)">
          <rect id="bottom" fill-fill="#000000" x="0" y="89" width="180" height="119" rx="8"/>
          <path id="top" d="M32.9765625,89.125 C32.9704162,88.7923789 33,55.3340372 33,55 C33,24.6243388 58.5197693,0 90,0 C121.480231,0 147,24.6243388 147,55 C147,55.3340372 146.144818,88.9427695 146.138672,89.2753906" stroke="#000000" stroke-width="25"/>
        </g>
      </g>
    </svg>
  `)
}
