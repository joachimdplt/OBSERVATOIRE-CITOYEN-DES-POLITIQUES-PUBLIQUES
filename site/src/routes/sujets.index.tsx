import { createFileRoute, redirect } from '@tanstack/react-router'

/**
 * Plus de page d'entrée : le dock des sujets, en haut de chaque sujet,
 * suffit. « /sujets » ouvre le premier sujet de la grille, dans l'ordre
 * officiel des codes, sans préférence.
 */
export const Route = createFileRoute('/sujets/')({
  beforeLoad: () => {
    throw redirect({
      to: '/sujets/grille/$code',
      params: { code: '1' },
      statusCode: 302,
    })
  },
})
