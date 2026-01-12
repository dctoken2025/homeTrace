import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { successResponse, errorResponse, ErrorCode, Errors } from '@/lib/api-response'
import { getSessionUser } from '@/lib/auth-session'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

// Schema for updating house buyer record
const updateSchema = z.object({
  isFavorite: z.boolean().optional(),
  notes: z.string().optional(),
})

/**
 * GET /api/houses/[id]
 * Get details of a specific house buyer record
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id } = await params

    // Get house buyer with all related data
    const houseBuyer = await prisma.houseBuyer.findUnique({
      where: { id },
      include: {
        house: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        addedByRealtor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    if (!houseBuyer || houseBuyer.deletedAt) {
      return errorResponse(ErrorCode.NOT_FOUND, 'House not found')
    }

    // Check access permissions
    const hasAccess =
      session.role === 'ADMIN' ||
      houseBuyer.buyerId === session.userId ||
      houseBuyer.addedByRealtorId === session.userId

    if (!hasAccess && session.role === 'REALTOR') {
      // Check if realtor is connected to this buyer
      const connection = await prisma.buyerRealtor.findFirst({
        where: {
          realtorId: session.userId,
          buyerId: houseBuyer.buyerId,
        },
      })

      if (!connection) {
        return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
      }
    } else if (!hasAccess) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    // Get visits for this house and buyer
    const visits = await prisma.visit.findMany({
      where: {
        houseId: houseBuyer.houseId,
        buyerId: houseBuyer.buyerId,
        deletedAt: null,
      },
      orderBy: { scheduledAt: 'desc' },
      include: {
        recordings: {
          select: {
            id: true,
            roomName: true,
            audioDuration: true,
            status: true,
            createdAt: true,
          },
        },
      },
    })

    // Get visit suggestions for this house and buyer (for realtors)
    let suggestions: Array<{
      id: string
      status: string
      suggestedAt: Date
      message: string | null
      createdAt: Date
    }> = []

    if (session.role === 'REALTOR' || session.role === 'ADMIN') {
      suggestions = await prisma.visitSuggestion.findMany({
        where: {
          houseId: houseBuyer.houseId,
          buyerId: houseBuyer.buyerId,
          deletedAt: null,
        },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          status: true,
          suggestedAt: true,
          message: true,
          createdAt: true,
        },
      })
    }

    // Extract rich data from rawApiData if available
    const rawData = houseBuyer.house.rawApiData as Record<string, unknown> | null
    const description = rawData?.description as Record<string, unknown> | undefined
    const features = rawData?.features as Array<{ category: string; text: string[] }> | undefined
    const priceHistory = rawData?.price_history as Array<{ date: string; price: number; event_name: string }> | undefined
    const taxHistory = rawData?.tax_history as Array<{ year: number; tax: number; assessment?: { total: number } }> | undefined
    const schools = rawData?.schools as Array<{ name: string; distance_in_miles: number; education_levels: string[]; rating: number; funding_type: string }> | undefined
    const location = rawData?.location as { neighborhoods?: Array<{ name: string; id: string }>; county?: { name: string; fips_code?: string }; street_view_url?: string } | undefined

    // Extract new rich data fields
    const mortgage = rawData?.mortgage as { estimate?: { monthly_payment: number; loan_amount: number; down_payment: number; total_payment: number; average_rate?: { rate: number; loan_type?: { term: number } }; monthly_payment_details?: Array<{ type: string; amount: number; display_name: string }> } } | undefined
    const hoa = rawData?.hoa as { fee: number } | undefined
    const advertisers = rawData?.advertisers as Array<{ name: string; email?: string; phones?: Array<{ number: string }>; photo?: { href: string }; state_license?: string; office?: { name: string; phones?: Array<{ number: string }>; photo?: { href: string } } }> | undefined
    const estimates = rawData?.estimates as { current_values?: Array<{ source: { name: string }; estimate: number; estimate_high: number; estimate_low: number; date: string }> } | undefined
    const flags = rawData?.flags as { is_new_construction?: boolean; is_foreclosure?: boolean; is_new_listing?: boolean; is_coming_soon?: boolean; is_contingent?: boolean; is_pending?: boolean; is_price_reduced?: boolean; is_short_sale?: boolean } | undefined
    const local = rawData?.local as { flood?: { flood_factor_score?: number; fema_zone?: string[] } } | undefined
    const details = rawData?.details as Array<{ category: string; text: string[] }> | undefined
    const propertyHistory = rawData?.property_history as Array<{ date: string; price: number; event_name: string; source_name?: string; listing?: { photos?: Array<{ href: string }> } }> | undefined
    const taxHistoryDetailed = rawData?.tax_history as Array<{ year: number; tax: number; assessment?: { building?: number; land?: number; total?: number } }> | undefined
    const nearbySchools = rawData?.nearby_schools as { schools?: Array<{ name: string; distance_in_miles: number; education_levels: string[]; rating?: number; parent_rating?: number; funding_type: string; grades?: string[]; student_count?: number; assigned?: boolean }> } | undefined
    const schoolsData = rawData?.schools as { schools?: Array<{ name: string; distance_in_miles: number; education_levels: string[]; rating?: number; parent_rating?: number; funding_type: string; grades?: string[]; student_count?: number; assigned?: boolean }> } | undefined

    // Format mortgage data
    const mortgageData = mortgage?.estimate ? {
      monthlyPayment: mortgage.estimate.monthly_payment || 0,
      loanAmount: mortgage.estimate.loan_amount || 0,
      downPayment: mortgage.estimate.down_payment || 0,
      totalPayment: mortgage.estimate.total_payment || 0,
      interestRate: mortgage.estimate.average_rate?.rate || 0,
      loanTerm: mortgage.estimate.average_rate?.loan_type?.term || 30,
      details: (mortgage.estimate.monthly_payment_details || []).map(d => ({
        type: d.type,
        amount: d.amount,
        displayName: d.display_name,
      })),
    } : null

    // Format agent data
    const agentData = advertisers?.[0] ? {
      name: advertisers[0].name || '',
      email: advertisers[0].email || null,
      phone: advertisers[0].phones?.[0]?.number || null,
      photo: advertisers[0].photo?.href || null,
      license: advertisers[0].state_license || null,
      officeName: advertisers[0].office?.name || null,
      officePhone: advertisers[0].office?.phones?.[0]?.number || null,
      officePhoto: advertisers[0].office?.photo?.href || null,
    } : null

    // Format estimates data
    const estimatesData = (estimates?.current_values || []).map(e => ({
      source: e.source?.name || 'Unknown',
      estimate: e.estimate || 0,
      estimateHigh: e.estimate_high || 0,
      estimateLow: e.estimate_low || 0,
      date: e.date || '',
    }))

    // Format flags
    const flagsData = flags ? {
      isNewConstruction: flags.is_new_construction ?? null,
      isForeclosure: flags.is_foreclosure ?? null,
      isNewListing: flags.is_new_listing ?? null,
      isComingSoon: flags.is_coming_soon ?? null,
      isContingent: flags.is_contingent ?? null,
      isPending: flags.is_pending ?? null,
      isPriceReduced: flags.is_price_reduced ?? null,
      isShortSale: flags.is_short_sale ?? null,
    } : null

    // Format flood data
    const floodData = local?.flood ? {
      floodFactorScore: local.flood.flood_factor_score ?? null,
      femaZones: local.flood.fema_zone || [],
    } : null

    // Format property history with photos
    const propertyHistoryData = (propertyHistory || []).map(h => ({
      date: h.date || '',
      price: h.price || 0,
      event_name: h.event_name || '',
      source: h.source_name || null,
      photos: (h.listing?.photos || []).slice(0, 5).map(p => p.href),
    }))

    // Format detailed tax history
    const taxHistoryDetailedData = (taxHistoryDetailed || []).map(t => ({
      year: t.year,
      tax: t.tax || 0,
      assessment: t.assessment ? {
        building: t.assessment.building ?? null,
        land: t.assessment.land ?? null,
        total: t.assessment.total ?? null,
      } : null,
    }))

    // Format detailed schools (combine nearby and assigned)
    const allSchools = [...(schoolsData?.schools || []), ...(nearbySchools?.schools || [])]
    const uniqueSchools = allSchools.filter((school, index, self) =>
      index === self.findIndex(s => s.name === school.name)
    )
    const schoolsDetailedData = uniqueSchools.map(s => ({
      name: s.name || '',
      distance_in_miles: s.distance_in_miles || 0,
      education_levels: s.education_levels || [],
      rating: s.rating ?? null,
      parentRating: s.parent_rating ?? null,
      funding_type: s.funding_type || '',
      grades: s.grades || [],
      studentCount: s.student_count ?? null,
      assigned: s.assigned ?? null,
    }))

    return successResponse({
        id: houseBuyer.id,
        isFavorite: houseBuyer.isFavorite,
        matchScore: houseBuyer.matchScore,
        notes: houseBuyer.notes,
        createdAt: houseBuyer.createdAt,
        updatedAt: houseBuyer.updatedAt,
        house: {
          id: houseBuyer.house.id,
          externalId: houseBuyer.house.externalId,
          address: houseBuyer.house.address,
          city: houseBuyer.house.city,
          state: houseBuyer.house.state,
          zipCode: houseBuyer.house.zipCode,
          latitude: houseBuyer.house.latitude,
          longitude: houseBuyer.house.longitude,
          price: houseBuyer.house.price,
          bedrooms: houseBuyer.house.bedrooms,
          bathrooms: houseBuyer.house.bathrooms,
          sqft: houseBuyer.house.sqft,
          squareFeet: houseBuyer.house.sqft, // Alias for frontend compatibility
          yearBuilt: houseBuyer.house.yearBuilt,
          propertyType: houseBuyer.house.propertyType,
          listingStatus: houseBuyer.house.listingStatus,
          images: houseBuyer.house.images,
          photos: houseBuyer.house.images, // Alias for frontend compatibility
          lastSyncedAt: houseBuyer.house.lastSyncedAt,
          lastUpdated: houseBuyer.house.lastSyncedAt, // Alias for frontend compatibility
          // Basic rich data from description
          lotSqft: (description?.lot_sqft as number) ?? null,
          lotSize: (description?.lot_sqft as number) ?? null, // Alias for frontend compatibility
          garage: (description?.garage as number) ?? null,
          stories: (description?.stories as number) ?? null,
          pool: (description?.pool as boolean) ?? null,
          fireplace: (description?.fireplace as boolean) ?? null,
          heating: (description?.heating as string) ?? null,
          cooling: (description?.cooling as string) ?? null,
          bathsFull: (description?.baths_full as number) ?? null,
          bathsHalf: (description?.baths_half as number) ?? null,
          descriptionText: (description?.text as string) ?? null,
          // Features and history
          features: features ?? [],
          details: details ?? [],
          priceHistory: priceHistory ?? [],
          taxHistory: taxHistory ?? [],
          taxHistoryDetailed: taxHistoryDetailedData,
          propertyHistory: propertyHistoryData,
          schools: schools ?? [],
          schoolsDetailed: schoolsDetailedData,
          // Location info
          neighborhood: location?.neighborhoods?.[0]?.name ?? null,
          county: location?.county?.name ?? null,
          streetViewUrl: location?.street_view_url ?? null,
          // Financial data
          mortgage: mortgageData,
          hoa: hoa ? { fee: hoa.fee, frequency: 'monthly' } : null,
          // Agent/broker
          agent: agentData,
          // Value estimates
          estimates: estimatesData.length > 0 ? estimatesData : null,
          // Status flags
          flags: flagsData,
          // Local info
          flood: floodData,
          // Other
          lastSoldPrice: (rawData?.last_sold_price as number) ?? null,
          lastSoldDate: (rawData?.last_sold_date as string) ?? null,
          pricePerSqft: (rawData?.price_per_sqft as number) ?? null,
          daysOnMarket: (rawData?.days_on_market as number) ?? null,
        },
        buyer: houseBuyer.buyer,
        addedByRealtor: houseBuyer.addedByRealtor,
        visits: visits.map((v) => ({
          id: v.id,
          status: v.status,
          scheduledAt: v.scheduledAt,
          startedAt: v.startedAt,
          completedAt: v.completedAt,
          overallImpression: v.overallImpression,
          notes: v.notes,
          recordingCount: v.recordings.length,
          recordings: v.recordings,
        })),
        suggestions: suggestions.map((s) => ({
          id: s.id,
          status: s.status,
          suggestedAt: s.suggestedAt,
          message: s.message,
          createdAt: s.createdAt,
        })),
      })
  } catch (error) {
    console.error('Get house error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to get house details')
  }
}

/**
 * PATCH /api/houses/[id]
 * Update house buyer record (favorite, notes)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id } = await params

    // Parse and validate body
    const body = await request.json()
    const validation = updateSchema.safeParse(body)

    if (!validation.success) {
      return errorResponse(
          ErrorCode.VALIDATION_ERROR,
          'Invalid request body',
          validation.error.flatten().fieldErrors
        )
    }

    // Get existing record
    const houseBuyer = await prisma.houseBuyer.findUnique({
      where: { id },
      include: { house: true },
    })

    if (!houseBuyer) {
      return errorResponse(ErrorCode.NOT_FOUND, 'House not found')
    }

    // Check access permissions - only buyer or realtor who added can edit
    const hasAccess =
      session.role === 'ADMIN' ||
      houseBuyer.buyerId === session.userId ||
      houseBuyer.addedByRealtorId === session.userId

    if (!hasAccess) {
      return errorResponse(ErrorCode.FORBIDDEN, 'Access denied')
    }

    // Update the record
    const updated = await prisma.houseBuyer.update({
      where: { id },
      data: validation.data,
      include: {
        house: true,
        buyer: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    return successResponse({
        id: updated.id,
        isFavorite: updated.isFavorite,
        notes: updated.notes,
        house: {
          id: updated.house.id,
          address: updated.house.address,
          city: updated.house.city,
          state: updated.house.state,
          price: updated.house.price,
        },
        buyer: updated.buyer,
        updatedAt: updated.updatedAt,
      })
  } catch (error) {
    console.error('Update house error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to update house')
  }
}

/**
 * DELETE /api/houses/[id]
 * Remove house from buyer's list (soft delete on HouseBuyer)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSessionUser(request)
    if (!session) {
      return Errors.unauthorized()
    }

    const { id } = await params

    // Get existing record
    const houseBuyer = await prisma.houseBuyer.findUnique({
      where: { id },
      include: {
        house: true,
        buyer: {
          select: { id: true, name: true },
        },
      },
    })

    if (!houseBuyer) {
      return errorResponse(ErrorCode.NOT_FOUND, 'House not found')
    }

    // Check access permissions - buyer, admin, or the realtor who added can delete
    const canDelete =
      session.role === 'ADMIN' ||
      houseBuyer.buyerId === session.userId ||
      houseBuyer.addedByRealtorId === session.userId

    if (!canDelete) {
      return errorResponse(
          ErrorCode.FORBIDDEN,
          'Only the buyer, admin, or the realtor who added this house can remove it'
        )
    }

    // Soft delete the house buyer record
    await prisma.houseBuyer.update({
      where: { id },
      data: { deletedAt: new Date() },
    })

    // If a realtor added this house, they should be notified
    // In a real app, this would send a notification
    if (houseBuyer.addedByRealtorId && houseBuyer.addedByRealtorId !== session.userId) {
      console.log(
        `Buyer ${session.userId} removed house ${houseBuyer.house.address} that was added by realtor ${houseBuyer.addedByRealtorId}`
      )
    }

    return successResponse({
        message: 'House removed from your list',
        removedHouse: {
          id: houseBuyer.id,
          address: houseBuyer.house.address,
        },
      })
  } catch (error) {
    console.error('Delete house error:', error)
    return errorResponse(ErrorCode.INTERNAL_ERROR, 'Failed to remove house')
  }
}
