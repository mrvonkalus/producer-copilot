# Producer Copilot - Quick Start Guide

**For**: Kimi AI, Cursor, Claude, or any AI coding assistant  
**Time to Launch**: 4-6 hours  
**Current State**: Core features complete, needs Stripe + testing

---

## 🚀 What You Need to Do (TL;DR)

1. **Stripe Integration** (1.5 hours) - Add payment processing
2. **Upgrade Modal** (30 min) - Show when users hit limits
3. **Testing** (1 hour) - Verify everything works
4. **Launch** (Monday soft launch or 2-week full launch)

---

## ⚡ Immediate Action Items

### Step 1: Install Stripe (5 minutes)

```bash
cd /home/ubuntu/producer-copilot
pnpm add stripe @stripe/stripe-js
```

### Step 2: Create Stripe Account (10 minutes)

1. Go to https://stripe.com → Sign up
2. Create products:
   - "Producer Copilot Pro" - $19/month recurring
   - "Producer Copilot Pro Plus" - $39/month recurring
3. Copy these values:
   - Secret Key (sk_test_...)
   - Publishable Key (pk_test_...)
   - Pro Price ID (price_...)
   - Pro Plus Price ID (price_...)

### Step 3: Add Environment Variables

Add to Manus project secrets or create `.env`:

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_PRO_PLUS_PRICE_ID=price_...
APP_URL=https://your-domain.com
```

### Step 4: Implement Stripe Backend (30 minutes)

**File**: `server/routers.ts`

Add this import at the top:
```typescript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });
```

Add this router to `appRouter`:
```typescript
billing: router({
  createCheckoutSession: protectedProcedure
    .input(z.object({ tier: z.enum(['pro', 'pro_plus']) }))
    .mutation(async ({ ctx, input }) => {
      const user = await getUserByOpenId(ctx.user.openId);
      if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

      const priceId = input.tier === 'pro' 
        ? process.env.STRIPE_PRO_PRICE_ID 
        : process.env.STRIPE_PRO_PLUS_PRICE_ID;

      const session = await stripe.checkout.sessions.create({
        customer_email: user.email || undefined,
        line_items: [{ price: priceId, quantity: 1 }],
        mode: 'subscription',
        success_url: `${process.env.APP_URL}/?upgrade=success`,
        cancel_url: `${process.env.APP_URL}/?upgrade=canceled`,
        metadata: { userId: user.id.toString(), tier: input.tier },
      });

      return { sessionUrl: session.url };
    }),
}),

usage: router({
  getMyUsage: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserByOpenId(ctx.user.openId);
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

    const tier = user.subscriptionTier || 'free';
    const isLifetime = tier === 'free';
    const audioAnalysis = await getUserUsageCount(user.id, 'audioAnalysis', isLifetime);

    return {
      tier,
      audioAnalysis,
      limits: PRICING_TIERS[tier].limits,
    };
  }),
}),
```

### Step 5: Add Stripe Webhook (30 minutes)

**File**: `server/_core/index.ts`

Add this BEFORE the tRPC routes:

```typescript
import Stripe from 'stripe';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature']!;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Webhook error:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = parseInt(session.metadata?.userId || '0');
      const tier = session.metadata?.tier as 'pro' | 'pro_plus';

      if (userId && tier) {
        const db = await getDb();
        if (db) {
          await db.update(users)
            .set({
              subscriptionTier: tier,
              stripeCustomerId: session.customer as string,
              stripeSubscriptionId: session.subscription as string,
              subscriptionStatus: 'active',
            })
            .where(eq(users.id, userId));
        }
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const db = await getDb();
      if (db) {
        await db.update(users)
          .set({
            subscriptionStatus: subscription.status as any,
            subscriptionEndsAt: new Date(subscription.current_period_end * 1000),
          })
          .where(eq(users.stripeCustomerId, subscription.customer as string));
      }
      break;
    }
  }

  res.json({ received: true });
});
```

Configure webhook in Stripe Dashboard:
- URL: `https://your-domain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
- Copy webhook secret → Add to env as `STRIPE_WEBHOOK_SECRET`

### Step 6: Create Upgrade Modal (30 minutes)

**File**: `client/src/components/UpgradeModal.tsx` (create new file)

