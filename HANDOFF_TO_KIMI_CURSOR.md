# Producer Copilot - Handoff Package for Kimi/Cursor

**Date**: November 9, 2025  
**Current State**: Core functionality complete, ready for Stripe integration and launch polish  
**Estimated Time to Launch**: 4-6 hours of focused work

---

## 🎯 Mission

Complete the Producer Copilot launch by implementing:
1. Stripe payment integration
2. Upgrade modal when users hit limits
3. End-to-end testing
4. Launch preparation (landing page optional for soft launch)

---

## ✅ What's Already Built

### Core Features (100% Complete)
- ✅ AI-powered audio analysis using Manus LLM API
- ✅ Reference track comparison (upload 2 tracks, get comparative analysis)
- ✅ Chat interface with conversation history
- ✅ File upload to S3 storage
- ✅ User authentication (Manus OAuth)
- ✅ Database schema with users, conversations, messages, audio files

### Pricing & Usage Tracking (100% Complete)
- ✅ Flexible config-driven pricing system (`shared/pricing-config.ts`)
- ✅ Usage tracking database table
- ✅ Usage limit enforcement (1 lifetime free, 10/month Pro, 30/month Pro Plus)
- ✅ Subscription tier fields in user table
- ✅ Helper functions: `getUserUsageCount()`, `trackUsage()`, `hasReachedLimit()`

### What's NOT Built Yet
- ❌ Stripe integration (payment processing)
- ❌ Upgrade modal (show when user hits limit)
- ❌ Subscription management UI
- ❌ Landing page (optional for soft launch)
- ❌ Email verification for free tier

---

## 📊 Current Architecture

### Tech Stack
- **Frontend**: React 19 + Tailwind 4 + tRPC
- **Backend**: Express 4 + tRPC 11 + Node.js
- **Database**: MySQL/TiDB (via Manus)
- **Storage**: S3 (via Manus)
- **Auth**: Manus OAuth
- **LLM**: Manus LLM API (GPT-4 with audio capabilities)

### Key Files

**Pricing Configuration** (Change pricing here):
- `shared/pricing-config.ts` - All tier limits, prices, and upgrade messages

**Database Schema**:
- `drizzle/schema.ts` - Users, conversations, messages, audioFiles, usageTracking tables

**Backend Logic**:
- `server/routers.ts` - tRPC procedures (chat, audio upload, analysis)
- `server/db.ts` - Database helper functions
- `server/_core/llm.ts` - LLM API integration

**Frontend**:
- `client/src/pages/Home.tsx` - Main chat interface
- `client/src/lib/trpc.ts` - tRPC client setup

---

## 🚀 Implementation Roadmap

### Phase 1: Stripe Integration (1.5 hours)

**Goal**: Enable users to upgrade from Free to Pro tier

**Steps**:

1. **Create Stripe Account & Products**
   - Go to https://stripe.com and create account
   - Create 2 products:
     - "Producer Copilot Pro" - $19/month recurring
     - "Producer Copilot Pro Plus" - $39/month recurring (optional for launch)
   - Copy Stripe API keys

2. **Add Stripe Environment Variables**
   ```bash
   # Add to Manus project secrets or .env
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_WEBHOOK_SECRET=whsec_...
   STRIPE_PRO_PRICE_ID=price_...
   STRIPE_PRO_PLUS_PRICE_ID=price_...
   ```

3. **Install Stripe SDK**
   ```bash
   cd /home/ubuntu/producer-copilot
   pnpm add stripe @stripe/stripe-js
   ```

