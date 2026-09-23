/** F2B: authored in moulding units (50 units = one frame thickness).
 * Unequal rail scrolls cradle a diagonal acanthus. No mirrored corner instances.
 * Closed masses are reused for contact relief, body and gilded edge catches. */
export const masses = [
  // Horizontal scroll: a broad rolled shoulder dwindles into a buried rail tongue.
  'M30 31 C42 8 60 5 73 13 C86 21 82 37 70 39 C59 41 52 32 57 25 C61 20 68 23 67 28 C64 25 61 27 63 30 C67 36 76 30 73 24 C68 14 51 20 45 31 C65 45 86 26 103 22 C116 18 126 22 143 15 C132 29 116 27 107 30 C87 36 65 54 45 42 Z',
  // Left scroll deliberately has a longer neck and tighter return.
  'M29 33 C9 43 5 62 13 77 C21 90 35 85 37 75 C39 66 31 60 26 64 C22 68 25 73 29 72 C26 69 29 67 31 70 C35 76 26 81 21 75 C12 64 22 49 32 47 C46 65 30 86 25 103 C22 115 24 126 16 140 C20 123 15 116 17 104 C20 84 37 66 27 53 Z',
  // Primary acanthus: broad serrated lobes, recurved crown, narrow rooted heel.
  'M53 56 C42 52 34 46 26 42 C15 44 8 39 5 33 C12 36 15 33 17 31 C5 29 0 23 1 16 C8 22 13 21 16 19 C7 14 5 5 8 -4 C12 2 20 1 23 8 C25 1 32 0 35 3 C29 8 32 15 35 19 C36 11 42 9 47 12 C42 16 42 23 43 28 C46 22 51 23 55 26 C49 31 47 36 48 41 C55 44 59 50 53 56 Z',
  // Fold that wraps the lower shoulder and turns back toward the opening.
  'M31 42 C36 39 43 40 49 44 C57 49 60 58 55 63 C51 66 46 62 48 59 C50 62 54 60 52 57 C48 51 41 55 37 52 C40 51 42 48 39 47 C32 49 26 47 24 43 Z',
] as const

export const folds = [
  'M11 3 C17 10 22 12 27 21 C32 29 40 42 52 53 C39 47 27 35 23 25 C20 16 16 12 11 3 Z',
  'M5 18 C12 24 18 21 23 25 L28 33 C18 28 12 31 5 18 Z',
  'M10 34 C17 38 21 32 28 33 L34 40 C23 36 21 44 10 34 Z',
  'M34 5 C29 14 36 19 33 29 L28 24 C26 13 28 8 34 5 Z',
  'M46 14 C39 23 45 29 40 37 L35 31 C40 26 36 20 46 14 Z',
  'M53 27 C44 36 50 39 47 44 L42 40 C45 33 45 30 53 27 Z',
  'M39 43 C49 45 57 52 55 59 C52 51 45 52 39 48 Z',
  'M44 29 C52 15 66 13 73 21 C61 17 53 25 50 32 Z',
  'M19 53 C12 65 17 77 24 79 C17 69 22 61 26 57 Z',
  'M69 43 C90 37 104 25 125 25 C105 28 97 34 84 40 Z',
  'M29 84 C24 100 18 112 20 122 C17 105 22 95 29 84 Z',
] as const

export const cuts = [
  'M14 9 C25 22 27 36 48 50',
  'M15 25 Q21 25 26 30 M20 38 Q26 35 31 37',
  'M31 15 Q30 24 33 28 M41 23 Q39 31 39 34',
  'M48 30 Q44 36 45 40 M41 48 Q51 49 55 56',
  'M47 30 C55 18 70 16 74 25 C77 33 68 38 62 34',
  'M23 50 C12 61 16 76 23 79 C31 83 37 75 33 69',
] as const

export const edges = [
  'M9 -2 Q12 4 20 7 M3 17 Q7 25 17 25 M7 34 Q13 40 21 38',
  'M34 3 Q27 9 32 18 M46 12 Q39 16 41 26 M53 26 Q47 30 47 36',
  'M15 8 C25 17 26 34 49 50 M33 42 Q44 40 51 49',
  'M44 20 C54 10 67 10 74 17 M79 28 C78 36 73 40 63 38',
  'M12 54 Q7 66 15 77 M24 84 Q37 84 37 73',
  'M81 38 Q104 22 121 24 M23 99 Q18 111 20 120',
] as const
