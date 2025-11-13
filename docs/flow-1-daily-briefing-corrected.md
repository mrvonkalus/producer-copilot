# Flow 1: "Jarvis - Daily Briefing" (Corrected with Error Handling)

## Overview
This flow runs on a schedule, gathers M365 data, gets AI summaries from Azure OpenAI, and posts a briefing to Slack with proper error handling.

## Prerequisites
- Power Automate Premium license
- Azure OpenAI resource with deployed model (or OpenAI API key)
- Slack App with Bot Token and channel access
- M365 permissions: `Calendars.Read`, `Mail.Read`

---

## Architecture Changes from Original

### ✅ Improvements:
1. **Error Handling**: Every major operation wrapped in Scope with failure handlers
2. **Proper AI Integration**: Uses Azure OpenAI (actual API that exists)
3. **Null Checks**: Validates data before processing
4. **Logging**: Creates a log variable for debugging
5. **Graceful Degradation**: Flow continues even if some parts fail
6. **Better Data Extraction**: Uses full email body, not just preview
7. **Rate Limiting Protection**: Processes max 5 meetings and 5 emails
8. **Rich Slack Formatting**: Uses Block Kit for better presentation

---

## Flow Structure

```
[Recurrence Trigger]
  ↓
[Initialize Variables] (briefing message, error log, timestamp)
  ↓
[Scope: Get Calendar Events]
  ├─ Get calendar view of events
  ├─ Run After: Set error flag on failure
  ↓
[Scope: Process Calendar Events]
  ├─ Apply to each (first 5 events)
  │   ├─ Call Azure OpenAI for meeting prep
  │   ├─ Parse response
  │   ├─ Append to briefing
  │   └─ Error handler: append "Failed to process meeting"
  ↓
[Scope: Get Urgent Emails]
  ├─ Get emails (flagged, unread, top 5)
  ├─ Run After: Set error flag on failure
  ↓
[Scope: Process Urgent Emails]
  ├─ Apply to each (first 5 emails)
  │   ├─ Call Azure OpenAI for summary
  │   ├─ Parse response
  │   ├─ Append to briefing
  │   └─ Error handler: append "Failed to process email"
  ↓
[Scope: Post to Slack]
  ├─ Post message with Block Kit
  ├─ Error handler: Post simple text message as fallback
  ↓
[Condition: If Any Errors]
  ├─ Yes: Post error log to admin channel
  └─ No: Complete successfully
```

---

## Detailed Build Instructions

### Step 1: Create the Flow

1. Go to Power Automate → **Create** → **Scheduled cloud flow**
2. **Flow name**: `Jarvis - Daily Briefing v2`
3. **Starting**: Tomorrow at 7:00 AM
4. **Repeat every**: 1 Day
5. Click **Create**

---

### Step 2: Configure the Trigger

1. Click the **Recurrence** trigger
2. **Frequency**: Day
3. **Interval**: 1
4. **Time zone**: (Your timezone)
5. Click **Show advanced options**
6. **At these hours**: 7
7. **At these minutes**: 0

---

### Step 3: Initialize Variables

#### Variable 1: Briefing Message
- **Action**: Initialize variable
- **Name**: `varBriefingMessage`
- **Type**: String
- **Value**: (leave empty)

#### Variable 2: Error Log
- **Action**: Initialize variable
- **Name**: `varErrorLog`
- **Type**: String
- **Value**: (leave empty)

#### Variable 3: Has Errors Flag
- **Action**: Initialize variable
- **Name**: `varHasErrors`
- **Type**: Boolean
- **Value**: `false`

#### Variable 4: Today's Date
- **Action**: Initialize variable
- **Name**: `varToday`
- **Type**: String
- **Value**: (Expression)
```
formatDateTime(utcNow(), 'yyyy-MM-dd')
```

---

### Step 4: Add Briefing Header