4. **Create Stripe Backend Procedures** (add to `server/routers.ts`):
   ```typescript
   import Stripe from 'stripe';
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

   // Add to appRouter:
   billing: router({
     createCheckoutSession: protectedProcedure
       .input(z.object({
         tier: z.enum(['pro', 'pro_plus']),
       }))
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
           metadata: {
             userId: user.id.toString(),
             tier: input.tier,
           },
         });

         return { sessionUrl: session.url };
       }),

     createPortalSession: protectedProcedure
       .mutation(async ({ ctx }) => {
         const user = await getUserByOpenId(ctx.user.openId);
         if (!user || !user.stripeCustomerId) {
           throw new TRPCError({ code: 'BAD_REQUEST', message: 'No subscription found' });
         }

         const session = await stripe.billingPortal.sessions.create({
           customer: user.stripeCustomerId,
           return_url: `${process.env.APP_URL}/`,
         });

         return { url: session.url };
       }),
   }),
   ```

5. **Create Stripe Webhook Handler** (add to `server/_core/index.ts`):
   ```typescript
   import Stripe from 'stripe';
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { apiVersion: '2023-10-16' });

   // Add before tRPC routes:
   app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
     const sig = req.headers['stripe-signature']!;
     let event: Stripe.Event;

     try {
       event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
     } catch (err: any) {
       console.error('Webhook signature verification failed:', err.message);
       return res.status(400).send(`Webhook Error: ${err.message}`);
     }

     // Handle events
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

6. **Configure Stripe Webhook**:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
   - Copy webhook secret to environment variables

---

### Phase 2: Upgrade Modal (30 minutes)

**Goal**: Show users when they've hit their limit and prompt upgrade

**Create `client/src/components/UpgradeModal.tsx`**:
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
      if (sessionUrl) {
        window.location.href = sessionUrl;
      }
    } catch (error) {
      console.error('Failed to create checkout session:', error);
    }
  };

  const currentPlan = PRICING_TIERS[currentTier];
  const limit = currentPlan.limits.audioAnalyses;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>You've Reached Your Limit</DialogTitle>
          <DialogDescription>
            You've used {usageCount} of {limit === Infinity ? '∞' : limit} audio analyses.
            {currentTier === 'free' && ' Upgrade to Pro for unlimited analyses.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {currentTier === 'free' && (
            <>
              <div className="border rounded-lg p-4">
                <h3 className="font-semibold text-lg mb-2">Pro Plan</h3>
                <p className="text-3xl font-bold mb-2">${PRICING_TIERS.pro.price}/mo</p>
                <ul className="space-y-2 mb-4">
                  <li>✓ {PRICING_TIERS.pro.limits.audioAnalyses} audio analyses/month</li>
                  <li>✓ Unlimited chat</li>
                  <li>✓ Reference track comparison</li>
                  <li>✓ Unlimited history</li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade('pro')} 
                  disabled={createCheckout.isPending}
                  className="w-full"
                >
                  {createCheckout.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                  ) : (
                    'Upgrade to Pro'
                  )}
                </Button>
              </div>

              <div className="border rounded-lg p-4 opacity-75">
                <h3 className="font-semibold text-lg mb-2">Pro Plus Plan</h3>
                <p className="text-3xl font-bold mb-2">${PRICING_TIERS.pro_plus.price}/mo</p>
                <ul className="space-y-2 mb-4">
                  <li>✓ {PRICING_TIERS.pro_plus.limits.audioAnalyses} audio analyses/month</li>
                  <li>✓ Everything in Pro</li>
                  <li>✓ Priority support</li>
                </ul>
                <Button 
                  onClick={() => handleUpgrade('pro_plus')} 
                  disabled={createCheckout.isPending}
                  className="w-full"
                  variant="outline"
                >
                  Upgrade to Pro Plus
                </Button>
              </div>
            </>
          )}

          {currentTier === 'pro' && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-lg mb-2">Pro Plus Plan</h3>
              <p className="text-3xl font-bold mb-2">${PRICING_TIERS.pro_plus.price}/mo</p>
              <ul className="space-y-2 mb-4">
                <li>✓ {PRICING_TIERS.pro_plus.limits.audioAnalyses} audio analyses/month</li>
                <li>✓ Everything in Pro</li>
                <li>✓ Priority support</li>
              </ul>
              <Button 
                onClick={() => handleUpgrade('pro_plus')} 
                disabled={createCheckout.isPending}
                className="w-full"
              >
                {createCheckout.isPending ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processing...</>
                ) : (
                  'Upgrade to Pro Plus'
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

**Update `client/src/pages/Home.tsx`** to show modal when limit is reached:
```typescript
// Add state
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
const [usageCount, setUsageCount] = useState(0);

