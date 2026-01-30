'use client';

import {
  Card,
  BlockStack,
  InlineStack,
  Text,
  Button,
  List,
  Badge,
  Box,
  Divider,
} from '@shopify/polaris';
import { Plan, BillingCycle, PlanId } from '@/types/billing';

interface PlanCardProps {
  plan: Plan;
  cycle: BillingCycle;
  currentPlan?: PlanId;
  onSelect: (planId: PlanId) => void;
  loading?: boolean;
}

export function PlanCard({
  plan,
  cycle,
  currentPlan,
  onSelect,
  loading = false,
}: PlanCardProps) {
  const isCurrent = currentPlan === plan.id;
  const isFree = plan.id === 'free';
  const price = isFree ? 0 : plan.pricing[cycle];
  const priceLabel = cycle === 'annual' ? '/year' : '/month';

  const isUpgrade = !isFree && (currentPlan === 'free' || (currentPlan === 'starter' && plan.id === 'growth'));
  const isDowngrade = (currentPlan === 'growth' && plan.id === 'starter') ||
                      (!isFree && currentPlan !== 'free' && plan.id === 'free');

  return (
    <Card>
      <BlockStack gap="400">
        <InlineStack align="space-between">
          <BlockStack gap="100">
            <InlineStack gap="200" align="start">
              <Text as="h3" variant="headingMd">
                {plan.name}
              </Text>
              {plan.highlighted && (
                <Badge tone="info">Popular</Badge>
              )}
              {isCurrent && (
                <Badge tone="success">Current Plan</Badge>
              )}
            </InlineStack>
            <Text as="p" tone="subdued">
              {plan.description}
            </Text>
          </BlockStack>
        </InlineStack>

        <Box>
          <InlineStack gap="100" align="start" blockAlign="end">
            <Text as="span" variant="heading2xl" fontWeight="bold">
              ${price}
            </Text>
            {!isFree && (
              <Text as="span" tone="subdued">
                {priceLabel}
              </Text>
            )}
          </InlineStack>
          {!isFree && cycle === 'annual' && (
            <Text as="p" tone="subdued" variant="bodySm">
              Billed annually (${Math.round(price / 12)}/month effective)
            </Text>
          )}
        </Box>

        <Divider />

        <BlockStack gap="200">
          <Text as="h4" variant="headingSm">
            Features
          </Text>
          <List>
            {plan.features.map((feature, index) => (
              <List.Item key={index}>{feature}</List.Item>
            ))}
          </List>
        </BlockStack>

        <Box paddingBlockStart="200">
          {isCurrent ? (
            <Button disabled fullWidth>
              Current Plan
            </Button>
          ) : isFree ? (
            <Button
              onClick={() => onSelect(plan.id)}
              loading={loading}
              fullWidth
              tone="critical"
            >
              Downgrade to Free
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={() => onSelect(plan.id)}
              loading={loading}
              fullWidth
            >
              {isUpgrade ? 'Upgrade' : isDowngrade ? 'Change Plan' : 'Select Plan'}
            </Button>
          )}
        </Box>
      </BlockStack>
    </Card>
  );
}
