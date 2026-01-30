'use client';

import { useState } from 'react';
import {
  Modal,
  BlockStack,
  Text,
  InlineStack,
  Button,
  Banner,
} from '@shopify/polaris';
import { BillingCycleToggle } from './BillingCycleToggle';
import { BillingCycle, PlanId } from '@/types/billing';
import { PLANS, getPlanPrice, getAnnualSavingsPercent } from '@/lib/billing/constants';

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentPlan: PlanId;
  usedGenerations: number;
  maxGenerations: number;
  shopDomain: string;
}

export function UpgradeModal({
  open,
  onClose,
  currentPlan,
  usedGenerations,
  maxGenerations,
  shopDomain,
}: UpgradeModalProps) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [selectedPlan, setSelectedPlan] = useState<PlanId>(
    currentPlan === 'free' ? 'starter' : 'growth'
  );
  const [loading, setLoading] = useState(false);

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/billing/subscribe?shop=${encodeURIComponent(shopDomain)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan: selectedPlan,
          billingCycle: cycle,
        }),
      });

      const data = await response.json();

      if (data.confirmationUrl) {
        // Redirect to Shopify for payment approval
        window.top?.location.assign(data.confirmationUrl);
      } else {
        console.error('No confirmation URL returned');
      }
    } catch (error) {
      console.error('Upgrade error:', error);
    } finally {
      setLoading(false);
    }
  };

  const plan = PLANS[selectedPlan];
  const price = getPlanPrice(selectedPlan, cycle);
  const savings = getAnnualSavingsPercent(selectedPlan);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Upgrade Your Plan"
      primaryAction={{
        content: `Upgrade to ${plan.name}`,
        onAction: handleUpgrade,
        loading,
      }}
      secondaryActions={[
        {
          content: 'Cancel',
          onAction: onClose,
        },
      ]}
    >
      <Modal.Section>
        <BlockStack gap="400">
          <Banner tone="warning">
            <Text as="p">
              You&apos;ve used {usedGenerations} of {maxGenerations} generations this month.
              Upgrade to continue generating stores.
            </Text>
          </Banner>

          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">
              Choose billing cycle
            </Text>
            <BillingCycleToggle
              cycle={cycle}
              onChange={setCycle}
              savingsPercent={savings}
            />
          </BlockStack>

          <BlockStack gap="300">
            <Text as="h3" variant="headingMd">
              Select plan
            </Text>
            <InlineStack gap="300">
              {(['starter', 'growth'] as PlanId[]).map((planId) => (
                <Button
                  key={planId}
                  pressed={selectedPlan === planId}
                  onClick={() => setSelectedPlan(planId)}
                >
                  {`${PLANS[planId].name} - $${getPlanPrice(planId, cycle)}/${cycle === 'annual' ? 'yr' : 'mo'}`}
                </Button>
              ))}
            </InlineStack>
          </BlockStack>

          <BlockStack gap="200">
            <Text as="h3" variant="headingMd">
              {plan.name} Plan Features
            </Text>
            {plan.features.map((feature, index) => (
              <Text as="p" key={index}>
                {feature}
              </Text>
            ))}
          </BlockStack>

          <Text as="p" tone="subdued" variant="bodySm">
            You will be redirected to Shopify to complete the payment.
            Your subscription will be managed through your Shopify account.
          </Text>
        </BlockStack>
      </Modal.Section>
    </Modal>
  );
}
