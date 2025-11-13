# AI Service Alternatives to Fyxer.ai

## Executive Summary

Since Fyxer.ai **does not offer a public API**, you need an alternative AI service that provides:
- ✅ REST API for programmatic access
- ✅ Natural language processing capabilities
- ✅ Email/meeting summarization
- ✅ Text generation (drafting)
- ✅ Question-answering (RAG/Q&A)

This document compares viable alternatives.

---

## Comparison Table

| Feature | Azure OpenAI | OpenAI API | Anthropic Claude | Google Gemini | AWS Bedrock |
|---------|--------------|------------|------------------|---------------|-------------|
| **Has Public API** | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes | ✅ Yes |
| **Power Automate Native Connector** | ✅ Yes | ❌ No (HTTP) | ❌ No (HTTP) | ❌ No (HTTP) | ❌ No (HTTP) |
| **M365 Integration** | ✅ Excellent | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual | ⚠️ Manual |
| **Summarization Quality** | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ |
| **Cost (per 1M tokens)** | $10-30 | $10-30 | $15-75 | $1.25-$7 | Varies |
| **Context Window** | 128K | 128K | 200K | 1M+ | Varies |
| **Enterprise SLA** | ✅ Yes | ⚠️ API only | ⚠️ Growing | ✅ Yes | ✅ Yes |
| **Data Residency** | ✅ Configurable | ❌ US only | ⚠️ Limited | ✅ Configurable | ✅ Configurable |
| **Ease of Setup** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐ |

---

## Option 1: Azure OpenAI Service (⭐ RECOMMENDED)

### Why This Is Best for Your Use Case

1. **Native Power Automate Connector** - No need to manually configure HTTP actions
2. **M365 Integration** - Same Azure tenant, seamless authentication
3. **Enterprise Features** - SLA, support, compliance (SOC 2, ISO 27001, GDPR, HIPAA)
4. **Data Privacy** - Your data stays in your Azure tenant, not used for training
5. **Models Available**: GPT-4, GPT-4o, GPT-3.5-turbo

### Setup Steps

#### 1. Create Azure OpenAI Resource

```bash
# Via Azure Portal:
1. Go to portal.azure.com
2. Search "Azure OpenAI"
3. Click "Create"
4. Fill in:
   - Resource Group: (create new or use existing)
   - Region: East US (or your preferred region)
   - Name: jarvis-openai-prod
   - Pricing Tier: Standard S0
5. Click "Review + Create"
```

#### 2. Deploy a Model

```bash
1. Go to your Azure OpenAI resource
2. Navigate to "Model deployments" → "Manage Deployments"
3. Click "Create new deployment"
4. Select:
   - Model: gpt-4o (recommended) or gpt-4
   - Deployment name: gpt4o-jarvis
   - Deployment type: Standard
5. Click "Create"
```

#### 3. Get Your API Key

```bash
1. In your Azure OpenAI resource
2. Go to "Keys and Endpoint"
3. Copy:
   - Key 1 (or Key 2)
   - Endpoint (e.g., https://jarvis-openai-prod.openai.azure.com/)
```

#### 4. Use in Power Automate

**Option A: Native Connector (Easiest)**

```
Action: "Azure OpenAI - Create Chat Completion"
- Connection: Create new connection with your key
- Deployment ID: gpt4o-jarvis
- Messages: [Your prompt]
- Max Tokens: 150
- Temperature: 0.7
```

**Option B: HTTP Action (More Control)**

```
Action: HTTP (Premium)
- Method: POST
- URI: https://jarvis-openai-prod.openai.azure.com/openai/deployments/gpt4o-jarvis/chat/completions?api-version=2024-02-15-preview
- Headers:
  - Content-Type: application/json
  - api-key: [YOUR_KEY]
- Body:
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Summarize this email: ..."}
  ],
  "max_tokens": 150,
  "temperature": 0.7
}
```

### Pricing

**GPT-4o (Most cost-effective)**
- Input: $5.00 per 1M tokens
- Output: $15.00 per 1M tokens

