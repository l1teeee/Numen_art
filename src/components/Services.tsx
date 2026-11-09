import Grain from './Grain'
import styles from './Services.module.css'

const INTRO = ['We give ideas an identity,', 'a direction and a home.']

const SERVICES = [
  { name: 'Brand', lines: ['Identities with a pulse.', 'Naming, systems, art direction.'] },
  { name: 'Motion', lines: ['Design that moves.', 'Film, product, title sequences.'] },
  { name: 'Experience', lines: ['Websites people step into.', 'Interactive worlds.'] },
]

const STEPS = [
  { number: '01', name: 'Idea', text: 'We start by listening: what it is, who it is for, why it matters.' },
  { number: '02', name: 'Identity', text: 'Name, visual system and tone, so it is recognised anywhere.' },
  { number: '03', name: 'Direction', text: 'Art direction and motion that set the mood of every piece.' },
  { number: '04', name: 'Web', text: 'An experience built around the idea, ready to go live.' },
]

function inkId(index: number) {
  return `services-ink-${index}`
}

// Uneven ink for the titles: noise nudges the outlines and scales the level that redraws them,
// so a letter runs a little thicker in one place than another. Multiplying by the letter's
// own alpha means the noise can never draw outside it.
function InkFilter({ id }: { id: string }) {
  return (
    <filter id={id} colorInterpolationFilters="sRGB">
      <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} seed={7} result="noise" data-ink-noise />
      <feDisplacementMap
        in="SourceGraphic"
        in2="noise"
        scale={0.7}
        xChannelSelector="R"
        yChannelSelector="G"
        result="moved"
        data-ink-displacement
      />
      <feGaussianBlur in="moved" stdDeviation={0.22} result="soft" />
      <feColorMatrix in="noise" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  1 0 0 0 0" result="noiseAlpha" />
      <feComposite in="soft" in2="noiseAlpha" operator="arithmetic" k1={0.5} k2={0.75} k3={0} k4={0} result="swollen" />
      <feComponentTransfer in="swollen">
        <feFuncA type="linear" slope={9} intercept={-3} />
      </feComponentTransfer>
    </filter>
  )
}

function Verse({ lines }: { lines: string[] }) {
  return (
    <p className={styles.verse}>
      {lines.map((line) => (
        <span key={line} data-services-line>
          {line}
        </span>
      ))}
    </p>
  )
}

export default function Services() {
  return (
    <section className={styles.services} aria-label="What we do">
      <Grain />

      <svg className={styles.defs} aria-hidden="true">
        {SERVICES.map((service, i) => (
          <InkFilter id={inkId(i)} key={service.name} />
        ))}
      </svg>

      <div className={styles.column} data-services-column>
        <Verse lines={INTRO} />
        {SERVICES.map((service, i) => (
          <div className={styles.block} key={service.name}>
            <h2 className={styles.name} style={{ filter: `url(#${inkId(i)})` }} data-services-line data-services-title>
              <span className={styles.nameInner}>{service.name}</span>
            </h2>
            <Verse lines={service.lines} />
          </div>
        ))}
      </div>

      <ol className={styles.steps} aria-label="How a project moves">
        {STEPS.map((step) => (
          <li className={styles.step} key={step.number} data-services-line>
            <span className={styles.stepInner}>
              <span className={styles.stepNumber}>{step.number}</span>
              <span className={styles.stepName}>{step.name}</span>
              <span className={styles.stepText}>{step.text}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  )
}