// Add usage query
const { data: usageData } = trpc.usage.getMyUsage.useQuery();

// Update analyzeAudio mutation error handling
const analyzeAudioMutation = trpc.chat.analyzeAudio.useMutation({
  onError: (error) => {
    if (error.data?.code === 'FORBIDDEN') {
      setUsageCount(usageData?.audioAnalysis || 0);
      setShowUpgradeModal(true);
    } else {
      toast.error('Failed to analyze audio');
    }
  },
  // ... rest of mutation
});

// Add modal to JSX
<UpgradeModal 
  open={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  currentTier={user?.subscriptionTier || 'free'}
  usageCount={usageCount}
/>
```

**Add usage endpoint to `server/routers.ts`**:
```typescript
usage: router({
  getMyUsage: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserByOpenId(ctx.user.openId);
    if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

    const tier = user.subscriptionTier || 'free';
    const isLifetime = tier === 'free';

    const audioAnalysis = await getUserUsageCount(user.id, 'audioAnalysis', isLifetime);
    const breakdown = await getUserUsageBreakdown(user.id);

    return {
      tier,
      audioAnalysis,
      breakdown,
      limits: PRICING_TIERS[tier].limits,
    };
  }),
}),
```

---

### Phase 3: Testing (1 hour)

**Test Flow**:

1. **Free Tier Test**:
   - Create new account
   - Upload 1 audio file → Should work
   - Upload 2nd audio file → Should show upgrade modal
   - Click "Upgrade to Pro" → Should redirect to Stripe checkout
   - Complete payment (use test card: 4242 4242 4242 4242)
   - Verify user.subscriptionTier = 'pro' in database
   - Upload 2nd audio file → Should work now

2. **Pro Tier Test**:
   - With Pro account, upload 10 audio files → All should work
   - Upload 11th file → Should show upgrade modal for Pro Plus
   - Verify monthly reset (change `month` field in usageTracking to previous month)
   - Upload file → Should work (new month)

3. **Reference Track Test**:
   - Upload user track + reference track
   - Verify AI provides comparative analysis
   - Check that usage is tracked correctly

4. **Edge Cases**:
   - Test with different audio formats (MP3, WAV, M4A)
   - Test with large files (up to 50MB)
   - Test with invalid files → Should show error
   - Test concurrent uploads → Should handle gracefully

---

### Phase 4: Launch Preparation (Optional for Soft Launch)

**Soft Launch (Monday) - Minimal Requirements**:
- ✅ Core features working
- ✅ Stripe integration
- ✅ Usage limits enforced
- ❌ Landing page (not required)
- ❌ Email verification (not required)

**Full Launch (2 weeks) - Complete Requirements**:
- ✅ Everything from soft launch
- ✅ Landing page with pricing, demo video, testimonials
- ✅ Email verification for free tier
- ✅ Onboarding flow
- ✅ Social media assets

**Landing Page** (if building now):
- Create `client/src/pages/Landing.tsx`
- Hero section with value proposition
- Feature showcase (audio analysis, reference comparison, AI feedback)
- Pricing table
- Demo video or screenshots
- CTA: "Start Free Analysis"

---

## 🐛 Known Issues & Gotchas

### 1. **Stripe Webhook Testing**
- Use Stripe CLI for local testing: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Webhook events may be delayed (30-60 seconds)
- Always check Stripe Dashboard → Events for debugging

### 2. **Usage Tracking Edge Cases**
- Free tier uses `lifetime` tracking (month = null)
- Paid tiers use `monthly` tracking (month = 'YYYY-MM')
- Monthly reset happens automatically (checks current month)
- If user downgrades, usage history is preserved

### 3. **File Upload Limits**
- Express body limit: 100MB (configured in `server/_core/index.ts`)
- S3 upload limit: No hard limit, but costs increase with size
- Recommended max: 50MB per file

### 4. **LLM API Costs**
- Current cost: ~$0.85 per analysis (70-130 Manus credits)
- This is hardcoded in `trackUsage()` as `cost: 85` (cents)
- If Manus pricing changes, update this value

---

## 📁 File Structure Reference

```
producer-copilot/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.tsx          # Main chat interface
│   │   │   └── Landing.tsx       # Landing page (to be created)
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   └── UpgradeModal.tsx  # To be created
│   │   ├── lib/
│   │   │   └── trpc.ts           # tRPC client setup
│   │   └── index.css             # Global styles (dark theme)
├── server/
│   ├── _core/
│   │   ├── index.ts              # Express server + Stripe webhook
│   │   ├── llm.ts                # Manus LLM API integration
│   │   └── trpc.ts               # tRPC setup
│   ├── routers.ts                # All tRPC procedures
│   ├── db.ts                     # Database helpers
│   └── storage.ts                # S3 storage helpers
├── shared/
│   └── pricing-config.ts         # Pricing tiers and limits (CHANGE HERE)
├── drizzle/
│   └── schema.ts                 # Database schema
└── todo.md                       # Task tracking
```

---

## 🎯 Success Criteria

**Before Soft Launch**:
- [ ] Stripe checkout flow works end-to-end
- [ ] Free tier limited to 1 analysis
- [ ] Pro tier limited to 10 analyses/month
- [ ] Upgrade modal appears when limit reached
- [ ] Webhook updates user subscription status
- [ ] Audio analysis works with and without reference track
- [ ] All TypeScript errors resolved
- [ ] No console errors in browser

**Before Full Launch**:
- [ ] Landing page deployed
- [ ] Email verification implemented
- [ ] Demo video recorded
- [ ] 10+ beta user testimonials collected
- [ ] Product Hunt assets prepared
- [ ] Social media posts scheduled

---

## 💰 Pricing Configuration

**To change pricing** (edit `shared/pricing-config.ts`):

```typescript
export const PRICING_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      audioAnalyses: 1,           // Change this number
      isLifetime: true,
    },
  },
  pro: {
    name: 'Pro',
    price: 19,                    // Change price here
    limits: {
      audioAnalyses: 10,          // Change limit here
      isLifetime: false,
    },
  },
  pro_plus: {
    name: 'Pro Plus',
    price: 39,                    // Change price here
    limits: {
      audioAnalyses: 30,          // Change limit here
      isLifetime: false,
    },
  },
};
```

**All UI and backend logic will automatically update** when you change these values.

---

## 🚨 Critical Notes for Kimi/Cursor

1. **Do NOT change the database schema** without running `pnpm db:push` afterwards
2. **Do NOT hardcode pricing** anywhere except `shared/pricing-config.ts`
3. **Do NOT skip Stripe webhook testing** - it's critical for subscription updates
4. **Do test with real Stripe test cards** - don't assume it works
5. **Do check the Manus credit usage** after each analysis to verify costs

---

## 📞 Questions?

If you encounter issues:
1. Check `todo.md` for task status
2. Check server logs: `cd /home/ubuntu/producer-copilot && pnpm dev`
3. Check browser console for frontend errors
4. Check Stripe Dashboard → Events for webhook issues
5. Check database directly via Manus Management UI → Database panel

---

## 🎉 You've Got This!

The hard part is done. You're implementing the payment layer and polish. Follow the steps above, test thoroughly, and you'll have a production-ready app in 4-6 hours.

**Good luck! 🚀**
