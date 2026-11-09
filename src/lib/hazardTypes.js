// Hazard categories shown on the submission form.
//
// `value` MUST stay exactly as the CV model's class names use them
// (see src/lib/localDetector.js CLASS_NAMES): Pothole, Crack, Debris, Scouring.
// Only the labels/descriptions below are presentation, so changing them never
// affects existing reports, detection results or exports.
//
// The descriptions use the simple Cebuano guide supplied by the LGU so older
// residents can quickly recognise what each category means.
export const HAZARD_TYPES = [
  {
    value: 'Pothole',
    label: 'Pothole',
    localLabel: 'Bangag sa dalan',
    description: 'Lungag o bangag sa kalsada nga mahimong hinungdan sa disgrasya.',
    tone: 'danger',
  },
  {
    value: 'Debris',
    label: 'Debris',
    localLabel: 'Mga sagbot o nagkatag nga butang',
    description: 'Mga bato, sanga, basura, o ubang butang nga nagkatag sa kalsada.',
    tone: 'blue',
  },
  {
    value: 'Crack',
    label: 'Crack',
    localLabel: 'Liki sa dalan',
    description: 'Mga liki o buak sa semento o aspalto sa kalsada.',
    tone: 'warning',
  },
  {
    value: 'Scouring',
    label: 'Scouring',
    localLabel: 'Pagkahugno sa yuta',
    description:
      'Pagkatangtang, pagkahugno sa yuta sa kilid o ilalom sa dalan nga mahimong hinungdan sa pagkadaot sa kalsada.',
    tone: 'purple',
  },
]

export const HAZARD_TYPE_VALUES = HAZARD_TYPES.map((type) => type.value)
