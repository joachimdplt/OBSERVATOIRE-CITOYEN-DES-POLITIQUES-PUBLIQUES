/**
 * Le cadre de chaque région de métropole sur la carte : ouest, sud, est,
 * nord, en degrés. Un réglage d'affichage, pas une donnée publiée.
 */
export const REGION_BOUNDS: Record<string, [number, number, number, number]> = {
  '11': [1.44, 48.12, 3.56, 49.24],
  '24': [0.05, 46.34, 3.13, 48.94],
  '27': [2.84, 46.15, 7.15, 48.4],
  '28': [-1.95, 48.18, 1.8, 50.08],
  '32': [1.38, 48.84, 4.26, 51.09],
  '44': [3.38, 47.42, 8.23, 50.17],
  '52': [-2.62, 46.27, 0.92, 48.57],
  '53': [-5.14, 47.28, -1.02, 48.9],
  '75': [-1.79, 42.78, 2.61, 47.18],
  '76': [-0.33, 42.33, 4.85, 45.05],
  '84': [2.06, 44.12, 7.19, 46.81],
  '93': [4.23, 42.98, 7.72, 45.13],
  '94': [8.53, 41.33, 9.56, 43.03],
}

export const FRANCE_BOUNDS: [number, number, number, number] = [
  -5.3, 41.2, 9.7, 51.2,
]
