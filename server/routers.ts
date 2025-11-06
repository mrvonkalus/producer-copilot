import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { 
  createConversation, 
  getUserConversations, 
  getConversation,
  deleteConversation,
  createMessage,
  getConversationMessages,
  updateConversationTimestamp
} from "./db";
import { invokeLLM } from "./_core/llm";
import { TRPCError } from "@trpc/server";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  chat: router({
    // Create a new conversation
    createConversation: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(255),
      }))
      .mutation(async ({ ctx, input }) => {
        const conversationId = await createConversation({
          userId: ctx.user.id,
          title: input.title,
        });
        return { conversationId };
      }),

    // List all conversations for the current user
    listConversations: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserConversations(ctx.user.id);
      }),

    // Get a specific conversation with messages
    getConversation: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const conversation = await getConversation(input.conversationId, ctx.user.id);
        if (!conversation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
        }
        const msgs = await getConversationMessages(input.conversationId);
        return { conversation, messages: msgs };
      }),

    // Delete a conversation
    deleteConversation: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        await deleteConversation(input.conversationId, ctx.user.id);
        return { success: true };
      }),

    // Send a message and get AI response
    sendMessage: protectedProcedure
      .input(z.object({
        conversationId: z.number(),
        message: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify conversation ownership
        const conversation = await getConversation(input.conversationId, ctx.user.id);
        if (!conversation) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation not found' });
        }

        // Save user message
        await createMessage({
          conversationId: input.conversationId,
          role: 'user',
          content: input.message,
        });

        // Get conversation history
        const history = await getConversationMessages(input.conversationId);
        
        // Build messages for LLM (excluding the system message we'll add)
        const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
          {
            role: 'system',
            content: `You are an expert music production assistant specializing in Cubase and Ableton Live. You help producers with:

- DAW features, workflows, and shortcuts for Cubase and Ableton
- Mixing and mastering techniques (EQ, compression, reverb, delay, etc.)
- Music theory (chord progressions, scales, harmony, melody)
- Technical troubleshooting (audio routing, latency, CPU optimization)
- Plugin recommendations and settings
- Production techniques and creative ideas

Provide clear, practical advice. When discussing technical settings, be specific with values and explain why. Keep responses concise but informative.`
          },
          ...history.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          }))
        ];

        // Get AI response
        const aiResponse = await invokeLLM({
          messages: llmMessages,
        });

        const responseContent = aiResponse.choices[0]?.message?.content;
        const assistantMessage = typeof responseContent === 'string' 
          ? responseContent 
          : "I'm sorry, I couldn't generate a response.";

        // Save assistant message
        await createMessage({
          conversationId: input.conversationId,
          role: 'assistant',
          content: assistantMessage,
        });

        // Update conversation timestamp
        await updateConversationTimestamp(input.conversationId);

        return { 
          message: assistantMessage,
          success: true 
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
