import { useEffect, useRef } from 'react'
import type { MapLayerMouseEvent, Map as MapLibreMap } from 'maplibre-gl'
import { fillExpression } from './palette'

import 'maplibre-gl/dist/maplibre-gl.css'

const TILES = 'https://data.geopf.fr/tms/1.0.0/ADMIN_EXPRESS/{z}/{x}/{y}.pbf'
const FRANCE: [number, number, number, number] = [-5.3, 41.2, 9.7, 51.2]
const LAYERS = ['commune', 'arrondissement_municipal'] as const

type Props = {
  /** La classe de chaque code INSEE : son rang, ou -1 pour une absence. */
  classes: Map<string, number>
  /** La teinte de chaque classe, dans l'ordre. */
  colors: readonly string[]
  onSelect: (territory: { code: string; name: string }) => void
}

/**
 * La carte de France, commune par commune, sur le fond officiel de l'IGN
 * (ADMIN EXPRESS). Elle ne se dessine que dans le navigateur.
 */
export function IndicatorMap({ classes, colors, onSelect }: Props) {
  const container = useRef<HTMLDivElement>(null)
  const map = useRef<MapLibreMap | null>(null)
  const select = useRef(onSelect)
  select.current = onSelect

  useEffect(() => {
    let cancelled = false
    void import('maplibre-gl').then((maplibregl) => {
      if (cancelled || !container.current) return
      const instance = new maplibregl.Map({
        container: container.current,
        bounds: FRANCE,
        attributionControl: { compact: true },
        style: {
          version: 8,
          sources: {
            admin: {
              type: 'vector',
              tiles: [TILES],
              minzoom: 2,
              maxzoom: 16,
              promoteId: {
                commune: 'code_insee',
                arrondissement_municipal: 'code_insee',
              },
              attribution: 'IGN, ADMIN EXPRESS',
            },
          },
          layers: [
            {
              id: 'fond',
              type: 'background',
              paint: { 'background-color': '#ffffff' },
            },
            ...LAYERS.map((layer) => ({
              id: layer,
              type: 'fill' as const,
              source: 'admin',
              'source-layer': layer,
              paint: {
                'fill-color': fillExpression(colors) as never,
                'fill-outline-color': 'rgba(255,255,255,0.15)',
              },
            })),
            {
              id: 'departements',
              type: 'line',
              source: 'admin',
              'source-layer': 'departement',
              paint: { 'line-color': '#ffffff', 'line-width': 0.8 },
            },
          ],
        },
      })
      instance.addControl(
        new maplibregl.NavigationControl({ showCompass: false }),
        'top-right',
      )
      instance.on('click', [...LAYERS], (e: MapLayerMouseEvent) => {
        const props = e.features?.[0]?.properties as
          { code_insee?: string; nom_officiel?: string } | undefined
        if (props?.code_insee)
          select.current({
            code: props.code_insee,
            name: props.nom_officiel ?? props.code_insee,
          })
      })
      for (const layer of LAYERS) {
        instance.on(
          'mouseenter',
          layer,
          () => (instance.getCanvas().style.cursor = 'pointer'),
        )
        instance.on(
          'mouseleave',
          layer,
          () => (instance.getCanvas().style.cursor = ''),
        )
      }
      map.current = instance
    })
    return () => {
      cancelled = true
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    const paint = () => {
      const instance = map.current
      if (!instance) return
      for (const layer of LAYERS) {
        instance.setPaintProperty(
          layer,
          'fill-color',
          fillExpression(colors) as never,
        )
      }
      for (const layer of LAYERS)
        instance.removeFeatureState({ source: 'admin', sourceLayer: layer })
      for (const [code, cls] of classes) {
        for (const layer of LAYERS)
          instance.setFeatureState(
            { source: 'admin', sourceLayer: layer, id: code },
            { cls },
          )
      }
    }
    const instance = map.current
    if (instance?.isStyleLoaded()) paint()
    else {
      const timer = setInterval(() => {
        if (map.current?.isStyleLoaded()) {
          clearInterval(timer)
          paint()
        }
      }, 100)
      return () => clearInterval(timer)
    }
  }, [classes, colors])

  return (
    <div
      ref={container}
      className="h-[70vh] min-h-[420px] w-full overflow-hidden rounded-xl"
    />
  )
}