```typescript
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { PRICING_TIERS } from "@shared/pricing-config";
import { Loader2 } from "lucide-react";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  currentTier: 'free' | 'pro' | 'pro_plus';
  usageCount: number;
}

export function UpgradeModal({ open, onClose, currentTier, usageCount }: UpgradeModalProps) {
  const createCheckout = trpc.billing.createCheckoutSession.useMutation();

  const handleUpgrade = async (tier: 'pro' | 'pro_plus') => {
    try {
      const { sessionUrl } = await createCheckout.mutateAsync({ tier });
      if (sessionUrl) window.location.href = sessionUrl;
    } catch (error) {
      console.error('Checkout failed:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>You've Reached Your Limit</DialogTitle>
          <DialogDescription>
            You've used {usageCount} of {PRICING_TIERS[currentTier].limits.audioAnalyses} analyses.
            Upgrade to continue.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {currentTier === 'free' && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg">Pro Plan</h3>
              <p className="text-3xl font-bold my-2">${PRICING_TIERS.pro.price}/mo</p>
              <ul className="space-y-1 mb-4 text-sm">
                <li>✓ {PRICING_TIERS.pro.limits.audioAnalyses} analyses/month</li>
                <li>✓ Reference track comparison</li>
                <li>✓ Unlimited chat & history</li>
              </ul>
              <Button 
                onClick={() => handleUpgrade('pro')} 
                disabled={createCheckout.isPending}
                className="w-full"
              >
                {createCheckout.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading...</>
                ) : 'Upgrade to Pro'}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### Step 7: Wire Up Modal in Home.tsx

**File**: `client/src/pages/Home.tsx`

Add imports:
```typescript
import { UpgradeModal } from "@/components/UpgradeModal";
```

Add state:
```typescript
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const { data: usageData } = trpc.usage.getMyUsage.useQuery();
```

Update analyzeAudio error handling:
```typescript
const analyzeAudioMutation = trpc.chat.analyzeAudio.useMutation({
  onError: (error) => {
    if (error.data?.code === 'FORBIDDEN') {
      setShowUpgradeModal(true);
    } else {
      toast.error('Analysis failed');
    }
  },
  // ... rest
});
```

Add modal before closing `</div>`:
```typescript
<UpgradeModal 
  open={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  currentTier={user?.subscriptionTier || 'free'}
  usageCount={usageData?.audioAnalysis || 0}
/>
```

### Step 8: Test Everything (1 hour)

1. **Test Free Tier**:
   - Upload 1 track → Works
   - Upload 2nd track → Shows upgrade modal
   - Click upgrade → Redirects to Stripe
   - Use test card: `4242 4242 4242 4242`
   - Complete payment → User upgraded to Pro

2. **Test Pro Tier**:
   - Upload 10 tracks → All work
   - Upload 11th → Shows upgrade modal

3. **Test Webhook**:
   - Check database after payment
   - Verify `subscriptionTier` = 'pro'
   - Verify `stripeCustomerId` is set

---

## 🐛 Common Issues

**Issue**: Webhook not working  
**Fix**: Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Issue**: "Cannot find module 'stripe'"  
**Fix**: Run `pnpm add stripe @stripe/stripe-js`

**Issue**: TypeScript errors  
**Fix**: Add missing imports from `server/db.ts` to `server/routers.ts`

**Issue**: Upgrade modal not showing  
**Fix**: Check that `analyzeAudio` mutation throws `FORBIDDEN` error when limit reached

---

## ✅ Launch Checklist

**Soft Launch (Monday)**:
- [ ] Stripe integration complete
- [ ] Upgrade modal working
- [ ] Free tier: 1 analysis limit enforced
- [ ] Pro tier: 10 analyses/month enforced
- [ ] End-to-end payment flow tested
- [ ] No TypeScript/console errors

**Full Launch (2 weeks)**:
- [ ] Everything above
- [ ] Landing page deployed
- [ ] Email verification added
- [ ] 10+ testimonials collected
- [ ] Product Hunt assets ready

---

## 📚 Full Documentation

See `HANDOFF_TO_KIMI_CURSOR.md` for complete implementation details, architecture diagrams, and troubleshooting guide.

---

**You've got this! 🚀 The core app is solid. Just add payments, test, and ship!**
