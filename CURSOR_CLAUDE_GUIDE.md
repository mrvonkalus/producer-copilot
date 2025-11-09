# Producer Copilot - Cursor/Claude Code Handoff Guide

**For**: Cursor AI or Claude Code (local AI coding assistants)  
**Goal**: Complete Producer Copilot and make it production-ready  
**Time**: 4-6 hours of focused work  
**Current State**: Core features 100% complete, needs Stripe + polish

---

## 🎯 What You're Building

**Producer Copilot** is an AI-powered audio analysis tool for music producers. Users upload their tracks, optionally add a reference track, and get expert mixing feedback from AI.

**Core Value**: Most AI tools can't actually hear music. This one analyzes real audio files and provides specific, actionable feedback (EQ frequencies, compression settings, mixing techniques).

---

## ✅ What's Already Done (You Don't Need to Build This)

### Fully Functional Features
- ✅ **Audio upload** - Users can upload MP3/WAV/M4A files (up to 50MB)
- ✅ **AI analysis** - Manus LLM API analyzes audio and generates detailed feedback
- ✅ **Reference track comparison** - Upload 2 tracks, get comparative analysis
- ✅ **Chat interface** - Full conversation history with markdown rendering
- ✅ **Authentication** - Manus OAuth (users can sign in)
- ✅ **Database** - MySQL with Drizzle ORM (users, conversations, messages, audioFiles, usageTracking)
- ✅ **Usage tracking** - Tracks how many analyses each user has done
- ✅ **Flexible pricing config** - Change tiers/limits in one file (`shared/pricing-config.ts`)
- ✅ **Dark UI** - Studio-friendly theme optimized for producers

### Tech Stack (Already Set Up)
- Frontend: React 19 + Tailwind 4 + tRPC + shadcn/ui
- Backend: Express 4 + tRPC 11 + Node.js
- Database: MySQL/TiDB (via Drizzle ORM)
- Storage: S3 (via Manus)
- Auth: Manus OAuth
- LLM: Manus LLM API (~$0.85 per analysis)

---

## 🚧 What You Need to Build (4-6 Hours)

### Phase 1: Stripe Payment Integration (2 hours)

**Goal**: Let users upgrade from Free (1 analysis) to Pro ($19/month, 10 analyses)

**Steps**:

1. **Install Stripe SDK**
   ```bash
   pnpm add stripe @stripe/stripe-js
   ```

2. **Create Stripe Account & Products**
   - Go to https://stripe.com → Create account
   - Products → Create product:
     - Name: "Producer Copilot Pro"
     - Price: $19/month recurring
     - Copy the Price ID (starts with `price_`)
   - Get API keys from Developers → API keys:
     - Secret key (starts with `sk_test_`)
     - Publishable key (starts with `pk_test_`)

3. **Add Environment Variables**
   
   Create or update `.env` file:
   ```bash
   STRIPE_SECRET_KEY=sk_test_...
   STRIPE_PUBLISHABLE_KEY=pk_test_...
   STRIPE_PRO_PRICE_ID=price_...
   STRIPE_WEBHOOK_SECRET=whsec_...  # Get this after step 5
   APP_URL=http://localhost:3000
   ```

4. **Add Stripe Backend Procedures**

   **File**: `server/routers.ts`

   Add at the top with other imports:
   ```typescript
   import Stripe from 'stripe';
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
     apiVersion: '2023-10-16' 
   });
   ```

   Add to `appRouter` (after the `chat` router):
   ```typescript
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
           throw new TRPCError({ 
             code: 'BAD_REQUEST', 
             message: 'No subscription found' 
           });
         }

         const session = await stripe.billingPortal.sessions.create({
           customer: user.stripeCustomerId,
           return_url: `${process.env.APP_URL}/`,
         });

         return { url: session.url };
       }),
   }),

   usage: router({
     getMyUsage: protectedProcedure.query(async ({ ctx }) => {
       const user = await getUserByOpenId(ctx.user.openId);
       if (!user) throw new TRPCError({ code: 'UNAUTHORIZED' });

       const tier = user.subscriptionTier || 'free';
       const isLifetime = tier === 'free';
       const audioAnalysis = await getUserUsageCount(
         user.id, 
         'audioAnalysis', 
         isLifetime
       );

       return {
         tier,
         audioAnalysis,
         limits: PRICING_TIERS[tier].limits,
       };
     }),
   }),
   ```

   Don't forget to import `PRICING_TIERS`:
   ```typescript
   import { PRICING_TIERS } from '../shared/pricing-config';
   ```