**Estimated Monthly Cost for Jarvis:**
- Daily briefing: 5 meetings + 5 emails = ~5K tokens/day
- 30 days: 150K tokens = $0.75/month (input) + $2.25/month (output) = **$3/month**
- Add Command Center usage: **~$10-15/month total**

**GPT-4 (Higher quality, higher cost)**
- Input: $30.00 per 1M tokens
- Output: $60.00 per 1M tokens
- Estimated: **$15-20/month**

### Pros
- ✅ Easiest to integrate with Power Automate
- ✅ Enterprise-grade security and compliance
- ✅ No data leaves your tenant
- ✅ Same authentication as M365
- ✅ Predictable pricing
- ✅ 99.9% SLA available

### Cons
- ⚠️ Requires Azure subscription
- ⚠️ Approval process (can take 1-2 days)
- ⚠️ Regional availability limitations

### Best For
✅ **Recommended if you already use M365/Azure**
✅ **Best for enterprise/business use**
✅ **Required if you need compliance (HIPAA, SOC 2, etc.)**

---

## Option 2: OpenAI API (Direct)

### Setup Steps

#### 1. Create Account
1. Go to https://platform.openai.com/signup
2. Sign up with email
3. Add payment method (required for API access)

#### 2. Create API Key
1. Go to https://platform.openai.com/api-keys
2. Click "Create new secret key"
3. Name it: `Jarvis Power Automate`
4. Copy the key (starts with `sk-`)
5. **Store securely** - you can't view it again!

#### 3. Use in Power Automate

**HTTP Action:**
```
Action: HTTP (Premium)
- Method: POST
- URI: https://api.openai.com/v1/chat/completions
- Headers:
  - Content-Type: application/json
  - Authorization: Bearer sk-[YOUR_KEY]
- Body:
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Summarize this: ..."}
  ],
  "max_tokens": 150,
  "temperature": 0.7
}
```

### Pricing

**GPT-4o**
- Input: $2.50 per 1M tokens
- Output: $10.00 per 1M tokens
- **Cheaper than Azure!**
- Estimated: **$5-10/month**

**GPT-4-turbo**
- Input: $10.00 per 1M tokens
- Output: $30.00 per 1M tokens
- Estimated: **$15-20/month**

### Pros
- ✅ Cheaper than Azure OpenAI
- ✅ No approval process (instant access)
- ✅ Latest models available first
- ✅ Simple setup

### Cons
- ❌ No native Power Automate connector (must use HTTP)
- ❌ Data sent to OpenAI (not private)
- ❌ Used for training (unless you opt out)
- ❌ No enterprise SLA
- ❌ API-only support (no phone/email)

### Best For
✅ **Recommended for personal/hobby projects**
✅ **Fast prototyping**
❌ Not recommended for business use (compliance issues)

---

## Option 3: Anthropic Claude API

### Why Consider Claude

- **Best-in-class summarization** (genuinely better than GPT-4 for this)
- **200K context window** (can handle very long emails/meeting transcripts)
- **Strong at following instructions** (better than GPT for structured output)
- **Ethical AI focus** (strong privacy stance)

### Setup Steps

#### 1. Create Account
1. Go to https://console.anthropic.com/
2. Sign up with email
3. Add payment method

#### 2. Create API Key
1. Go to "API Keys" section
2. Create new key
3. Copy the key (starts with `sk-ant-`)

#### 3. Use in Power Automate

**HTTP Action:**
```
Action: HTTP (Premium)
- Method: POST
- URI: https://api.anthropic.com/v1/messages
- Headers:
  - Content-Type: application/json
  - x-api-key: [YOUR_KEY]
  - anthropic-version: 2023-06-01
- Body:
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 150,
  "messages": [
    {
      "role": "user",
      "content": "Summarize this email concisely: ..."
    }
  ]
}
```

**Response Format (Different from OpenAI!):**
```json
{
  "id": "msg_...",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Here is the summary..."
    }
  ],
  ...
}
```

**Parse Schema:**
```json
{
  "type": "object",
  "properties": {
    "content": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "text": { "type": "string" }
        }
      }
    }
  }
}
```

