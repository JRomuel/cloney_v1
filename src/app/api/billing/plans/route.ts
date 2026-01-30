import { NextResponse } from 'next/server';
import { PLANS, PLAN_IDS, getAnnualSavingsPercent } from '@/lib/billing/constants';

export const dynamic = 'force-dynamic';

export async function GET() {
  const plans = PLAN_IDS.map((id) => ({
    ...PLANS[id],
    annualSavingsPercent: getAnnualSavingsPercent(id),
  }));

  return NextResponse.json({ plans });
}
