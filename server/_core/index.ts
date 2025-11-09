import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import Stripe from 'stripe';
import { users } from '../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getDb } from '../db';

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Stripe webhook - MUST be before express.json() middleware
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
    apiVersion: '2025-10-29.clover' as any
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
          const subscription = event.data.object as any;
          const db = await getDb();
          if (db) {
            const periodEnd = subscription.current_period_end;
            await db.update(users)
              .set({
                subscriptionStatus: subscription.status as any,
                subscriptionEndsAt: periodEnd ? new Date(periodEnd * 1000) : null,
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

  // Configure body parser with larger size limit for file uploads
  // MUST be after Stripe webhook (which needs raw body)
  app.use(express.json({ limit: "100mb" }));
  app.use(express.urlencoded({ limit: "100mb", extended: true }));

  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // tRPC API with increased max body size
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
      maxBodySize: 100 * 1024 * 1024, // 100MB
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
