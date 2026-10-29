export default function PaSprig() {
  return (
    <svg
      data-pa-sprig
      viewBox="0 0 160 120"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <filter id="pa-sprig-boil" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence data-pa-boil-noise type="fractalNoise" baseFrequency="0.035" numOctaves="2" seed="1" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="3.5" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
      <g filter="url(#pa-sprig-boil)">
        <path data-pa-draw pathLength="1" d="M45 107C56 89 60 72 77 53C88 38 102 28 111 12" />
        <path data-pa-draw pathLength="1" d="M51 94C42 96 34 92 29 85C38 83 47 88 51 94Z" />
        <path data-pa-draw pathLength="1" d="M58 79C66 71 79 72 88 78C80 84 67 84 58 79Z" />
        <path data-pa-draw pathLength="1" d="M64 69C51 69 42 62 37 53C49 53 59 59 64 69Z" />
        <path data-pa-draw pathLength="1" d="M75 55C83 47 96 48 105 53C96 59 84 61 75 55Z" />
        <path data-pa-draw pathLength="1" d="M86 41C75 39 67 31 64 22C74 24 83 31 86 41Z" />
        <path data-pa-draw pathLength="1" d="M97 30C106 22 118 23 128 27C120 34 106 36 97 30Z" />
        <path data-pa-draw pathLength="1" d="M106 20C99 17 97 10 99 3C106 7 109 13 106 20Z" />
        <path data-pa-draw data-pa-olive pathLength="1" d="M57 86C62 82 68 88 67 93C66 99 61 101 58 97C55 94 54 89 57 86Z" fill="currentColor" />
        <path data-pa-draw data-pa-olive pathLength="1" d="M79 47C82 51 78 57 74 58C69 59 67 54 70 50C72 46 76 44 79 47Z" fill="currentColor" />
      </g>
    </svg>
  )
}