5. **Add Stripe Webhook Handler**

   **File**: `server/_core/index.ts`

   Add these imports at the top:
   ```typescript
   import Stripe from 'stripe';
   import { users } from '../../drizzle/schema';
   import { eq } from 'drizzle-orm';
   import { getDb } from '../db';
   ```

   Add this code **BEFORE** the tRPC middleware (look for `app.use('/api/trpc'`):
   ```typescript
   const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, { 
     apiVersion: '2023-10-16' 
   });

   app.post(
     '/api/webhooks/stripe', 
     express.raw({ type: 'application/json' }), 
     async (req, res) => {
       const sig = req.headers['stripe-signature']!;
       let event: Stripe.Event;

       try {
         event = stripe.webhooks.constructEvent(
           req.body, 
           sig, 
           process.env.STRIPE_WEBHOOK_SECRET!
         );
       } catch (err: any) {
         console.error('⚠️  Webhook signature verification failed:', err.message);
         return res.status(400).send(`Webhook Error: ${err.message}`);
       }

       console.log('✅ Webhook received:', event.type);

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
               
               console.log(`✅ User ${userId} upgraded to ${tier}`);
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
             
             console.log(`✅ Subscription ${subscription.id} updated to ${subscription.status}`);
           }
           break;
         }
       }

       res.json({ received: true });
     }
   );
   ```

6. **Configure Stripe Webhook**
   
   For local testing:
   ```bash
   # Install Stripe CLI
   brew install stripe/stripe-cli/stripe  # macOS
   # or download from https://stripe.com/docs/stripe-cli
   
   # Login
   stripe login
   
   # Forward webhooks to local server
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   
   # Copy the webhook secret (starts with whsec_) to .env
   ```

   For production:
   - Go to Stripe Dashboard → Developers → Webhooks
   - Add endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Select events: 
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
   - Copy webhook secret to production environment

---

### Phase 2: Upgrade Modal UI (1 hour)

**Goal**: Show users when they've hit their limit and prompt them to upgrade

**Create new file**: `client/src/components/UpgradeModal.tsx`

```typescript
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
  const limit = currentPlan.limits.audioAnalyses;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">You've Reached Your Limit</DialogTitle>
          <DialogDescription className="text-base">
            You've used {usageCount} of {limit === Infinity ? '∞' : limit} audio analyses this month.
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
                    <span><strong>{PRICING_TIERS.pro.limits.audioAnalyses}</strong> audio analyses/month</span>
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
                    <span><strong>{PRICING_TIERS.pro_plus.limits.audioAnalyses}</strong> audio analyses/month</span>
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
                  <span><strong>{PRICING_TIERS.pro_plus.limits.audioAnalyses}</strong> audio analyses/month</span>
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
```

**Update**: `client/src/pages/Home.tsx`

Add imports:
```typescript
import { UpgradeModal } from "@/components/UpgradeModal";
```

Add state (near the top of the component):
```typescript
const [showUpgradeModal, setShowUpgradeModal] = useState(false);
```

Add usage query (after `const { user } = useAuth();`):
```typescript
const { data: usageData } = trpc.usage.getMyUsage.useQuery();
```

