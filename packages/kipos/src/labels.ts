import type { CropId, Stage } from './lib/garden.js'

export type KiposLabels = {
  /** Accessible name of the whole bed. */
  bed: string
  /** How to use the bed, read out with it. */
  bedInstructions: string
  /** Accessible name of the tray with the seeds and the can. */
  tray: string
  wateringCan: string
  /** Packet names. `{Crop}` is the crop's name as written, `{crop}` lower-cased. */
  seedPacket: string
  /** `{n}` is the plot's number, left to right. */
  plot: string
  emptyPlot: string
  crops: Record<CropId, string>
  stages: Record<Stage, string>
  /** Basil's last two stages, which have no fruit. */
  bushy: string
  readyToPinch: string
  /** A geranium's last two stages. */
  budding: string
  inBloom: string
  thirsty: string
  wilted: string
  wet: string
  /** Shown under the bed, and read out, for whatever is in hand. */
  idleHint: string
  seedHint: string
  canHint: string
  /** Shown and read out after the matching event. `{Crop}` and `{crop}` as for `seedPacket`. */
  sown: string
  watered: string
  revived: string
  picked: string
  pickedLast: string
  plotTaken: string
  nothingToWater: string
  notRipe: string
  /** The kraft tag on the bed. `{n}` is a number. */
  dayTag: string
  pickedTag: string
  /** Accessible name of a teneke. `{Crop}` and `{crop}` as for `seedPacket`. */
  teneke: string
  tenekeInstructions: string
  sowTeneke: string
  pinch: string
  pinched: string
}

/** Every user-visible string Kipos renders. English by default. */
export const defaultLabels: KiposLabels = {
  bed: 'Garden bed',
  bedInstructions:
    'Pick up a seed packet and choose an empty plot to sow it. Pick up the watering can and choose a plot to water it. Plants grow over real days, but only while their soil is wet, so water them once a day. Forgotten plants wilt and wait; water revives them. Choose a ripe plant with nothing in hand to pick it. Escape puts things back.',
  tray: 'Seeds and watering can',
  wateringCan: 'Watering can',
  seedPacket: '{Crop} seeds',
  plot: 'Plot {n}',
  emptyPlot: 'empty',
  crops: { tomato: 'Tomato', cucumber: 'Cucumber', watermelon: 'Watermelon', basil: 'Basil', geranium: 'Geranium' },
  stages: {
    seed: 'just sown',
    sprout: 'sprouting',
    leafy: 'growing',
    flowering: 'flowering',
    fruiting: 'fruiting',
    ripe: 'ripe',
  },
  bushy: 'bushy',
  readyToPinch: 'ready to pinch back',
  budding: 'budding',
  inBloom: 'in full flower',
  thirsty: 'soil drying out',
  wilted: 'wilted, needs water',
  wet: 'soil wet',
  idleHint: 'Pick up a seed packet or the watering can.',
  seedHint: 'Choose an empty plot to sow the {crop}.',
  canHint: 'Choose a plot to water it.',
  sown: '{Crop} sown and watered in. Water it once a day.',
  watered: 'Watered. The soil stays wet for about a day.',
  revived: 'Watered. The {crop} is perking up.',
  picked: 'Picked a {crop}. More are coming.',
  pickedLast: 'Picked the {crop}. The plot is free again.',
  plotTaken: 'Something is already growing there.',
  nothingToWater: 'Nothing is planted there yet.',
  notRipe: 'The {crop} is not ready to pick yet.',
  dayTag: 'Day {n}',
  pickedTag: '{n} picked',
  teneke: '{Crop} in a tin',
  tenekeInstructions: 'Press to water. It grows over real days while the soil is wet, and wilts if it goes a day without water.',
  sowTeneke: 'Sow {crop}',
  pinch: 'Pinch',
  pinched: 'Pinched back. It will grow bushier.',
}

export type KiposLabelOverrides = Partial<Omit<KiposLabels, 'crops' | 'stages'>> & {
  crops?: Partial<KiposLabels['crops']>
  stages?: Partial<KiposLabels['stages']>
}

export const mergeLabels = (overrides: KiposLabelOverrides = {}): KiposLabels => ({
  ...defaultLabels,
  ...overrides,
  crops: { ...defaultLabels.crops, ...overrides.crops },
  stages: { ...defaultLabels.stages, ...overrides.stages },
})

/** Fills `{name}` slots; unknown slots are left as written. */
export const fill = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (match, name: string) => (name in values ? String(values[name]) : match))

/** `{Crop}` as the labels name it, `{crop}` lower-cased for the middle of a sentence. */
export const cropSlots = (labels: KiposLabels, crop: CropId) => ({
  Crop: labels.crops[crop],
  crop: labels.crops[crop].toLocaleLowerCase(),
})

/** The stage in words. Herbs and flowers have no fruit, so their last stages read differently. */
export function stageName(labels: KiposLabels, crop: CropId, stage: Stage) {
  if (crop === 'basil' && stage === 'fruiting') return labels.bushy
  if (crop === 'basil' && stage === 'ripe') return labels.readyToPinch
  if (crop === 'geranium' && stage === 'fruiting') return labels.budding
  if (crop === 'geranium' && stage === 'ripe') return labels.inBloom
  return labels.stages[stage]
}
