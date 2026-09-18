# SplitBill MCP

Split bills and collect payments through **PayNow (Singapore)** — from the AI you already use.

You paid for the dinner. SplitBill works out who owes what and gives you links to send.
Money never passes through us: everyone pays from their own banking app.

- Product page: <https://jittee.com/splitbill>
- Web app (no sign-up): <https://sposched.jittee.com/split/>

## Features

- Create a split bill from a receipt or a total
- Equal split, or a custom amount for one person (the rest is re-split)
- The person who paid up front is counted but never billed
- Participant management — names optional; payers can enter their own
- Shareable payment URLs (one per amount) + a read-only status link
- PayNow QR on the payment page
- Payment status tracking (self-reported with a transfer screenshot)
- Receipts attached to the total, visible to payers
- 日本語 / English / 中文

## Example

**User:**

> Split SGD 891 between 4 people.

**AI:** creates a SplitBill payment page

```
SGD 222.75 × 3 participants   (you paid up front, so you are not billed)
Share:  https://sposched.jittee.com/split/pay/?t=…
Manage: https://sposched.jittee.com/split/manage/?t=…   (keep this one to yourself)
Status: https://sposched.jittee.com/split/manage/?t=…   (read-only, safe to share)
```

## Setup

### 1. Get your key

Open <https://sposched.jittee.com/split/mcp/> and enter the PayNow number (or UEN) that
should receive the money, plus the display name your payers will see in their banking app.
You get a key that starts with `wkn_`, **shown only once**.

The key is stored with your PayNow details, so the AI never has to ask for them again.

> ⚠️ That key can create pages that collect money to your PayNow. Keep it to yourself.
> It cannot move money. If you lose it, just create another one.

### 2. Add the server

**Claude Code**

```bash
claude mcp add splitbill --env SPLITBILL_TOKEN=wkn_xxx -- npx -y splitbill-mcp
```

**Claude Desktop / any client with a JSON config**

```json
{
  "mcpServers": {
    "splitbill": {
      "command": "npx",
      "args": ["-y", "splitbill-mcp"],
      "env": { "SPLITBILL_TOKEN": "wkn_xxx" }
    }
  }
}
```

**Remote (no install)** — the same server is reachable over HTTP if your client prefers that:

```
https://jittee.com/mcp/splitbill
```

That endpoint speaks **OAuth 2.1** (dynamic client registration + PKCE), so a client that
supports remote MCP servers can just take the URL: it will send you to SplitBill, you enter
the PayNow number that collects the money, you press allow, and the key is created for you.

If your client does not do OAuth, pass the key yourself instead — either as a bearer token or
in the URL:

```
https://jittee.com/mcp/splitbill?token=wkn_xxx
```

In ChatGPT (Settings → Connectors → New plugin) paste the plain URL as the **Server URL** and
leave authentication on OAuth; or paste the `?token=` form and choose **No authentication**.

### 3. Ask

> "Split this receipt four ways. Tanaka did not drink, so $20 for him."

## Tools

| Tool | What it does |
|---|---|
| `create_split` | Create the page. Takes a total or itemised receipt, a head count, optional names, per-person overrides and rounding. Returns the manage URL, the share URLs (one per amount) and a read-only status URL. |
| `list_splits` | Splits created with this key, newest first, with how much has been collected and who is left. |
| `get_split` | One split: who has paid, their notes, the share URLs. |

By default **you are treated as the person who paid up front**: you count towards the head
count, but no payment link is created for you. Pass `i_paid: false` to turn that off.

## Environment

| Variable | Meaning |
|---|---|
| `SPLITBILL_TOKEN` | Your key from `/split/mcp` (starts with `wkn_`). Required. |
| `SPLITBILL_URL` | Endpoint override. Only needed to point at a non-production environment. |

## Good to know

- **No sign-up, no login.** The key is the only credential.
- **Money never passes through us.** Payments go directly between banking apps over PayNow.
  SplitBill only shows the amount and the recipient, and records who says they have paid.
- **Pages delete themselves** 7 days after the last payment, images included.
- NRIC cannot be used as a PayNow recipient (Singapore PDPA); mobile number or UEN only.
- Amounts are SGD.
- Anyone can create a split page, so payment pages carry a standing warning and a report
  button. Never send money from a link you got from someone you do not know.

## Privacy and terms

- Terms of use: <https://sposched.jittee.com/split/terms/>
- Contact: info@jittee.com

## License

MIT © Jittee Pte. Ltd.
