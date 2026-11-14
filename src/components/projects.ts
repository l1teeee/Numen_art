export const STYLE_GROUPS = ['Organic', 'Luminous', 'Geometric', 'Digital'] as const

export type StyleGroup = (typeof STYLE_GROUPS)[number]

export type Project = {
  index: string
  name: string
  style: StyleGroup
  url: string
  media: string
  mobileMedia?: string
  video?: string
  mobileVideo?: string
  artwork?: 'pa-sprig'
}

// Ordered by style, the same four styles the gallery section presents.
export const PROJECTS: Project[] = [
  { index: '01', name: 'nature', style: 'Organic', url: 'https://nat-psi-ten.vercel.app/', media: 'project-nature', mobileMedia: 'project-nature-mobile', video: 'project-nature', mobileVideo: 'project-nature-mobile' },
  { index: '02', name: 'Studio Viu', style: 'Organic', url: 'https://viu-chi.vercel.app/', media: 'project-viu', mobileMedia: 'project-viu-mobile', video: 'project-viu', mobileVideo: 'project-viu-mobile' },
  { index: '03', name: 'LOYAL', style: 'Organic', url: 'https://loyal-omega-nine.vercel.app/', media: 'project-loyal', video: 'project-loyal' },
  { index: '04', name: 'hoon', style: 'Organic', url: 'https://hoon-woad.vercel.app/', media: 'project-hoon', mobileMedia: 'project-hoon-mobile', video: 'project-hoon', mobileVideo: 'project-hoon-mobile' },
  { index: '05', name: 'pa', style: 'Organic', url: 'https://suy-mauve.vercel.app/', media: 'project-pa', mobileMedia: 'project-pa-mobile', artwork: 'pa-sprig' },
  { index: '06', name: 'tqmcoffee', style: 'Organic', url: 'https://tqmcoffee.vercel.app/', media: 'project-tqmcoffee', mobileMedia: 'project-tqmcoffee-mobile', video: 'project-tqmcoffee', mobileVideo: 'project-tqmcoffee-mobile' },
  { index: '07', name: 'sss', style: 'Organic', url: 'https://sss-rho-liart.vercel.app/', media: 'project-sss', mobileMedia: 'project-sss-mobile', video: 'project-sss', mobileVideo: 'project-sss-mobile' },
  { index: '08', name: 'gre', style: 'Organic', url: 'https://gre-black-two.vercel.app/', media: 'project-gre', mobileMedia: 'project-gre-mobile', video: 'project-gre', mobileVideo: 'project-gre-mobile' },
  { index: '09', name: 'look', style: 'Luminous', url: 'https://look-liart-one.vercel.app/', media: 'project-look', mobileMedia: 'project-look-mobile', video: 'project-look', mobileVideo: 'project-look-mobile' },
  { index: '10', name: 'Memoria', style: 'Luminous', url: 'https://cosmos-carboncillo.vercel.app/', media: 'project-memoria', video: 'project-memoria' },
  { index: '11', name: 'Solar', style: 'Luminous', url: 'https://solar-three-phi.vercel.app/', media: 'project-solar', mobileMedia: 'project-solar-mobile', video: 'project-solar', mobileVideo: 'project-solar-mobile' },
  { index: '12', name: 'mimo', style: 'Luminous', url: 'https://mimo-topaz.vercel.app/', media: 'project-mimo', mobileMedia: 'project-mimo-mobile', video: 'project-mimo', mobileVideo: 'project-mimo-mobile' },
  { index: '13', name: 'ria', style: 'Luminous', url: 'https://ria-blue.vercel.app/', media: 'project-ria', mobileMedia: 'project-ria-mobile', video: 'project-ria', mobileVideo: 'project-ria-mobile' },
  { index: '14', name: 'simple', style: 'Geometric', url: 'https://simple-umber-delta.vercel.app/', media: 'project-simple', mobileMedia: 'project-simple-mobile', video: 'project-simple', mobileVideo: 'project-simple-mobile' },
  { index: '15', name: 'BRUK', style: 'Geometric', url: 'https://bruk-psi.vercel.app/', media: 'project-bruk', mobileMedia: 'project-bruk-mobile', video: 'project-bruk', mobileVideo: 'project-bruk-mobile' },
  { index: '16', name: 'brut', style: 'Geometric', url: 'https://brut-ten.vercel.app/', media: 'project-brut', mobileMedia: 'project-brut-mobile', video: 'project-brut', mobileVideo: 'project-brut-mobile' },
  { index: '17', name: 'rantt', style: 'Geometric', url: 'https://rantt.vercel.app/', media: 'project-rantt', mobileMedia: 'project-rantt-mobile', video: 'project-rantt', mobileVideo: 'project-rantt-mobile' },
  { index: '18', name: 'geo', style: 'Geometric', url: 'https://geo-theta-two.vercel.app/', media: 'project-geo', mobileMedia: 'project-geo-mobile', video: 'project-geo', mobileVideo: 'project-geo-mobile' },
  { index: '19', name: 'Still', style: 'Geometric', url: 'https://nav-umber-beta.vercel.app/', media: 'project-still', mobileMedia: 'project-still-mobile' },
  { index: '20', name: 'aci', style: 'Geometric', url: 'https://aci-azure.vercel.app/', media: 'project-aci', mobileMedia: 'project-aci-mobile', video: 'project-aci', mobileVideo: 'project-aci-mobile' },
  { index: '21', name: 'XIT', style: 'Digital', url: 'https://xit-nu.vercel.app/', media: 'project-xit', video: 'project-xit' },
  { index: '22', name: 'CRETE', style: 'Digital', url: 'https://crete-two.vercel.app/', media: 'project-crete', mobileMedia: 'project-crete-mobile', video: 'project-crete', mobileVideo: 'project-crete-mobile' },
  { index: '23', name: 'turnsa', style: 'Digital', url: 'https://turnsa.vercel.app/', media: 'project-turnsa', mobileMedia: 'project-turnsa-mobile', video: 'project-turnsa', mobileVideo: 'project-turnsa-mobile' },
  { index: '24', name: 'teller', style: 'Digital', url: 'https://teller-iota.vercel.app/', media: 'project-teller', mobileMedia: 'project-teller-mobile', video: 'project-teller', mobileVideo: 'project-teller-mobile' },
  { index: '25', name: 'brian', style: 'Digital', url: 'https://brian-eta.vercel.app/', media: 'project-brian', mobileMedia: 'project-brian-mobile', video: 'project-brian', mobileVideo: 'project-brian-mobile' },
  { index: '26', name: 'oi', style: 'Digital', url: 'https://oi-nine-mu.vercel.app/', media: 'project-oi', mobileMedia: 'project-oi-mobile', video: 'project-oi', mobileVideo: 'project-oi-mobile' },
  { index: '27', name: 'situ', style: 'Digital', url: 'https://situ-mocha.vercel.app/', media: 'project-situ', mobileMedia: 'project-situ-mobile', video: 'project-situ', mobileVideo: 'project-situ-mobile' },
]
