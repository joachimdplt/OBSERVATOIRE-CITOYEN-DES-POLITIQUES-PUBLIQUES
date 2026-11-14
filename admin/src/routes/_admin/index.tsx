import { Link, createFileRoute } from '@tanstack/react-router'
import { Plus } from 'lucide-react'
import { buttonClass } from '../../components/atoms/Button'
import { PageHeader } from '../../components/atoms/PageHeader'
import { CatalogueTree } from '../../components/organisms/catalogue/CatalogueTree'
import { useCatalogue } from '../../hooks/catalogue/useCatalogue'

export const Route = createFileRoute('/_admin/')({ component: CataloguePage })

function CataloguePage() {
  const { data: providers, isPending } = useCatalogue()
  return (
    <>
      <PageHeader
        title="Catalogue"
        lead="Qui publie quoi : chaque producteur, ses jeux de données, et les indicateurs de chaque jeu."
        action={
          <Link to="/providers/new" className={buttonClass()}>
            <Plus size={15} /> Producteur
          </Link>
        }
      />
      {isPending ? (
        <p className="text-sm text-slate-500">Chargement…</p>
      ) : providers && providers.length > 0 ? (
        <CatalogueTree providers={providers} />
      ) : (
        <div className="surface p-8 text-center text-sm text-slate-500">
          Aucun producteur déclaré. Commencez par la DREES, la DEPP ou l’INSEE.
        </div>
      )}
    </>
  )
}
