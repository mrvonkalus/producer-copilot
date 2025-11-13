# Slack Payload Test Harness

## Purpose
Before building the full Command Center (Flow 2) and Button Handler (Flow 3), you MUST understand the exact structure of Slack's payloads. This test harness will capture real data from Slack so you can build your flows correctly.

---

## Why This Matters

**The Problem:**
- Slack's documentation is often outdated
- Payload structures vary by event type
- Power Automate's JSON parsing is strict
- Getting this wrong means debugging cryptic errors

**The Solution:**
- Build simple test flows that capture and log the EXACT payloads
- Use real data to build your JSON schemas
- Test incrementally before building complex logic

---

## Test Harness 1: Slash Command Payload Inspector

This flow will show you EXACTLY what Slack sends when someone types `/jarvis`.

### Step 1: Create the Slack App (If Not Done)

1. Go to https://api.slack.com/apps
2. Click **Create New App** → **From scratch**
3. **App Name**: `Jarvis Test`
4. **Workspace**: Select your workspace
5. Click **Create App**

### Step 2: Create the Flow

1. Power Automate → **Create** → **Instant cloud flow**
2. **Flow name**: `Test - Slash Command Payload Inspector`
3. **Trigger**: "When an HTTP request is received" (Premium)
4. Click **Create**

### Step 3: Configure the Trigger

1. Click the trigger step
2. Leave **Request Body JSON Schema** empty for now
3. **Save the flow** (very important!)
4. The **HTTP POST URL** will now appear
5. **COPY THIS URL** - you'll need it next

### Step 4: Add Slack Slash Command

1. Go back to your Slack App settings (api.slack.com/apps)
2. Navigate to **Slash Commands** (in the left sidebar)
3. Click **Create New Command**
4. Fill in:
   - **Command**: `/jarvis-test`
   - **Request URL**: [Paste the URL you copied from Step 3]
   - **Short Description**: `Test payload inspector`
   - **Usage Hint**: `[anything]`
5. Click **Save**

### Step 5: Add Flow Actions

Go back to your Power Automate flow and add these actions:

#### Action 1: Initialize Payload Variable
- **Action**: Initialize variable
- **Name**: `varRawPayload`
- **Type**: String
- **Value**: (Expression)
```
string(triggerBody())
```

#### Action 2: Initialize Headers Variable
- **Action**: Initialize variable
- **Name**: `varHeaders`
- **Type**: String
- **Value**: (Expression)
```
string(triggerOutputs()?['headers'])
```

#### Action 3: Respond to Slack (Immediate)
- **Action**: Response (Premium)
- **Status Code**: `200`
- **Body**:
```json
{
  "text": "Payload captured! Check your Slack DM for details."
}
```

*Note: This must happen within 3 seconds or Slack will show an error*

#### Action 4: Post Raw Payload to Slack
- **Action**: Post message (V3) (Slack)
- **Channel Name**: Type your own username (e.g., `@yourusername`) to DM yourself
- **Message Text**:
```
*Slash Command Payload Inspector*

*Raw Body:*
```
@{variables('varRawPayload')}
```

*Headers:*
```
@{variables('varHeaders')}
```

*Parsed Fields (if accessible):*
• Token: @{triggerBody()?['token']}
• User ID: @{triggerBody()?['user_id']}
• User Name: @{triggerBody()?['user_name']}
• Command: @{triggerBody()?['command']}
• Text: @{triggerBody()?['text']}
• Channel ID: @{triggerBody()?['channel_id']}
• Response URL: @{triggerBody()?['response_url']}
```

### Step 6: Test It!

1. Save the flow
2. Go to Slack
3. Type: `/jarvis-test hello world`
4. Press Enter
5. Check your Slack DMs - you should receive a message with the full payload!

### Step 7: Create JSON Schema

1. Copy the "Raw Body" output from the Slack message
2. Go to https://www.jsonschema.net/
3. Paste the raw body
4. Click **Generate Schema**
5. Copy the schema
6. Go back to your flow → Edit the trigger → Click **Generate from sample** → Paste the schema

---

## Test Harness 2: Button Click Payload Inspector

This is MORE IMPORTANT because Slack's interactive payloads are **completely different** from slash commands.

### Step 1: Enable Interactivity in Slack App

