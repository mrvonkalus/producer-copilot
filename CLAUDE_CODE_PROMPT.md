# Claude Code Prompt - Producer Copilot Stripe Integration

**Copy and paste this entire prompt into Claude Code:**

---

I need you to add Stripe payment integration to this Producer Copilot app. The core functionality is 100% complete and working - you just need to add the payment system.

## What's Already Working (DO NOT CHANGE)

- ✅ Audio analysis with AI (uses Manus LLM API - cost: $0.85 per analysis)
- ✅ Reference track comparison
- ✅ Chat interface with conversation history
- ✅ Usage tracking in database (tracks how many analyses each user has done)
- ✅ Flexible pricing configuration in `shared/pricing-config.ts`
- ✅ Dark studio-friendly UI

## What You Need to Add (4-6 Hours)

### Phase 1: Stripe Integration

**Read this file first:** `CURSOR_CLAUDE_GUIDE.md`

Follow **Phase 1: Stripe Payment Integration** exactly. It has:
- Step-by-step instructions
- Complete code snippets (copy-paste ready)
- Exact file paths and line numbers
- All imports you need

**Key files you'll edit:**
1. `server/routers.ts` - Add billing router with `createCheckoutSession` and `createPortalSession`
2. `server/_core/index.ts` - Add Stripe webhook handler
3. `.env` - Add Stripe API keys (I'll provide these)

### Phase 2: Upgrade Modal UI

**Read:** `CURSOR_CLAUDE_GUIDE.md` - Phase 2

**Create:** `client/src/components/UpgradeModal.tsx` (complete code is in the guide)

**Edit:** `client/src/pages/Home.tsx` - Add upgrade modal trigger when user hits limit

### Phase 3: Testing

**Follow the testing checklist in:** `CURSOR_CLAUDE_GUIDE.md` - Phase 3

Test:
- Free tier: 1 analysis → hit limit → see upgrade modal
- Stripe checkout flow with test card
- Webhook updates user subscription
- Pro tier: 10 analyses/month

## Critical Rules

1. **DO NOT change the UI design** - Keep the dark theme and simple layout
2. **DO NOT modify the audio analysis logic** - It works perfectly
3. **DO NOT touch the database schema** - It's already set up correctly
4. **DO NOT add features not mentioned** - Just Stripe integration

## Pricing Configuration

**Already configured in `shared/pricing-config.ts`:**
- Free: 1 analysis (lifetime)
- Pro: $19/month, 10 analyses/month
- Pro Plus: $39/month, 30 analyses/month (don't implement this yet)

## Environment Variables I'll Provide

```bash
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_PRO_PRICE_ID=price_...
STRIPE_WEBHOOK_SECRET=whsec_...
APP_URL=http://localhost:3000
```

## Success Criteria

When you're done, I should be able to:
1. Upload 1 audio file as a free user → Analysis works
2. Try to upload 2nd file → See upgrade modal
3. Click "Upgrade to Pro" → Redirect to Stripe checkout
4. Complete payment with test card `4242 4242 4242 4242`
5. Return to app → Upload 2nd file successfully (now Pro user)

## Questions to Ask Me

- "Do you have your Stripe account set up? I need the API keys."
- "Should I use test mode or live mode for Stripe?"
- "Do you want me to implement Pro Plus tier now or later?"

## Start Here

1. Read `CURSOR_CLAUDE_GUIDE.md` from start to finish
2. Install Stripe SDK: `pnpm add stripe @stripe/stripe-js`
3. Follow Phase 1 step-by-step
4. Test each phase before moving to the next

**Let me know when you're ready to start and I'll provide the Stripe API keys.**

---

**That's the prompt!** Claude Code should be able to follow the guide and implement Stripe integration without breaking anything.
