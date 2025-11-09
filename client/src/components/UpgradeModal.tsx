import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { PRICING_TIERS } from "@shared/pricing-config";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentTier: 'free' | 'pro' | 'pro_plus';
  usageCount: number;
}

export function UpgradeModal({ open, onClose, currentTier, usageCount }: UpgradeModalProps) {
  const createCheckout = trpc.billing.createCheckoutSession.useMutation({
    onError: (error) => {
      toast.error('Failed to create checkout session');
      console.error(error);
    },
  });

  const handleUpgrade = async (tier: 'pro' | 'pro_plus') => {
    try {
      const { sessionUrl } = await createCheckout.mutateAsync({ tier });
      if (sessionUrl) {
        window.location.href = sessionUrl;
      }
    } catch (error) {
      // Error already handled by onError
    }
  };

  const currentPlan = PRICING_TIERS[currentTier];
  const limit = currentTier === 'free'
    ? currentPlan.limits.audioAnalysesLifetime || 1
    : currentPlan.limits.audioAnalysesPerMonth;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">You've Reached Your Limit</DialogTitle>
          <DialogDescription className="text-base">
            You've used {usageCount} of {limit === Infinity ? '∞' : limit} audio analyses {currentTier === 'free' ? 'lifetime' : 'this month'}.
            {currentTier === 'free' && ' Upgrade to Pro to continue analyzing your tracks.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {currentTier === 'free' && (
            <div className="grid md:grid-cols-2 gap-4">
              {/* Pro Plan */}
              <div className="border-2 border-primary rounded-lg p-6 relative">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs px-3 py-1 rounded-bl-lg rounded-tr-lg">
                  POPULAR
                </div>
                <h3 className="font-bold text-xl mb-2">Pro</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">${PRICING_TIERS.pro.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>{PRICING_TIERS.pro.limits.audioAnalysesPerMonth}</strong> audio analyses/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Reference track comparison</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Unlimited chat & history</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Expert mixing feedback</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleUpgrade('pro')}
                  disabled={createCheckout.isPending}
                  className="w-full"
                  size="lg"
                >
                  {createCheckout.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    'Upgrade to Pro'
                  )}
                </Button>
              </div>

              {/* Pro Plus Plan */}
              <div className="border rounded-lg p-6 bg-muted/30">
                <h3 className="font-bold text-xl mb-2">Pro Plus</h3>
                <div className="mb-4">
                  <span className="text-4xl font-bold">${PRICING_TIERS.pro_plus.price}</span>
                  <span className="text-muted-foreground">/month</span>
                </div>
                <ul className="space-y-3 mb-6">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span><strong>{PRICING_TIERS.pro_plus.limits.audioAnalysesPerMonth}</strong> audio analyses/month</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Everything in Pro</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                    <span>Early access to new features</span>
                  </li>
                </ul>
                <Button
                  onClick={() => handleUpgrade('pro_plus')}
                  disabled={createCheckout.isPending}
                  className="w-full"
                  variant="outline"
                  size="lg"
                >
                  Upgrade to Pro Plus
                </Button>
              </div>
            </div>
          )}

          {currentTier === 'pro' && (
            <div className="border rounded-lg p-6">
              <h3 className="font-bold text-xl mb-2">Pro Plus</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">${PRICING_TIERS.pro_plus.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
              <ul className="space-y-3 mb-6">
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span><strong>{PRICING_TIERS.pro_plus.limits.audioAnalysesPerMonth}</strong> audio analyses/month</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Everything in Pro</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Priority support</span>
                </li>
              </ul>
              <Button
                onClick={() => handleUpgrade('pro_plus')}
                disabled={createCheckout.isPending}
                className="w-full"
                size="lg"
              >
                {createCheckout.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Upgrade to Pro Plus'
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="text-sm text-muted-foreground text-center">
          Cancel anytime. No hidden fees.
        </div>
      </DialogContent>
    </Dialog>
  );
}