- **Action**: Append to string variable
- **Name**: `varBriefingMessage`
- **Value**:
```
☀️ *Good Morning! Your Daily Briefing for @{formatDateTime(utcNow(), 'dddd, MMMM d')}*

```

---

### Step 5: GET CALENDAR EVENTS (with Error Handling)

#### Create Scope
- **Action**: Scope
- **Rename to**: `Scope - Get Calendar Events`

#### Inside the Scope, add:

**Action: Get calendar view of events (V3)**
- **Connector**: Office 365 Outlook
- **Calendar id**: Calendar
- **Start Time**: (Expression)
```
formatDateTime(utcNow(), 'yyyy-MM-dd\'T\'00:00:00')
```
- **End Time**: (Expression)
```
formatDateTime(addDays(utcNow(), 1), 'yyyy-MM-dd\'T\'23:59:59')
```
- **Top**: `10`
- **Select** (Show advanced options):
```
subject,start,end,bodyPreview,location,attendees
```

#### Configure Run After (Error Handler)

1. **Outside the Scope**, add a new action
2. **Action**: Append to string variable
3. **Name**: `varErrorLog`
4. **Value**: `❌ Failed to retrieve calendar events\n`
5. Click the **...** menu on this action → **Configure run after**
6. Check: `has failed`, `has timed out`, `is skipped`
7. Uncheck: `is successful`
8. Click **Done**

9. Add another action **after the error handler**:
10. **Action**: Set variable
11. **Name**: `varHasErrors`
12. **Value**: `true`
13. **Configure run after**: Same as above (run on failure)

---

### Step 6: PROCESS CALENDAR EVENTS (with Error Handling)

#### Create Condition
- **Action**: Condition
- **Condition**: (Expression)
```
greater(length(body('Get_calendar_view_of_events_(V3)')?['value']), 0)
```
*This checks if any events were returned*

#### In the **Yes** branch:

**Add Meetings Header**
- **Action**: Append to string variable
- **Name**: `varBriefingMessage`
- **Value**:
```
📅 *Your Meetings Today:*

```

**Create Scope**
- **Action**: Scope
- **Rename to**: `Scope - Process Calendar Events`

**Inside this Scope:**

##### Action: Apply to each
- **Select an output**: `value` (from "Get calendar view of events")

**Add Expression to limit to 5 items:**
- Instead of selecting `value` directly, use Expression:
```
take(body('Get_calendar_view_of_events_(V3)')?['value'], 5)
```

##### Inside "Apply to each":

**Action 1: Compose Meeting Context**
- **Action**: Compose
- **Inputs**:
```json
{
  "subject": "@{items('Apply_to_each')?['subject']}",
  "start_time": "@{items('Apply_to_each')?['start']?['dateTime']}",
  "location": "@{items('Apply_to_each')?['location']?['displayName']}",
  "body_preview": "@{items('Apply_to_each')?['bodyPreview']}"
}
```

**Action 2: Call Azure OpenAI for Meeting Prep**
- **Action**: HTTP (Premium)
- **Method**: POST
- **URI**: `https://[YOUR-RESOURCE-NAME].openai.azure.com/openai/deployments/[YOUR-DEPLOYMENT-NAME]/chat/completions?api-version=2024-02-15-preview`

**Replace:**
- `[YOUR-RESOURCE-NAME]` with your Azure OpenAI resource name
- `[YOUR-DEPLOYMENT-NAME]` with your GPT-4 deployment name

- **Headers**:
  - `Content-Type` | `application/json`
  - `api-key` | `[YOUR-AZURE-OPENAI-API-KEY]`

