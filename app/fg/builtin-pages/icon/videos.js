import * as svg from '../../lib/svg'

export default function render () {
  return svg.render(`
<svg class="icon" width="80px" height="85px" viewBox="0 0 80 85" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
    <defs>
        <filter x="-9.7%" y="-6.5%" width="120.8%" height="119.5%" filterUnits="objectBoundingBox" id="filter-1">
            <feOffset dx="0" dy="2" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
            <feGaussianBlur stdDeviation="2" in="shadowOffsetOuter1" result="shadowBlurOuter1"></feGaussianBlur>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowBlurOuter1" result="shadowMatrixOuter1"></feColorMatrix>
            <feMerge>
                <feMergeNode in="shadowMatrixOuter1"></feMergeNode>
                <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
        </filter>
        <linearGradient x1="50%" y1="0%" x2="50%" y2="100%" id="linearGradient-2">
            <stop stop-color="#111111" offset="0%"></stop>
            <stop stop-color="#333333" offset="100%"></stop>
        </linearGradient>
        <filter x="-10.8%" y="-7.4%" width="121.5%" height="120.6%" filterUnits="objectBoundingBox" id="filter-3">
            <feOffset dx="0" dy="2" in="SourceAlpha" result="shadowOffsetOuter1"></feOffset>
            <feGaussianBlur stdDeviation="2" in="shadowOffsetOuter1" result="shadowBlurOuter1"></feGaussianBlur>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowBlurOuter1" result="shadowMatrixOuter1"></feColorMatrix>
            <feMerge>
                <feMergeNode in="shadowMatrixOuter1"></feMergeNode>
                <feMergeNode in="SourceGraphic"></feMergeNode>
            </feMerge>
        </filter>
        <rect id="path-4" x="57" y="0" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-5">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-6" x="57" y="9" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-7">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-8" x="57" y="18" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-9">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-10" x="57" y="27" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-11">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-12" x="57" y="36" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-13">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-14" x="57" y="45" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-15">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-16" x="57" y="54" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-17">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-18" x="57" y="63" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-19">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-20" x="11" y="0" width="42" height="32"></rect>
        <filter x="-4.8%" y="-6.2%" width="109.5%" height="112.5%" filterUnits="objectBoundingBox" id="filter-21">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-22" x="11" y="36" width="42" height="32"></rect>
        <filter x="-4.8%" y="-6.2%" width="109.5%" height="112.5%" filterUnits="objectBoundingBox" id="filter-23">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-24" x="0" y="0" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-25">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-26" x="0" y="9" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-27">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-28" x="0" y="18" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-29">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-30" x="0" y="27" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-31">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-32" x="0" y="36" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-33">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-34" x="0" y="45" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-35">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-36" x="0" y="54" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-37">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
        <rect id="path-38" x="0" y="63" width="7.5" height="5"></rect>
        <filter x="-26.7%" y="-40.0%" width="153.3%" height="180.0%" filterUnits="objectBoundingBox" id="filter-39">
            <feGaussianBlur stdDeviation="1.5" in="SourceAlpha" result="shadowBlurInner1"></feGaussianBlur>
            <feOffset dx="0" dy="1" in="shadowBlurInner1" result="shadowOffsetInner1"></feOffset>
            <feComposite in="shadowOffsetInner1" in2="SourceAlpha" operator="arithmetic" k2="-1" k3="1" result="shadowInnerInner1"></feComposite>
            <feColorMatrix values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.5 0" type="matrix" in="shadowInnerInner1"></feColorMatrix>
        </filter>
    </defs>
    <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
        <g id="videos" filter="url(#filter-1)" transform="translate(4.000000, 2.000000)">
            <rect id="Rectangle-22" fill="url(#linearGradient-2)" x="0" y="0" width="72" height="77" rx="2"></rect>
            <g id="Group-2" filter="url(#filter-3)" transform="translate(4.000000, 4.000000)">
                <g id="Rectangle-23-Copy-15">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-4"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-5)" xlink:href="#path-4"></use>
                </g>
                <g id="Rectangle-23-Copy-14">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-6"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-7)" xlink:href="#path-6"></use>
                </g>
                <g id="Rectangle-23-Copy-13">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-8"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-9)" xlink:href="#path-8"></use>
                </g>
                <g id="Rectangle-23-Copy-12">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-10"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-11)" xlink:href="#path-10"></use>
                </g>
                <g id="Rectangle-23-Copy-11">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-12"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-13)" xlink:href="#path-12"></use>
                </g>
                <g id="Rectangle-23-Copy-10">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-14"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-15)" xlink:href="#path-14"></use>
                </g>
                <g id="Rectangle-23-Copy-9">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-16"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-17)" xlink:href="#path-16"></use>
                </g>
                <g id="Rectangle-23-Copy-5">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-18"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-19)" xlink:href="#path-18"></use>
                </g>
                <g id="Rectangle-24">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-20"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-21)" xlink:href="#path-20"></use>
                </g>
                <g id="Rectangle-24-Copy">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-22"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-23)" xlink:href="#path-22"></use>
                </g>
                <g id="Rectangle-23">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-24"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-25)" xlink:href="#path-24"></use>
                </g>
                <g id="Rectangle-23-Copy">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-26"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-27)" xlink:href="#path-26"></use>
                </g>
                <g id="Rectangle-23-Copy-2">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-28"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-29)" xlink:href="#path-28"></use>
                </g>
                <g id="Rectangle-23-Copy-3">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-30"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-31)" xlink:href="#path-30"></use>
                </g>
                <g id="Rectangle-23-Copy-8">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-32"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-33)" xlink:href="#path-32"></use>
                </g>
                <g id="Rectangle-23-Copy-7">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-34"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-35)" xlink:href="#path-34"></use>
                </g>
                <g id="Rectangle-23-Copy-6">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-36"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-37)" xlink:href="#path-36"></use>
                </g>
                <g id="Rectangle-23-Copy-4">
                    <use fill="#FFFFFF" fill-rule="evenodd" xlink:href="#path-38"></use>
                    <use fill="black" fill-opacity="1" filter="url(#filter-39)" xlink:href="#path-38"></use>
                </g>
            </g>
        </g>
    </g>
</svg>
  `)
}
