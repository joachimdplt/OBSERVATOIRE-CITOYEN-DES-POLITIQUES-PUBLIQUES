import { frenchNumber } from '../../../utils/number'
import { ABSENT_COLOR, CLASS_COLORS, OUTSIDE_COLOR } from './palette'

const Swatch = ({ color }: { color: string }) => (
  <span
    className="inline-block h-3 w-5 rounded-sm ring-1 ring-slate-200"
    style={{ backgroundColor: color }}
  />
)

/**
 * La légende dit tout ce que montre la carte : les cinq classes, chacune à
 * partir de la valeur d'un territoire réel, l'absence de valeur, et les
 * territoires que le fichier ne couvre pas.
 */
export function MapLegend({ lower, unit }: { lower: string[]; unit: string }) {
  return (
    <div className="space-y-2 text-xs text-slate-600">
      <p className="font-medium text-slate-900">{unit}</p>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
        {lower.map((value, k) => (
          <li key={k} className="flex items-center gap-1.5">
            <Swatch color={CLASS_COLORS[k]} />
            {k === 0
              ? 'moins de ' + frenchNumber(lower[1] ?? value)
              : `à partir de ${frenchNumber(value)}`}
          </li>
        ))}
        <li className="flex items-center gap-1.5">
          <Swatch color={ABSENT_COLOR} /> non documenté
        </li>
        <li className="flex items-center gap-1.5">
          <Swatch color={OUTSIDE_COLOR} /> hors du fichier pour cette année
        </li>
      </ul>
      <p className="text-slate-400">
        Cinq classes de même effectif. Les bornes sont des valeurs publiées, non
        arrondies.
      </p>
    </div>
  )
}