**Access summary:**
```
body('Parse_JSON')?['content'][0]?['text']
```

### Pricing

**Claude 3.5 Sonnet (Recommended)**
- Input: $3.00 per 1M tokens
- Output: $15.00 per 1M tokens
- Estimated: **$5-10/month**

**Claude 3 Opus (Highest quality)**
- Input: $15.00 per 1M tokens
- Output: $75.00 per 1M tokens
- Estimated: **$30-40/month**

### Pros
- ✅ Best summarization quality
- ✅ Huge context window (200K tokens)
- ✅ Strong privacy stance
- ✅ Competitive pricing
- ✅ Very good at structured output

### Cons
- ❌ No native Power Automate connector (must use HTTP)
- ❌ Different API format (requires schema adjustment)
- ❌ Smaller ecosystem than OpenAI
- ❌ No enterprise SLA (yet)

### Best For
✅ **Best if summarization quality is critical**
✅ **Good for very long documents**
⚠️ Requires more setup work (different API format)

---

## Option 4: Google Gemini API

### Setup Steps

1. Go to https://ai.google.dev/
2. Get API key
3. Use endpoint: `https://generativelanguage.googleapis.com/v1/models/gemini-pro:generateContent`

### Pricing

**Gemini 1.5 Flash (Cheapest!)**
- Input: $0.075 per 1M tokens
- Output: $0.30 per 1M tokens
- **Extremely cheap**: **$1-2/month**

**Gemini 1.5 Pro**
- Input: $1.25 per 1M tokens
- Output: $5.00 per 1M tokens
- Estimated: **$3-5/month**

### Pros
- ✅ **Cheapest option by far**
- ✅ 1M+ context window
- ✅ Fast inference
- ✅ Good quality

### Cons
- ❌ No native Power Automate connector
- ❌ Different API format (complex)
- ❌ Less mature ecosystem
- ❌ Limited enterprise features

### Best For
✅ **If cost is the top priority**
⚠️ More complex to integrate

---

## Option 5: Power Platform AI Builder (Native)

### What Is It

Power Platform's native AI service for:
- Sentiment analysis
- Key phrase extraction
- Language detection
- Entity recognition

### Why NOT Recommended for Jarvis

