'use client';

import { ButtonGroup, Button, InlineStack, Text, Badge } from '@shopify/polaris';
import { BillingCycle } from '@/types/billing';

interface BillingCycleToggleProps {
  cycle: BillingCycle;
  onChange: (cycle: BillingCycle) => void;
  savingsPercent?: number;
}

export function BillingCycleToggle({
  cycle,
  onChange,
  savingsPercent = 17,
}: BillingCycleToggleProps) {
  return (
    <InlineStack gap="300" align="center">
      <ButtonGroup variant="segmented">
        <Button
          pressed={cycle === 'monthly'}
          onClick={() => onChange('monthly')}
        >
          Monthly
        </Button>
        <Button
          pressed={cycle === 'annual'}
          onClick={() => onChange('annual')}
        >
          Annual
        </Button>
      </ButtonGroup>
      {cycle === 'annual' && savingsPercent > 0 && (
        <Badge tone="success">{`Save ${savingsPercent}%`}</Badge>
      )}
    </InlineStack>
  );
}
