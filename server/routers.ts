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
  updateConversationTimestamp,
  createAudioFile,
  getUserAudioFiles
} from "./db";
import { storagePut } from "./storage";
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

    // Upload audio file
    uploadAudio: protectedProcedure
      .input(z.object({
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        fileData: z.string(), // base64 encoded
        conversationId: z.number().optional(),
        isReference: z.boolean().optional(), // true if this is a reference track
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate file size (max 50MB)
        if (input.fileSize > 50 * 1024 * 1024) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'File size exceeds 50MB limit' });
        }

        // Validate audio file type
        const validTypes = ['audio/mpeg', 'audio/wav', 'audio/mp3', 'audio/x-wav', 'audio/wave', 'audio/x-m4a', 'audio/mp4'];
        if (!validTypes.includes(input.mimeType)) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Invalid audio file type' });
        }

        // Decode base64 and upload to S3
        const buffer = Buffer.from(input.fileData, 'base64');
        const fileExt = input.fileName.split('.').pop() || 'mp3';
        const s3Key = `audio/${ctx.user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { url } = await storagePut(s3Key, buffer, input.mimeType);

        // Save to database
        const audioFileId = await createAudioFile({
          userId: ctx.user.id,
          conversationId: input.conversationId,
          fileName: input.fileName,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          s3Key,
          s3Url: url,
          isReference: input.isReference ? 1 : 0,
        });

        return {
          audioFileId,
          url,
          success: true,
        };
      }),

    // List user's audio files
    listAudioFiles: protectedProcedure
      .query(async ({ ctx }) => {
        return getUserAudioFiles(ctx.user.id);
      }),

    // Analyze audio with AI
    analyzeAudio: protectedProcedure
      .input(z.object({
        audioUrl: z.string(),
        conversationId: z.number(),
        userPrompt: z.string().optional(),
        referenceUrl: z.string().optional(), // Optional reference track for comparison
      }))
      .mutation(async ({ ctx, input }) => {
        // Get conversation history
        const history = await getConversationMessages(input.conversationId);
        
        const analysisPrompt = input.referenceUrl 
          ? (input.userPrompt || "Compare my track to the reference track. Analyze the differences in production quality, mix balance, frequency spectrum, dynamics, and provide specific recommendations to make my track sound more like the reference.")
          : (input.userPrompt || "Analyze this audio track and provide detailed feedback on production quality, mix balance, frequency spectrum, dynamics, and any areas for improvement.");

        // Build messages for LLM with audio file
        const llmMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string | Array<any> }> = [
          {
            role: 'system',
            content: `You are an expert music production assistant specializing in audio analysis, mixing, and mastering. When analyzing audio files, provide detailed, actionable feedback on:

- Overall production quality and mix balance
- Frequency spectrum analysis (bass, mids, highs)
- Dynamic range and loudness
- Stereo imaging and spatial characteristics
- Specific issues and how to fix them
- Genre-appropriate recommendations

Be specific with technical advice (EQ frequencies, compression ratios, etc.) and explain the reasoning behind your suggestions.`
          },
          ...history.slice(-5).map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content,
          })),
          {
            role: 'user',
            content: input.referenceUrl ? [
              { type: 'text' as const, text: analysisPrompt },
              { type: 'text' as const, text: "\n\nMy Track:" },
              { type: 'file_url' as const, file_url: { url: input.audioUrl, mime_type: 'audio/mpeg' as const } },
              { type: 'text' as const, text: "\n\nReference Track:" },
              { type: 'file_url' as const, file_url: { url: input.referenceUrl, mime_type: 'audio/mpeg' as const } }
            ] : [
              { type: 'text' as const, text: analysisPrompt },
              { type: 'file_url' as const, file_url: { url: input.audioUrl, mime_type: 'audio/mpeg' as const } }
            ]
          }
        ];

        // Get AI analysis
        const aiResponse = await invokeLLM({
          messages: llmMessages,
        });

        const responseContent = aiResponse.choices[0]?.message?.content;
        const analysisResult = typeof responseContent === 'string' 
          ? responseContent 
          : "I'm sorry, I couldn't analyze the audio file.";

        // Save user message with audio reference
        await createMessage({
          conversationId: input.conversationId,
          role: 'user',
          content: input.referenceUrl 
            ? `${analysisPrompt}\n[Audio file uploaded]\n[Reference track uploaded]`
            : `${analysisPrompt}\n[Audio file uploaded]`,
        });

        // Save AI analysis
        await createMessage({
          conversationId: input.conversationId,
          role: 'assistant',
          content: analysisResult,
        });

        // Update conversation timestamp
        await updateConversationTimestamp(input.conversationId);

        return {
          analysis: analysisResult,
          success: true,
        };
      }),
  }),
});

export type AppRouter = typeof appRouter;