❌ **No generative AI** (can't write summaries or drafts)
❌ **Limited to structured analysis** (sentiment, entities, etc.)
❌ **Not suitable for meeting prep or email drafting**

### When to Use It

✅ Extracting structured data (names, dates, etc.)
✅ Classifying emails by sentiment
✅ Detecting language of incoming messages

---

## Decision Matrix

### If you have M365/Azure:
→ **Use Azure OpenAI** (best integration, enterprise features)

### If you're on a budget:
→ **Use Google Gemini** (cheapest, surprisingly good)

### If summarization quality is critical:
→ **Use Claude** (best summaries, largest context window)

### If you want the fastest setup:
→ **Use OpenAI API** (instant access, simple)

### If you need compliance (HIPAA, SOC 2, etc.):
→ **Use Azure OpenAI** (only option with certifications)

---

## Recommended Path Forward

### Phase 1: Prototype with OpenAI API (Week 1)
- ✅ Instant access
- ✅ Simple HTTP calls
- ✅ Validate the concept works
- ✅ Cost: ~$5-10 for testing

### Phase 2: Migrate to Azure OpenAI (Week 2-3)
- ✅ Submit access request (wait 1-2 days)
- ✅ Set up resource in your Azure tenant
- ✅ Migrate flows to use native connector
- ✅ Add proper error handling and monitoring

### Phase 3: Optimize (Week 4+)
- ✅ Test Claude for comparison (better summaries?)
- ✅ Test Gemini for cost optimization (90% cheaper!)
- ✅ Implement prompt caching (reduce costs)
- ✅ A/B test different models

---

## Sample Prompts for Each Use Case

### Meeting Preparation
```
System: You are an executive assistant. Provide a concise meeting prep summary in 2-3 sentences. Focus on what the user needs to know or prepare.

User: Prepare me for this meeting:
Subject: Q4 Budget Review
Time: 2:00 PM
Attendees: CFO, Finance Team
Preview: Discussion of Q4 budget allocations and proposed cuts to marketing spend...

Output: This is a critical budget meeting with the CFO to review Q4 allocations. Marketing budget cuts are proposed, so prepare data on marketing ROI and alternative cost-saving measures. Be ready to defend your budget with metrics.
```

### Email Summarization
```
System: You are an executive assistant. Summarize this email in 1-2 sentences. Extract the key action item or decision needed.

User: From: John Smith
Subject: Urgent: Client contract renewal
Body: Hi, the ABC Corp contract is up for renewal next week. They're requesting a 20% discount and threatening to go with a competitor. I need your approval to offer up to 15% discount to retain them. Please advise ASAP.

Output: Client ABC Corp demands 20% discount for contract renewal or they'll switch to a competitor. Action needed: Approve up to 15% discount to retain the account.
```

### Email Drafting
```
System: You are an executive assistant. Draft a professional email based on the user's request. Match their tone and style.

User: Draft an email to john@example.com thanking him for the meeting yesterday and confirming we'll send the proposal by Friday.

Output:
Subject: Thank You - Proposal Follow-Up

Hi John,

Thank you for taking the time to meet with me yesterday. I appreciated the opportunity to discuss [topic] and learn more about your team's needs.

As discussed, I'll send over the detailed proposal by end of day Friday. Please let me know if you have any questions in the meantime.

Looking forward to working together.

Best regards,
[Your name]
```

---

## API Code Examples

### Azure OpenAI (Power Automate HTTP)

```json
POST https://[resource].openai.azure.com/openai/deployments/[deployment]/chat/completions?api-version=2024-02-15-preview

Headers:
  Content-Type: application/json
  api-key: [YOUR_KEY]

Body:
{
  "messages": [
    {"role": "system", "content": "You are an executive assistant."},
    {"role": "user", "content": "Summarize: [email content]"}
  ],
  "max_tokens": 150,
  "temperature": 0.7
}

Response:
{
  "choices": [
    {
      "message": {
        "content": "Summary goes here..."
      }
    }
  ]
}

Access: body('Parse_JSON')?['choices'][0]?['message']?['content']
```

### OpenAI API

```json
POST https://api.openai.com/v1/chat/completions

Headers:
  Content-Type: application/json
  Authorization: Bearer sk-[YOUR_KEY]

Body:
{
  "model": "gpt-4o",
  "messages": [
    {"role": "system", "content": "You are an executive assistant."},
    {"role": "user", "content": "Summarize: [email content]"}
  ],
  "max_tokens": 150
}

Response: (Same as Azure OpenAI)
```

### Claude API

```json
POST https://api.anthropic.com/v1/messages

Headers:
  Content-Type: application/json
  x-api-key: sk-ant-[YOUR_KEY]
  anthropic-version: 2023-06-01

Body:
{
  "model": "claude-3-5-sonnet-20241022",
  "max_tokens": 150,
  "messages": [
    {
      "role": "user",
      "content": "Summarize this email concisely: [email content]"
    }
  ]
}

Response:
{
  "content": [
    {
      "type": "text",
      "text": "Summary goes here..."
    }
  ]
}

Access: body('Parse_JSON')?['content'][0]?['text']
```

---

## Next Steps

1. **Choose your AI service** based on the decision matrix
2. **Sign up and get API key**
3. **Test with Postman** or similar tool first (before building in Power Automate)
4. **Use the corrected Flow 1 document** with your chosen service
5. **Start with a simple test** (1 meeting, 1 email)
6. **Iterate and improve** prompts based on results

---

## Resources

- **Azure OpenAI Docs**: https://learn.microsoft.com/azure/ai-services/openai/
- **OpenAI API Reference**: https://platform.openai.com/docs/api-reference
- **Claude API Reference**: https://docs.anthropic.com/claude/reference
- **Gemini API Docs**: https://ai.google.dev/docs
- **Power Automate HTTP Connector**: https://learn.microsoft.com/power-automate/http-connector

---

**Last Updated**: 2025-01-13
**Version**: 1.0