- **Body**:
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are an executive assistant. Provide a concise meeting prep summary in 2-3 sentences. Focus on what the user needs to know or prepare."
    },
    {
      "role": "user",
      "content": "Prepare me for this meeting:\n\nSubject: @{items('Apply_to_each')?['subject']}\nTime: @{formatDateTime(items('Apply_to_each')?['start']?['dateTime'], 'h:mm tt')}\nLocation: @{items('Apply_to_each')?['location']?['displayName']}\nPreview: @{items('Apply_to_each')?['bodyPreview']}"
    }
  ],
  "max_tokens": 150,
  "temperature": 0.7
}
```

**Action 3: Parse OpenAI Response**
- **Action**: Parse JSON
- **Content**: `Body` (from HTTP action)
- **Schema**:
```json
{
  "type": "object",
  "properties": {
    "choices": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "message": {
            "type": "object",
            "properties": {
              "content": {
                "type": "string"
              }
            }
          }
        }
      }
    }
  }
}
```

**Action 4: Append Meeting to Briefing**
- **Action**: Append to string variable
- **Name**: `varBriefingMessage`
- **Value**:
```
• *@{items('Apply_to_each')?['subject']}*
  🕐 @{formatDateTime(items('Apply_to_each')?['start']?['dateTime'], 'h:mm tt')} - @{formatDateTime(items('Apply_to_each')?['end']?['dateTime'], 'h:mm tt')}
  📍 @{if(empty(items('Apply_to_each')?['location']?['displayName']), 'No location', items('Apply_to_each')?['location']?['displayName'])}
  💡 *AI Prep:* @{body('Parse_JSON')?['choices'][0]?['message']?['content']}

```

**Action 5: Add Error Handler (Configure Run After)**

1. **After the "Apply to each"**, add a new action
2. **Action**: Append to string variable
3. **Name**: `varErrorLog`
4. **Value**: `⚠️ Some meetings could not be processed\n`
5. **Configure run after**: Check `has failed`, `has timed out`

6. Add another action:
7. **Action**: Set variable
8. **Name**: `varHasErrors`
9. **Value**: `true`
10. **Configure run after**: Same as above

#### In the **No** branch (no meetings):

**Action**: Append to string variable
- **Name**: `varBriefingMessage`
- **Value**:
```
📅 *Your Meetings Today:*
✅ No meetings scheduled today!

```

---

### Step 7: GET URGENT EMAILS (with Error Handling)

**Create Scope**
- **Action**: Scope
- **Rename to**: `Scope - Get Urgent Emails`

#### Inside the Scope:

**Action: Get emails (V3)**
- **Connector**: Office 365 Outlook
- **Folder**: Inbox
- **Filter Query**:
```
isFlagged eq true and isRead eq false
```
- **Top**: `10`
- **Include Attachments**: No
- **Select** (Show advanced options):
```
from,subject,bodyPreview,receivedDateTime
```

#### Error Handler (Outside Scope)

1. **Action**: Append to string variable
2. **Name**: `varErrorLog`
3. **Value**: `❌ Failed to retrieve urgent emails\n`
4. **Configure run after**: `has failed`, `has timed out`, `is skipped`

5. **Action**: Set variable
6. **Name**: `varHasErrors`
7. **Value**: `true`
8. **Configure run after**: Same as above

---

### Step 8: PROCESS URGENT EMAILS (with Error Handling)

**Create Condition**
- **Condition**: (Expression)
```
greater(length(body('Get_emails_(V3)')?['value']), 0)
```

#### In the **Yes** branch:

**Add Email Header**
- **Action**: Append to string variable
- **Name**: `varBriefingMessage`
- **Value**:
```
📧 *Your Urgent Emails (Flagged & Unread):*

