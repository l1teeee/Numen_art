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
  { index: '04', name: 'pa', style: 'Organic', url: 'https://suy-mauve.vercel.app/', media: 'project-pa', mobileMedia: 'project-pa-mobile', artwork: 'pa-sprig' },
  { index: '05', name: 'look', style: 'Luminous', url: 'https://look-liart-one.vercel.app/', media: 'project-look', mobileMedia: 'project-look-mobile', video: 'project-look', mobileVideo: 'project-look-mobile' },
  { index: '06', name: 'Memoria', style: 'Luminous', url: 'https://cosmos-carboncillo.vercel.app/', media: 'project-memoria', video: 'project-memoria' },
  { index: '07', name: 'Solar', style: 'Luminous', url: 'https://solar-three-phi.vercel.app/', media: 'project-solar', mobileMedia: 'project-solar-mobile', video: 'project-solar', mobileVideo: 'project-solar-mobile' },
  { index: '08', name: 'mimo', style: 'Luminous', url: 'https://mimo-topaz.vercel.app/', media: 'project-mimo', mobileMedia: 'project-mimo-mobile', video: 'project-mimo', mobileVideo: 'project-mimo-mobile' },
  { index: '09', name: 'simple', style: 'Geometric', url: 'https://simple-umber-delta.vercel.app/', media: 'project-simple', mobileMedia: 'project-simple-mobile', video: 'project-simple', mobileVideo: 'project-simple-mobile' },
  { index: '10', name: 'BRUK', style: 'Geometric', url: 'https://bruk-psi.vercel.app/', media: 'project-bruk', mobileMedia: 'project-bruk-mobile', video: 'project-bruk', mobileVideo: 'project-bruk-mobile' },
  { index: '11', name: 'brut', style: 'Geometric', url: 'https://brut-ten.vercel.app/', media: 'project-brut', mobileMedia: 'project-brut-mobile', video: 'project-brut', mobileVideo: 'project-brut-mobile' },
  { index: '12', name: 'Still', style: 'Geometric', url: 'https://nav-umber-beta.vercel.app/', media: 'project-still', mobileMedia: 'project-still-mobile' },
  { index: '13', name: 'XIT', style: 'Digital', url: 'https://xit-nu.vercel.app/', media: 'project-xit', video: 'project-xit' },
  { index: '14', name: 'CRETE', style: 'Digital', url: 'https://crete-two.vercel.app/', media: 'project-crete', mobileMedia: 'project-crete-mobile', video: 'project-crete', mobileVideo: 'project-crete-mobile' },
  { index: '15', name: 'turnsa', style: 'Digital', url: 'https://turnsa.vercel.app/', media: 'project-turnsa', mobileMedia: 'project-turnsa-mobile', video: 'project-turnsa', mobileVideo: 'project-turnsa-mobile' },
  { index: '16', name: 'brian', style: 'Digital', url: 'https://brian-eta.vercel.app/', media: 'project-brian', mobileMedia: 'project-brian-mobile', video: 'project-brian', mobileVideo: 'project-brian-mobile' },
]