Update `analyzeAudioMutation` error handling:
```typescript
const analyzeAudioMutation = trpc.chat.analyzeAudio.useMutation({
  onSuccess: (data) => {
    // ... existing onSuccess code
  },
  onError: (error) => {
    if (error.data?.code === 'FORBIDDEN') {
      // User hit their limit
      setShowUpgradeModal(true);
    } else {
      toast.error('Failed to analyze audio');
      console.error(error);
    }
  },
});
```

Add modal before the closing `</div>` tag:
```typescript
<UpgradeModal 
  open={showUpgradeModal}
  onClose={() => setShowUpgradeModal(false)}
  currentTier={user?.subscriptionTier || 'free'}
  usageCount={usageData?.audioAnalysis || 0}
/>
```

---

### Phase 3: Testing (1 hour)

**Test Checklist**:

1. **Free Tier Flow**:
   - [ ] Create new account (or reset usage in database)
   - [ ] Upload 1 audio file → Should work
   - [ ] Try to upload 2nd audio file → Should show upgrade modal
   - [ ] Click "Upgrade to Pro" → Should redirect to Stripe checkout
   - [ ] Use test card: `4242 4242 4242 4242`, any future date, any CVC
   - [ ] Complete payment → Should redirect back to app
   - [ ] Check database: `subscriptionTier` should be 'pro'
   - [ ] Upload 2nd audio file → Should work now

2. **Pro Tier Flow**:
   - [ ] With Pro account, upload 10 audio files → All should work
   - [ ] Try to upload 11th file → Should show upgrade modal for Pro Plus
   - [ ] Verify monthly reset: Change `month` in `usageTracking` table to previous month
   - [ ] Upload file → Should work (new month)

3. **Reference Track Test**:
   - [ ] Upload user track + reference track
   - [ ] Verify AI provides comparative analysis
   - [ ] Check that usage is tracked correctly (1 analysis, not 2)

4. **Webhook Test**:
   - [ ] Complete payment in Stripe checkout
   - [ ] Check server logs for "✅ Webhook received: checkout.session.completed"
   - [ ] Check database: User should have `stripeCustomerId` and `stripeSubscriptionId`
   - [ ] Cancel subscription in Stripe Dashboard
   - [ ] Check server logs for "✅ Subscription updated to canceled"
   - [ ] Check database: `subscriptionStatus` should be 'canceled'

5. **Edge Cases**:
   - [ ] Upload invalid file (e.g., .txt) → Should show error
   - [ ] Upload file > 50MB → Should show error
   - [ ] Upload file with no audio → Should still analyze (AI will say "no audio detected")
   - [ ] Test with different audio formats (MP3, WAV, M4A)

---

### Phase 4: Polish & Launch Prep (1-2 hours, optional)

**Nice-to-have improvements**:

1. **Usage Display**
   - Show "X of Y analyses used this month" in the UI
   - Add progress bar showing usage

2. **Success Messages**
   - Show toast when upgrade succeeds: "Welcome to Pro! 🎉"
   - Show toast when analysis completes: "Analysis complete!"

3. **Error Handling**
   - Better error messages for file upload failures
   - Retry logic for failed API calls

4. **Loading States**
   - Skeleton loaders for chat messages
   - Better loading indicator during audio analysis

5. **Landing Page** (optional for soft launch)
   - Create `client/src/pages/Landing.tsx`
   - Hero section with value proposition
   - Feature showcase
   - Pricing table
   - CTA: "Start Free Analysis"

---

## 📁 Project Structure Reference

```
producer-copilot/
├── client/
│   ├── src/
│   │   ├── pages/
│   │   │   └── Home.tsx          # Main chat interface (EDIT THIS)
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components (don't touch)
│   │   │   └── UpgradeModal.tsx  # CREATE THIS
│   │   └── lib/
│   │       └── trpc.ts           # tRPC client (don't touch)
├── server/
│   ├── _core/
│   │   └── index.ts              # Express server (ADD WEBHOOK HERE)
│   ├── routers.ts                # tRPC procedures (ADD BILLING ROUTER HERE)
│   └── db.ts                     # Database helpers (don't touch)
├── shared/
│   └── pricing-config.ts         # Pricing tiers (CHANGE PRICES HERE)
└── drizzle/
    └── schema.ts                 # Database schema (don't touch)
```

