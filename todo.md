# Producer Copilot TODO

## Core Features

- [x] Dark, clean studio-friendly UI theme
- [x] AI-powered chat interface for music production assistance
- [x] Chat history persistence (save conversations to database)
- [x] Support for multiple conversation topics:
  - [x] DAW features and workflows (Cubase/Ableton)
  - [x] Mixing and mastering tips
  - [x] Music theory guidance
  - [x] Technical troubleshooting
  - [x] Plugin settings and production techniques
- [x] Markdown rendering for AI responses

## Database Schema

- [x] Chat conversations table
- [x] Messages table with user/assistant roles

## Backend (tRPC Procedures)

- [x] Create new conversation
- [x] Get conversation history
- [x] Send message and get AI response
- [x] List all conversations
- [x] Delete conversation

## Frontend

- [x] Chat interface component
- [x] Conversation sidebar/list
- [x] Message input with send button
- [x] Loading states for AI responses
- [x] Error handling and user feedback

## Future Enhancements (v2)

- [ ] MIDI generation capabilities
- [ ] Audio generation/processing
- [ ] File upload support (audio analysis)
- [ ] Voice input for hands-free operation

## New Features - Audio Upload

- [x] Audio file upload component in chat interface
- [x] S3 storage integration for uploaded audio files
- [x] Audio file validation (format, size limits)
- [x] AI audio analysis integration
- [x] Display audio analysis results in chat
- [x] File attachment support in message context

## Bug Fixes

- [x] Fix server error returning HTML instead of JSON on audio upload

## Reference Track Comparison Feature

- [x] Add reference track upload to database schema
- [x] Create backend endpoint for reference track upload
- [x] Implement comparative AI analysis (user track vs reference track)
- [x] Build UI for reference track upload (optional second file)
- [x] Display comparative analysis in chat results
- [x] Test reference track feature with real tracks

## New Bug Fixes

- [x] Fix "Cannot read properties of undefined (reading '0')" error in audio upload/analysis

## Launch Critical Tasks (4-Hour Execution)

### Phase 1: Fix Critical Bug (30 min)
- [x] Fix analyzeAudio mutation to save actual AI response
- [x] Fix double colon typo in reference track text (was already correct)
- [x] Make MIME type dynamic instead of hardcoded (will add in next step)
- [ ] Add debug logging to frontend
- [ ] Test with 3 different audio files

### Phase 2: Flexible Usage Tracking (1 hour)
- [x] Create config-driven pricing system
- [x] Add usageTracking table to database
- [x] Implement getUserUsage function
- [x] Add usage limit checks with flexible config
- [ ] Test: 1 free analysis → hit limit → see upgrade modal

### Phase 3: Stripe Integration (1.5 hours)
- [ ] Create Stripe account and products
- [ ] Add Stripe environment variables
- [ ] Implement createCheckoutSession with dynamic pricing
- [ ] Build UpgradeModal component
- [ ] Add webhook handler for subscription updates
- [ ] Test: Complete checkout → verify Pro access

### Phase 4: End-to-End Testing (1 hour)
- [ ] Test full flow as free user
- [ ] Test upgrade to Pro
- [ ] Test Pro usage limits
- [ ] Deploy to Vercel
- [ ] Buy producercopilot.ai domain
