import { redirect } from 'next/navigation'

interface HouseDetailPageProps {
  params: Promise<{ id: string }>
}

/**
 * Legacy route - redirects to the new house detail page
 * The visit recording page at /client/house/[id]/visit still works
 */
export default async function HouseDetailPage({ params }: HouseDetailPageProps) {
  const { id } = await params
  redirect(`/client/houses/${id}`)
}
