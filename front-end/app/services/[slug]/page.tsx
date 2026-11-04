import { notFound } from 'next/navigation'
import { Marketplace } from '@/components/marketplace/marketplace'

const serviceCategorySlugs = new Set([
  'cemetery-services',
  'mortuary-services',
  'funeral-transportation',
  'funeral-equipment',
  'decorations-and-flowers',
  'cremation-services',
])

export default async function ServiceCategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  if (!serviceCategorySlugs.has(slug)) notFound()
  return <Marketplace categorySlug={slug} />
}