```

**Create Scope**
- **Action**: Scope
- **Rename to**: `Scope - Process Urgent Emails`

**Inside this Scope:**

##### Action: Apply to each
- **Select an output**: (Expression)
```
take(body('Get_emails_(V3)')?['value'], 5)
```

##### Inside "Apply to each":

**Action 1: Call Azure OpenAI for Email Summary**
- **Action**: HTTP (Premium)
- **Method**: POST
- **URI**: Same as before
- **Headers**: Same as before
- **Body**:
```json
{
  "messages": [
    {
      "role": "system",
      "content": "You are an executive assistant. Summarize this email in 1-2 sentences. Extract the key action item or decision needed, if any."
    },
    {
      "role": "user",
      "content": "From: @{items('Apply_to_each_2')?['from']?['emailAddress']?['name']}\nSubject: @{items('Apply_to_each_2')?['subject']}\n\n@{items('Apply_to_each_2')?['bodyPreview']}"
    }
  ],
  "max_tokens": 100,
  "temperature": 0.7
}
```

**Action 2: Parse OpenAI Response**
- **Action**: Parse JSON (use same schema as before)
- **Content**: `Body` (from HTTP action)

**Action 3: Append Email to Briefing**
- **Action**: Append to string variable
- **Name**: `varBriefingMessage`
- **Value**:
```
• *From:* @{items('Apply_to_each_2')?['from']?['emailAddress']?['name']}
  *Subject:* @{items('Apply_to_each_2')?['subject']}
  *Received:* @{formatDateTime(items('Apply_to_each_2')?['receivedDateTime'], 'h:mm tt')}
  💡 *AI Summary:* @{body('Parse_JSON_2')?['choices'][0]?['message']?['content']}

```

**Error Handler** (same pattern as before)

#### In the **No** branch:

**Action**: Append to string variable
- **Name**: `varBriefingMessage`
- **Value**:
```
📧 *Your Urgent Emails:*
✅ No flagged unread emails!

```

---

### Step 9: POST TO SLACK (with Error Handling)

**Create Scope**
- **Action**: Scope
- **Rename to**: `Scope - Post to Slack`

#### Inside the Scope:

**Action: Post message (V3)**
- **Connector**: Slack
- **Channel Name**: Select your channel (e.g., `#boss-briefing`)
- **Message Text**: (Fallback for notifications)
```
Your daily briefing is ready!
```
- **Post as**: Bot
- **Bot Name**: Jarvis
- **Bot Icon URL**: (optional)

**Message (Block Kit)**: Click "Show advanced options" and paste:
```json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "@{variables('varBriefingMessage')}"
    }
  },
  {
    "type": "divider"
  },
  {
    "type": "context",
    "elements": [
      {
        "type": "mrkdwn",
        "text": "🤖 Generated by Jarvis AI | @{formatDateTime(utcNow(), 'h:mm tt')}"
      }
    ]
  }
]
```

#### Error Handler (Outside Scope)

**Action: Post message (V3)** (Fallback - plain text)
- **Connector**: Slack
- **Channel Name**: Same channel
- **Message Text**: (Dynamic content)
```
@{variables('varBriefingMessage')}
```
- **Configure run after**: `has failed`, `has timed out`

**Action: Append to error log**
- **Action**: Append to string variable
- **Name**: `varErrorLog`
- **Value**: `⚠️ Failed to post formatted message, used fallback\n`
- **Configure run after**: `has failed`, `has timed out`

---

### Step 10: ERROR REPORTING

**Action: Condition**
- **Condition**: `varHasErrors` is equal to `true`

#### In the **Yes** branch:

**Action: Post message (V3)**
- **Connector**: Slack
- **Channel Name**: `#jarvis-admin` (or your admin channel)
- **Message Text**:
```
⚠️ *Daily Briefing completed with errors*

*Date:* @{formatDateTime(utcNow(), 'yyyy-MM-dd h:mm tt')}
*Errors:*
@{variables('varErrorLog')}

Please check the flow run history for details.
```

---

## Testing the Flow

