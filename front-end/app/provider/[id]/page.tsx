import { ProviderProfile } from '@/components/provider-profile'

export default async function ProviderPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <ProviderProfile providerId={id} />
}
