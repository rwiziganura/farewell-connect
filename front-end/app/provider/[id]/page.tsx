import { ProviderDetail } from '@/components/app-pages'

export default async function ProviderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProviderDetail id={id} />
}