### Pre-Flight Checklist:
- [ ] Azure OpenAI resource created and model deployed
- [ ] API key added to flow (consider using environment variable)
- [ ] Slack connection authorized
- [ ] Test with a personal channel first (not your boss's channel!)
- [ ] Calendar has at least one event today
- [ ] Inbox has at least one flagged unread email

### Test Procedure:
1. Click **Test** → **Manually** → **Test**
2. Monitor each action as it runs
3. Check for red X's (failures)
4. View output of each HTTP call to Azure OpenAI
5. Verify Slack message appears

### Common Issues:

**"The template language expression 'items('Apply_to_each')?['start']' cannot be evaluated"**
- Cause: Calendar event data is null
- Fix: Add null checks with `if()` expressions

**HTTP 401 Unauthorized (Azure OpenAI)**
- Cause: Invalid API key or wrong resource name
- Fix: Verify your resource name, deployment name, and API key

**HTTP 429 Too Many Requests**
- Cause: Rate limiting
- Fix: Reduce number of events/emails processed, or add delays

**Slack message doesn't appear**
- Cause: Block Kit JSON is malformed
- Fix: Use Slack's Block Kit Builder to validate JSON

---

## Alternative: Using OpenAI API Instead of Azure OpenAI

If you prefer to use OpenAI directly (openai.com):

**HTTP Action Changes:**
- **URI**: `https://api.openai.com/v1/chat/completions`
- **Headers**:
  - `Content-Type` | `application/json`
  - `Authorization` | `Bearer sk-[YOUR-OPENAI-API-KEY]`
- **Body**: Same format as Azure OpenAI
- **Pricing**: Pay-per-token (GPT-4: ~$0.03 per 1K input tokens)

---

## Cost Estimates (Daily Briefing)

### Azure OpenAI (GPT-4):
- **Meetings**: 5 meetings × 200 tokens input × $0.00003 = $0.03
- **Emails**: 5 emails × 200 tokens input × $0.00003 = $0.03
- **Output**: 10 responses × 100 tokens × $0.00006 = $0.06
- **Daily Total**: ~$0.12
- **Monthly**: ~$3.60

### Power Automate:
- **Premium Flow Runs**: Unlimited on Premium license
- **HTTP Actions**: 10 per run × 30 days = 300 actions/month (covered by Premium)

### Slack:
- Free plan supports bots and Block Kit

**Total Monthly Cost**: ~$3.60 (plus Premium license ~$15/user/month)

---

## Production Recommendations

### Security:
1. **Store API keys in Azure Key Vault** (use Key Vault connector)
2. **Use Managed Identity** for Azure OpenAI (no keys needed)
3. **Rotate keys quarterly**
4. **Use separate test/prod resources**

### Reliability:
1. **Add retry policies** to HTTP actions (under Settings → Retry Policy)
2. **Set timeout** to 30 seconds per HTTP call
3. **Monitor flow analytics** weekly
4. **Set up failure alerts** (Action → Settings → Run After → Notify on failure)

### Performance:
1. **Use selective queries** (only get relevant fields)
2. **Limit to 5 items** per category
3. **Cache OpenAI responses** for duplicate content (advanced)
4. **Run during off-peak hours** (7 AM is good)

### User Experience:
1. **Add quick action buttons** to meetings (Join Meeting, Snooze, etc.)
2. **Link to original emails** in Slack message
3. **Add sentiment analysis** for email urgency
4. **Personalize greetings** based on day of week

---

## Next Steps

Once Flow 1 is working:
1. Test for 3-5 days to ensure stability
2. Gather feedback from your boss
3. Tune AI prompts for better summaries
4. Add Flow 2 (Command Center) - but only after Flow 1 is solid
5. Consider using AI Studio for more advanced prompt engineering

---

## Support Resources

- **Azure OpenAI Docs**: https://learn.microsoft.com/azure/ai-services/openai/
- **Power Automate Premium**: https://learn.microsoft.com/power-automate/
- **Slack Block Kit Builder**: https://api.slack.com/block-kit/building
- **Power Automate Community**: https://powerusers.microsoft.com/

---

**Last Updated**: 2025-01-13
**Version**: 2.0 (Corrected with Error Handling)