---

## 💰 Pricing Configuration

**To change pricing**, edit `shared/pricing-config.ts`:

```typescript
export const PRICING_TIERS = {
  free: {
    name: 'Free',
    price: 0,
    limits: {
      audioAnalyses: 1,           // ← Change this
      isLifetime: true,
    },
  },
  pro: {
    name: 'Pro',
    price: 19,                    // ← Change this
    limits: {
      audioAnalyses: 10,          // ← Change this
      isLifetime: false,
    },
  },
  pro_plus: {
    name: 'Pro Plus',
    price: 39,                    // ← Change this
    limits: {
      audioAnalyses: 30,          // ← Change this
      isLifetime: false,
    },
  },
};
```

All UI and backend logic will automatically update.

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module 'stripe'"
**Solution**: Run `pnpm add stripe @stripe/stripe-js`

### Issue: Webhook not firing locally
**Solution**: 
1. Make sure Stripe CLI is running: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
2. Copy the webhook secret from CLI output to `.env`
3. Restart your dev server

### Issue: TypeScript errors in routers.ts
**Solution**: Make sure you imported:
```typescript
import { PRICING_TIERS } from '../shared/pricing-config';
import { getUserUsageCount } from './db';
```

### Issue: Upgrade modal not showing
**Solution**: 
1. Check that `analyzeAudio` mutation throws `FORBIDDEN` error when limit reached
2. Check that `hasReachedLimit()` function is being called in `server/routers.ts`
3. Check browser console for errors

### Issue: Payment succeeds but user not upgraded
**Solution**:
1. Check server logs for webhook events
2. Verify webhook secret is correct in `.env`
3. Check Stripe Dashboard → Webhooks → Events for errors
4. Manually check database: `SELECT * FROM users WHERE id = X;`

---

## 🎯 Success Criteria

**Before you're done, verify**:

- [ ] Stripe checkout flow works end-to-end
- [ ] Free tier limited to 1 analysis (lifetime)
- [ ] Pro tier limited to 10 analyses/month
- [ ] Upgrade modal appears when limit reached
- [ ] Webhook updates user subscription status in database
- [ ] Audio analysis works with and without reference track
- [ ] No TypeScript errors
- [ ] No console errors in browser
- [ ] All test cases pass (see Phase 3)

---

## 🚀 Launch Checklist

**Soft Launch (This Week)**:
- [ ] Everything above working
- [ ] Test with 5-10 real users
- [ ] Collect feedback
- [ ] Post on Reddit (r/edmproduction, r/WeAreTheMusicMakers)

**Full Launch (2 Weeks)**:
- [ ] Landing page deployed
- [ ] Email verification added
- [ ] 10+ testimonials collected
- [ ] Product Hunt assets ready
- [ ] Demo video recorded

---

## 📞 Need Help?

**Check these files**:
- `todo.md` - Task tracking
- `HANDOFF_TO_KIMI_CURSOR.md` - Detailed technical docs
- `PRODUCTION_ARCHITECTURE.md` - System architecture
- `V2_PLAYBOOK.md` - Future features roadmap

**Debugging**:
- Server logs: Check terminal running `pnpm dev`
- Browser console: Check for frontend errors
- Database: Use Manus Management UI → Database panel
- Stripe: Check Dashboard → Events for webhook logs

---

## 🎉 You've Got This!

The hard part is done. The core app works perfectly. You're just adding:
1. Stripe integration (copy-paste the code above)
2. Upgrade modal (copy-paste the component)
3. Testing (follow the checklist)

**Follow this guide step-by-step, test thoroughly, and you'll have a production-ready app in 4-6 hours.** 🚀

---

**Built by Manus AI | Optimized for Cursor/Claude Code**