1. Go to your Slack App settings
2. Navigate to **Interactivity & Shortcuts**
3. Toggle **Interactivity** to **On**
4. Leave **Request URL** blank for now (we'll fill it in Step 3)

### Step 2: Create the Flow

1. Power Automate → **Create** → **Instant cloud flow**
2. **Flow name**: `Test - Button Click Payload Inspector`
3. **Trigger**: "When an HTTP request is received" (Premium)
4. Click **Create**

### Step 3: Get the URL and Add to Slack

1. Click the trigger step
2. **Save the flow**
3. **COPY the HTTP POST URL**
4. Go back to Slack App settings → **Interactivity & Shortcuts**
5. **Request URL**: Paste the URL
6. Click **Save Changes**

### Step 4: Add Flow Actions

#### Action 1: Initialize Raw Body
- **Action**: Initialize variable
- **Name**: `varRawBody`
- **Type**: String
- **Value**: (Expression)
```
string(triggerBody())
```

#### Action 2: Initialize Content Type
- **Action**: Initialize variable
- **Name**: `varContentType`
- **Type**: String
- **Value**: (Expression)
```
triggerOutputs()?['headers']?['Content-Type']
```

#### Action 3: Try to Parse Payload (Method 1)
- **Action**: Initialize variable
- **Name**: `varPayloadMethod1`
- **Type**: String
- **Value**: (Expression)
```
triggerOutputs()?['queries']?['payload']
```

#### Action 4: Try to Parse Payload (Method 2)
- **Action**: Initialize variable
- **Name**: `varPayloadMethod2`
- **Type**: String
- **Value**: (Expression)
```
triggerBody()?['payload']
```

#### Action 5: Respond to Slack (Immediate)
- **Action**: Response (Premium)
- **Status Code**: `200`
- **Body**: (Leave empty or use `{}`)

*Critical: This MUST happen within 3 seconds*

#### Action 6: Post All Methods to Slack
- **Action**: Post message (V3) (Slack)
- **Channel Name**: Your username (DM yourself)
- **Message Text**:
```
*Button Click Payload Inspector*

*Content-Type:*
@{variables('varContentType')}

*Raw Body:*
```
@{variables('varRawBody')}
```

*Method 1 (queries.payload):*
```
@{variables('varPayloadMethod1')}
```

*Method 2 (body.payload):*
```
@{variables('varPayloadMethod2')}
```
```

### Step 5: Create a Test Button

We need to create a simple flow that posts a message WITH a button, so you can click it.

**Create a new flow:**

1. Power Automate → **Create** → **Instant cloud flow**
2. **Flow name**: `Test - Post Button to Slack`
3. **Trigger**: "Manually trigger a flow"
4. Click **Create**

**Add action:**

- **Action**: Post message (V3) (Slack)
- **Channel Name**: Your username (DM yourself)
- **Message Text**: `Test button (fallback)`
- **Message (Block Kit)**: (Show advanced options)
```json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "Click the button to test payload capture!"
    }
  },
  {
    "type": "actions",
    "elements": [
      {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "Test Button",
          "emoji": true
        },
        "style": "primary",
        "value": "test_value_123",
        "action_id": "test_button_click"
      }
    ]
  }
]
```

### Step 6: Test the Button

1. **Run** the "Post Button to Slack" flow manually
2. Check your Slack DMs - you should see a button
3. **Click the button**
4. A new message should appear with the full payload!

### Step 7: Analyze the Payload

Look at the output and determine:

1. **Which method worked?** (Method 1 or Method 2?)
2. **Is it JSON or URL-encoded?**
3. **What's the structure?**

**Common structures:**

**URL-encoded (most common):**
```
payload=%7B%22type%22%3A%22block_actions%22...
```
You need to decode it:
```
decodeUriComponent(triggerOutputs()?['queries']?['payload'])
```

**Then parse as JSON:**
```
json(decodeUriComponent(triggerOutputs()?['queries']?['payload']))
```

**Already JSON:**
If it's already JSON, you can parse directly:
```
json(triggerBody()?['payload'])
```

### Step 8: Create JSON Schema

Once you know which method works:

1. Copy the successfully decoded payload
2. Go to https://www.jsonschema.net/
3. Paste it
4. Generate the schema
5. Use this schema in your actual Button Handler flow (Flow 3)

---

## Test Harness 3: Response URL Tester

The `response_url` is how you send asynchronous responses to Slack (after the 3-second window). Let's test it!

### Step 1: Create the Flow

1. Power Automate → **Create** → **Instant cloud flow**
2. **Flow name**: `Test - Response URL`
3. **Trigger**: "When an HTTP request is received"
4. Click **Create**

### Step 2: Add to Slack Slash Command

1. Save the flow and copy the URL
2. Create a new slash command: `/test-response`
3. Paste the URL

### Step 3: Add Flow Actions

#### Action 1: Get Response URL
- **Action**: Initialize variable
- **Name**: `varResponseURL`
- **Type**: String
- **Value**: (Dynamic content)
```
triggerBody()?['response_url']
```

#### Action 2: Respond Immediately (Empty)
- **Action**: Response (Premium)
- **Status Code**: `200`
- **Body**: (Leave empty - this tells Slack "got it, processing...")

#### Action 3: Delay (Simulate Work)
- **Action**: Delay
- **Count**: `5`
- **Unit**: Second

#### Action 4: Post to Response URL
- **Action**: HTTP (Premium)
- **Method**: POST
- **URI**: (Dynamic content) `varResponseURL`
- **Headers**:
  - `Content-Type` | `application/json`
- **Body**:
```json
{
  "text": "This is an asynchronous response sent 5 seconds after your command!",
  "response_type": "ephemeral"
}
```

*`ephemeral` = only visible to the user who ran the command*
*`in_channel` = visible to everyone in the channel*

### Step 4: Test It

1. Save and test the flow
2. In Slack, type: `/test-response`
3. You should immediately see "got it" (the trigger acknowledgment)
4. After 5 seconds, you should see the actual response

**This proves your async pattern works!**

---

## Test Harness 4: Block Kit Message with Dynamic Data

Let's test embedding complex data in Block Kit JSON (important for the draft button).

### Step 1: Create the Flow

1. Power Automate → **Create** → **Instant cloud flow**
2. **Flow name**: `Test - Block Kit with Dynamic Data`
3. **Trigger**: "Manually trigger a flow"
4. Click **Create**

### Step 2: Add Actions

#### Action 1: Compose Sample Email Data
- **Action**: Compose
- **Inputs**:
```json
{
  "to": "test@example.com",
  "subject": "Test Subject with \"quotes\" and\nline breaks",
  "body": "This is a test body with special characters: \", ', <, >, &"
}
```

#### Action 2: Convert to String (for button value)
- **Action**: Compose
- **Rename to**: `Compose - String for Button`
- **Inputs**: (Expression)
```
string(outputs('Compose'))
```

#### Action 3: Post Message with Embedded Data
- **Action**: Post message (V3) (Slack)
- **Channel Name**: Your username
- **Message Text**: `Test message with embedded data`
- **Message (Block Kit)**:
```json
[
  {
    "type": "section",
    "text": {
      "type": "mrkdwn",
      "text": "*Email Draft Preview*\n\n*To:* @{outputs('Compose')?['to']}\n*Subject:* @{outputs('Compose')?['subject']}"
    }
  },
  {
    "type": "actions",
    "elements": [
      {
        "type": "button",
        "text": {
          "type": "plain_text",
          "text": "Send Email",
          "emoji": true
        },
        "style": "primary",
        "value": "@{outputs('Compose_-_String_for_Button')}",
        "action_id": "send_email"
      }
    ]
  }
]
```

### Step 3: Test It

1. Run the flow manually
2. Check if the Slack message appears
3. Click the button
4. Check if your Button Payload Inspector (from Test Harness 2) captures the data correctly

**Common Issues:**

❌ **Error: "Invalid blocks"**
- Cause: Unescaped quotes in dynamic content
- Fix: Use `replace()` function:
```
@{replace(outputs('Compose')?['subject'], '"', '\"')}
```

❌ **Button value is "[object Object]"**
- Cause: Didn't convert to string
- Fix: Use `string()` function as shown in Action 2

---

## What to Do With Your Test Results

### 1. Document Your Findings

Create a file called `slack-payload-reference.md` with:

```markdown
# Slack Payload Reference (Tested)

## Slash Command Payload
**Trigger**: `triggerBody()`
**Content-Type**: application/x-www-form-urlencoded (but auto-parsed by Power Automate)

**Structure:**
{
  "token": "verification_token_here",
  "team_id": "T1234567890",
  "team_domain": "yourworkspace",
  "channel_id": "C1234567890",
  "channel_name": "general",
  "user_id": "U1234567890",
  "user_name": "yourname",
  "command": "/jarvis-test",
  "text": "hello world",
  "response_url": "https://hooks.slack.com/commands/...",
  "trigger_id": "1234567890.1234567890"
}

**Access in Power Automate:**
- User's text: `triggerBody()?['text']`
- Response URL: `triggerBody()?['response_url']`
- User ID: `triggerBody()?['user_id']`

## Button Click Payload
**Trigger**: `triggerOutputs()?['queries']?['payload']` OR `triggerBody()?['payload']`
**Content-Type**: application/x-www-form-urlencoded (needs decoding!)

**Correct expression:**
json(decodeUriComponent(triggerOutputs()?['queries']?['payload']))

OR (test both!):

triggerBody()?['payload']

**Structure:**
(Paste your actual payload here)
```

### 2. Update Your Flows

- Use the EXACT schemas you captured
- Use the EXACT expressions that worked
- Don't guess or use documentation examples

### 3. Test Edge Cases

Try these in your test harnesses:

- **Empty text**: `/jarvis-test` (no arguments)
- **Special characters**: `/jarvis-test hello "world" & <test>`
- **Long text**: `/jarvis-test [paste 500 characters]`
- **Multiple buttons**: Create a message with 3 buttons, click each one

---

## Debugging Tips

### Issue: Flow doesn't trigger
**Cause**: Slack can't reach your webhook URL
**Solution**:
- Verify the URL is saved in Slack App settings
- Check if your Power Automate plan includes Premium connectors
- Test the URL with Postman/curl

### Issue: "Operation timeout" in Slack
**Cause**: Flow takes > 3 seconds to respond
**Solution**:
- Always respond within 3 seconds (empty 200 response)
- Do work AFTER responding
- Use `response_url` for actual reply

### Issue: "Parse JSON" fails
**Cause**: Schema doesn't match actual data
**Solution**:
- Use test harnesses to capture real data
- Generate schema from actual payload
- Add null checks: `?['field']`

### Issue: Slack says "Invalid blocks"
**Cause**: Malformed Block Kit JSON
**Solution**:
- Use Slack's Block Kit Builder: https://api.slack.com/block-kit/building
- Escape dynamic content properly
- Test with static JSON first, then add dynamic content

### Issue: Button value is empty or wrong
**Cause**: Data not properly stringified
**Solution**:
- Use `string(outputs('Compose'))` to convert objects
- Limit button value to < 2000 characters
- Consider storing large data elsewhere (SharePoint, Dataverse) and pass only an ID

---

## Validation Checklist

Before building Flow 2 (Command Center), ensure:

- [ ] Slash command test harness works
- [ ] You've captured the exact payload structure
- [ ] You've created a JSON schema from real data
- [ ] Response URL works (tested with async pattern)
- [ ] Button click test harness works
- [ ] You know which method to use (queries vs body)
- [ ] You know if URL decoding is needed
- [ ] Block Kit messages render correctly with dynamic data
- [ ] Special characters don't break the JSON
- [ ] Button values contain the data you expect

---

## Next Steps

Once all test harnesses are working:

1. **Document** the exact expressions that worked
2. **Create a template** with the correct schemas
3. **Build Flow 2** (Command Center) using the validated patterns
4. **Build Flow 3** (Button Handler) using the validated patterns
5. **Test incrementally** - add one command at a time

**Don't skip the test harnesses!** They will save you hours of debugging.

---

## Resources

- **Slack Block Kit Builder**: https://api.slack.com/block-kit/building
- **Slack API Docs (Slash Commands)**: https://api.slack.com/interactivity/slash-commands
- **Slack API Docs (Interactive Messages)**: https://api.slack.com/interactivity/handling
- **JSON Schema Generator**: https://www.jsonschema.net/
- **URL Decoder**: https://www.urldecoder.org/

---

**Last Updated**: 2025-01-13
**Version**: 1.0
