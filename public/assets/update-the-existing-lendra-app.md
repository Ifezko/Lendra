Update the existing Lendra app. Do not rebuild from scratch. Preserve all existing working features, routes, wallet connection, scoring pages, borrow flow, and dashboard state.

Product naming:  
\- Public product brand: Lendra  
\- Domain: https://lendra.finance  
\- Legal company: LENDRA DIGITAL INFRASTRUCTURE LTD  
\- Use “Lendra” in the app UI  
\- Use “Lendra is operated by LENDRA DIGITAL INFRASTRUCTURE LTD” only in footer/legal pages

Main changes to build:  
1\. Update scoring model to 1000 max score  
2\. Add X requirement for Level 5 and Level 6  
3\. Update bond logic to 30% of loan amount  
4\. Let users write custom loan purpose  
5\. Add USDC/USDT borrow asset selector  
6\. Add social credit score card sharing  
7\. Replace Bonfida references with SNS.id  
8\. Add cross-chain credit to Boost Your Score

\--------------------------------------------------  
1\. SCORE MODEL  
\--------------------------------------------------

Move Lendra Score to 1000 max.

Updated score allocation:  
\- Base Score: 100  
\- Wallet Age: max 60  
\- Transaction Volume: max 60  
\- Monthly Consistency: max 60  
\- Protocol Diversity: max 70  
\- Portfolio Value: max 40  
\- Repayment History: max 140  
\- X Verification: max 100  
\- Cross-Chain Credit: max 90  
\- .sol Identity via SNS.id: max 40  
\- Superteam PoW: max 30  
\- Credit Maturity Bonus: max 110  
\- Borrow Growth Bonus: max 100

Total max score:  
1000

Important:  
\- Score \= trust profile  
\- Eligibility \= whether the user can borrow now  
\- A high score should not automatically unlock borrowing  
\- Eligibility still depends on score, 90-day spend gate, max single transaction gate, active loan status, clean repayment count, X requirement for higher levels, and level rules

Low score helper copy:  
“Your base score starts at 100\. Build trust by connecting verified signals, repaying loans, and growing your borrowing history over time.”

General helper copy:  
“Wallet activity gets you started. Repayment and verified identity move you up.”

\--------------------------------------------------  
2\. REPAYMENT HISTORY  
\--------------------------------------------------

Repayment History max:  
140 points

Repayment scoring:  
\- Each clean on-time repayment: \+25 pts  
\- Each early repayment: \+5 bonus pts  
\- Early repayment bonus capped at \+20 pts  
\- Each late repayment: \-15 pts  
\- Default resets repayment score to 0  
\- Repayment score capped at 140 pts

On successful repayment:  
\- Update repayment count  
\- Recalculate repayment score  
\- Recalculate total Lendra Score  
\- Recalculate level  
\- Show toast:  
“Repayment confirmed. Your score increased by \+25 points.”  
\- If new level unlocked:  
“Level unlocked: {levelName}. You can now borrow up to ${amount}.”

\--------------------------------------------------  
3\. BORROW GROWTH BONUS  
\--------------------------------------------------

Borrow Growth Bonus max:  
100 points

Logic:  
\- User’s first successful borrow sets first\_borrow\_amount  
\- Do not award Borrow Growth Bonus on the first borrow  
\- For later loans, if loan\_amount \> first\_borrow\_amount and the loan is repaid cleanly, award \+5 points  
\- Award only after successful repayment, not immediately after borrowing  
\- Cap Borrow Growth Bonus at 100 points  
\- Do not award for defaulted, failed, cancelled, or late loans

Track:  
\- first\_borrow\_amount  
\- highest\_borrow\_amount\_repaid  
\- qualifying\_higher\_borrow\_repayments  
\- borrow\_growth\_points

UI copy:  
“Borrow Growth Bonus”  
“Grow your score by repaying higher loan amounts over time.”

\--------------------------------------------------  
4\. CREDIT MATURITY BONUS  
\--------------------------------------------------

Credit Maturity Bonus max:  
110 points

Award automatically as users climb levels:  
\- Level 3: \+20  
\- Level 4: \+25  
\- Level 5: \+30  
\- Level 6: \+35

Do not make this manually claimable.

\--------------------------------------------------  
6\. X VERIFICATION, NO DM OTP  
\--------------------------------------------------

Do not use X DM OTP.  
Do not mention OTP anywhere.  
Do not create OTP logic, OTP fields, OTP screens, OTP expiry, or X DM messages.

X max score:  
100 points

X scoring:  
\- X connected via OAuth: \+15  
\- Stable X user ID captured: \+15  
\- Account age over 2 years: \+35  
\- Activity threshold met: \+35

Full X points require:  
\- X OAuth connected  
\- stable x\_user\_id captured  
\- account age 2+ years  
\- activity threshold met

MVP activity threshold:  
\- public post/tweet count \>= 100

Use x\_user\_id as the stable identity anchor because usernames can change.

Store:  
\- x\_user\_id  
\- x\_username  
\- x\_display\_name  
\- x\_profile\_image  
\- x\_account\_created\_at  
\- x\_account\_age\_days  
\- x\_posts\_count  
\- x\_followers\_count  
\- x\_following\_count  
\- x\_connected  
\- x\_connected\_at  
\- x\_verification\_score

UI:  
Boost card title:  
“Connect your X Account”

Description:  
“Verify an active X account using OAuth, stable X account ID, account age, and public activity.”

Checklist:  
\- X connected  
\- Stable ID captured  
\- Account age checked  
\- Activity checked

Show:  
“Current X boost: X/100”

Use official X logo, not the old Twitter bird.

\--------------------------------------------------  
7\. BOND LOGIC  
\--------------------------------------------------

Replace fixed bond amounts with percentage-based bond.

Bond rule:  
\- Bond amount \= 30% of selected loan amount  
\- Bond token should match borrow asset where supported  
\- Default bond token: USDC  
\- Round bond amount to 2 decimals

Examples:  
\- $10 loan → $3 bond  
\- $25 loan → $7.50 bond  
\- $50 loan → $15 bond  
\- $100 loan → $30 bond  
\- $200 loan → $60 bond  
\- $400 loan → $120 bond

Borrow simulation must show:  
\- selected loan amount  
\- borrow asset  
\- APR  
\- interest  
\- bond required: 30% of loan amount  
\- bond amount  
\- total repayment  
\- due date  
\- loan purpose  
\- consent checkbox  
\- Sign button

Bond copy:  
“Your bond is held in escrow and returned when you repay on time.”

Tooltip:  
“Lendra uses a 30% bond to create borrower commitment without requiring full overcollateralization. If you repay on time, your bond is returned. If you default, your bond may be liquidated into the insurance fund.”

Accounting:  
\- Bonds deposited are not revenue  
\- Active locked bonds are escrowed user funds  
\- Only liquidated bonds count as insurance fund inflow

Helper:  
calculateBondAmount(loanAmount) \= roundToTwoDecimals(loanAmount \* 0.30)

\--------------------------------------------------  
8\. BORROW ASSET SELECTOR  
\--------------------------------------------------

Add borrow asset selector:  
\- USDC  
\- USDT

USDC should be active if supported.

USDT should be disabled or marked “Coming soon” unless actually supported by the lending route.

Copy if USDT disabled:  
“USDT support is coming soon. Lendra currently supports USDC borrowing.”

Do not allow unsupported asset selection.

\--------------------------------------------------  
9\. LOAN PURPOSE UX  
\--------------------------------------------------

Loan purpose should not be fixed-only.

Keep quick suggestion chips, but add required custom text field.

Section title:  
“Loan Purpose”

Helper:  
“Tell us why you need this loan. This helps Lendra understand borrowing intent.”

Suggestion chips:  
\- DeFi opportunity  
\- NFT purchase  
\- Token swap  
\- Protocol participation  
\- Gas fees  
\- Other

Behavior:  
\- Clicking chip adds selected tag or pre-fills field  
\- User can edit freely  
\- User can write their own purpose without selecting chip  
\- Purpose field required before signing

Placeholder:  
“Example: I want to cover gas fees and participate in a Solana DeFi campaign.”

Validation:  
\- Required  
\- Minimum 10 characters  
\- Maximum 180 characters  
\- Character counter  
\- Error:  
“Please describe your loan purpose before continuing.”

Store:  
\- loan\_purpose\_text  
\- loan\_purpose\_tags  
\- wallet\_address  
\- loan\_level  
\- loan\_amount  
\- created\_at

\--------------------------------------------------  
10\. SNS.ID .SOL FLOW  
\--------------------------------------------------

Replace all Bonfida-branded .sol flows with SNS.id.

Do not redirect users away from Lendra.

Add in-app SNS.id identity upgrade flow:  
1\. On wallet connect, check if wallet owns or has primary .sol domain  
2\. If no .sol exists, show card:  
“Boost your credit score with a .sol identity”  
3\. Add in-app domain search:  
\- search input: “Search your .sol name”  
\- show availability  
\- show price  
\- show if available to register or listed for sale  
4\. Allow users to buy/register in-app using Solflare  
5\. Use SNS.id SDK/API only for product integration  
6\. Include referral support where supported  
7\. After transaction confirms:  
\- refresh wallet identity  
\- show .sol badge on dashboard  
\- apply .sol identity boost up to \+40 pts  
\- show toast:  
“.sol identity added. Your credit profile was updated.”

Important:  
\- No Bonfida branding in UI copy  
\- User must never be redirected to sns.id  
\- Purchase must happen inside Lendra  
\- .sol is part of the score upgrade journey

\--------------------------------------------------  
11\. BOOST YOUR SCORE SECTION  
\--------------------------------------------------

Update Boost Your Score cards:

1\. Connect X  
\- \+100 max  
\- Description:  
“Verify an active X account using OAuth, stable X account ID, account age, and public activity.”  
\- CTA: Connect X

2\. Add Cross-Chain Credit  
\- \+90 pts  
\- Description:  
“Connect ETH or BTC activity through Ika to strengthen your credit profile.”  
\- CTA: Add external wallet

3\. Add .sol Identity  
\- \+40 pts  
\- Description:  
“Search and buy a .sol name through SNS.id to strengthen your wallet identity.”  
\- CTA: Search .sol names

4\. Verify Superteam PoW  
\- \+30 pts  
\- Description:  
“Add proof-of-work signals from Superteam activity.”  
\- CTA: Verify Superteam

5\. Repay loans on time  
\- up to \+140 pts  
\- Description:  
“Every clean repayment strengthens your Lendra score and unlocks higher borrowing levels.”

6\. Borrow Growth Bonus  
\- up to \+100 pts  
\- Description:  
“Earn more points by repaying higher loan amounts over time.” 

Dashboard sections:

1\. Profile Summary Card:  
\- wallet address  
\- .sol domain if available  
\- score /1000  
\- tier  
\- current level name  
\- eligibility status  
\- borrow asset options  
\- active loan status

2\. Borrowing Power  
\- current eligible amount  
\- current borrow asset  
\- next level amount  
\- requirements to unlock next level  
\- CTA: Borrow now

3\. Score Summary Card:  
\- compact score breakdown  
\- CTA: View full score breakdown

4\. Eligibility Gates  
\- score requirement  
\- 90-day spend gate  
\- max single transaction gate  
\- active loan gate  
\- repayment requirement  
\- level requirement  
\- X requirement for Platinum/Diamond

Helper:  
“Your score shows trust. Eligibility decides whether you can borrow now.”

5\. Position  
If active loan:  
\- amount  
\- asset  
\- APR  
\- due date  
\- repayment amount  
\- bond locked  
\- status  
\- repay button

If no active loan:  
“No active loan. You are eligible to borrow up to $X.”

6\. Trust Profile  
\- .sol identity status  
\- X verification status  
\- X user ID if verified  
\- Superteam PoW status  
\- cross-chain wallets connected  
\- Private Mode status  
\- Telegram alert status if available

CTA:  
Boost trust profile

7\. Lendra AI  
“Ask Lendra AI. Understand your score, borrowing power, and next unlock step.”

CTA:  
Ask about my score

8\. Recent Activity  
Show last 5 events:  
\- wallet scanned  
\- score updated  
\- .sol searched  
\- .sol purchased  
\- X connected  
\- cross-chain wallet added  
\- borrow simulation created  
\- bond deposited  
\- loan created  
\- repayment confirmed  
\- QVAC explanation generated  
\- Telegram alert enabled

Empty states:  
\- no scan  
\- no .sol  
\- no X verification  
\- no cross-chain wallet  
\- no active loan

9.Quick Actions  
Add quick action buttons:  
\- Scan wallet  
\- Borrow  
\- Repay  
\- Add .sol  
\- Connect X  
\- Add cross-chain wallet  
\- Ask Lendra AI   
\- Enable Telegram Alerts

\--------------------------------------------------  
13\. SOCIAL CREDIT CARD  
\--------------------------------------------------

Users should be able to generate shareable Lendra credit score cards and share on X.

Add in two places:  
1\. /dashboard: “Share Credit Card”  
2\. /scan or Score page after score reveal: “Generate Share Card”

Use:  
\- @vercel/og  
\- route: /api/og/credit-card

Card design:  
\- dark background  
\- \#EC81FF accent  
\- Lendra logo  
\- premium credit-card style

Show:  
\- .sol domain if available, otherwise shortened wallet  
\- Lendra Score: X/1000  
\- tier  
\- level name  
\- Eligible amount  
\- “Your wallet is your credit score”  
\- lendra.finance

Privacy:  
\- no full wallet address  
\- no portfolio value  
\- no balances  
\- no loan history  
\- no repayment history  
\- no private-mode data  
\- if Private Mode is on, ask user to confirm before generating card

Actions:  
\- Download image  
\- Share to X  
\- Copy link

X share text:  
“My wallet has a Lendra Score of {score}/1000.

Your wallet is your credit score.

Scan yours on Lendra:  
https://lendra.finance”

If user has .sol:  
“{solDomain} has a Lendra Score of {score}/1000.

Your wallet is your credit score.

Scan yours on Lendra:  
https://lendra.finance”

15\. PRIVATE MODE \+ ENCRYPT/IKA  
\--------------------------------------------------

Private Mode:  
\- Free during beta  
\- Devnet preview if Encrypt mainnet is not live  
\- Copy:  
“Hide sensitive credit and loan data using Encrypt. Free during beta.”

Cross-Chain Credit:  
\- Free during beta  
\- Devnet preview if Ika mainnet is not live  
\- Copy:  
“Connect external wallet activity through Ika to strengthen your Lendra profile. Free during beta.”

Track:  
\- encrypt\_operations\_used  
\- ika\_operations\_used  
\- private\_mode\_enabled  
\- private\_mode\_plan  
\- private\_operations\_quota  
\- private\_operations\_used  
\- private\_operations\_remaining

Do not imply production mainnet support if not live. 

Create the complete notification backend for Lendra.

Goal:  
Users should be able to connect Telegram alerts to their wallet, and Lendra should use QuickNode Webhooks to trigger Telegram and in-app notifications for wallet, loan, bond, repayment, score, level, and eligibility events.

Create these backend routes:

1\. POST /api/webhooks/quicknode  
2\. GET /api/webhooks/quicknode  
3\. POST /api/telegram/link/start  
4\. POST /api/telegram/webhook  
5\. GET /api/telegram/webhook  
6\. POST /api/telegram/test  
7\. GET /api/notifications/preferences  
8\. POST /api/notifications/preferences

Use:  
\- Next.js App Router  
\- TypeScript  
\- Supabase  
\- Upstash Redis  
\- Telegram Bot API  
\- QuickNode Webhooks

Environment variables:  
QUICKNODE\_WEBHOOK\_SECRET=  
TELEGRAM\_BOT\_TOKEN=  
TELEGRAM\_BOT\_USERNAME=  
TELEGRAM\_WEBHOOK\_SECRET=  
NEXT\_PUBLIC\_APP\_URL=https://lendra.finance  
UPSTASH\_REDIS\_URL=  
UPSTASH\_REDIS\_TOKEN=  
SUPABASE\_SERVICE\_ROLE\_KEY=  
NEXT\_PUBLIC\_SUPABASE\_URL=

Security:  
\- Do not expose QUICKNODE\_WEBHOOK\_SECRET to frontend  
\- Do not expose TELEGRAM\_BOT\_TOKEN to frontend  
\- Do not expose SUPABASE\_SERVICE\_ROLE\_KEY to frontend  
\- All webhook/notification logic must run server-side  
\- QuickNode endpoint does not require user auth because QuickNode is the caller  
\- Telegram webhook does not require user auth because Telegram is the caller  
\- User-facing endpoints require connected wallet session  
\- Use short-lived Redis codes for Telegram linking  
\- Delete link code after successful Telegram connection  
\- If Private Mode is enabled, send minimal alerts only

Database updates:

Update wallet\_profiles with:  
\- telegram\_chat\_id text  
\- telegram\_username text  
\- telegram\_connected boolean default false  
\- telegram\_connected\_at timestamp  
\- telegram\_alerts\_enabled boolean default false  
\- telegram\_score\_alerts\_enabled boolean default true  
\- telegram\_loan\_alerts\_enabled boolean default true  
\- telegram\_bond\_alerts\_enabled boolean default true  
\- telegram\_repayment\_alerts\_enabled boolean default true  
\- telegram\_level\_alerts\_enabled boolean default true

Create notification\_events:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text  
\- channel text not null  
\- event\_type text not null  
\- status text default 'pending'  
\- recipient text  
\- message text  
\- metadata jsonb  
\- error\_message text  
\- created\_at timestamp with time zone default now()  
\- sent\_at timestamp with time zone

Channel values:  
\- telegram  
\- in\_app  
\- email  
\- x\_dm

Status values:  
\- pending  
\- sent  
\- failed  
\- skipped

Create score\_change\_events:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- previous\_score numeric  
\- new\_score numeric  
\- score\_delta numeric  
\- previous\_level int  
\- new\_level int  
\- previous\_eligible boolean  
\- new\_eligible boolean  
\- reason text  
\- trigger\_event text  
\- notification\_sent boolean default false  
\- created\_at timestamp with time zone default now()

Route: POST /api/webhooks/quicknode

Behavior:  
1\. Verify request using QUICKNODE\_WEBHOOK\_SECRET  
2\. Return 401 if invalid  
3\. Parse payload  
4\. Log valid webhook into partner\_events:  
   partner \= quicknode  
   event\_type \= quicknode\_webhook\_event  
   metadata \= full payload JSON  
5\. Extract wallet address, transaction signature, slot, token transfers, SOL transfers, SPL transfers, involved accounts when available  
6\. Detect event types when possible:  
   \- wallet\_activity\_updated  
   \- bond\_deposited  
   \- repayment\_confirmed  
   \- bond\_returned  
   \- bond\_liquidated  
   \- score\_recalculation\_triggered  
7\. For wallet activity:  
   \- update wallet activity if helpers exist  
   \- recalculate score/eligibility if helpers exist  
   \- compare previous score and new score  
   \- create score\_change\_events if score dropped by 15+ points, user lost level, or user became ineligible  
8\. For bond deposit:  
   \- create bond\_event if helper exists  
   \- trigger bond\_deposited notification  
9\. For repayment:  
   \- update loan/repayment records if helpers exist  
   \- trigger repayment\_confirmed notification  
   \- trigger level\_unlocked notification if level increases  
10\. For bond return:  
   \- trigger bond\_returned notification  
11\. For bond liquidation:  
   \- trigger bond\_liquidated notification  
12\. Call sendTelegramNotification() when wallet has Telegram alerts enabled  
13\. Store all notification attempts in notification\_events  
14\. Return { "ok": true }

Minimum behavior required:  
\- receive payload  
\- verify security token  
\- store payload in partner\_events  
\- attempt event detection  
\- return success

Route: GET /api/webhooks/quicknode

Return:  
{  
  "ok": true,  
  "service": "quicknode-webhook",  
  "message": "QuickNode webhook endpoint is live. Use POST for webhook delivery."  
}

Route: POST /api/telegram/link/start

Behavior:  
1\. Require connected wallet session  
2\. Get wallet\_address from session  
3\. Generate secure random code  
4\. Store in Redis:  
   key: telegram\_link:{code}  
   value: wallet\_address  
   TTL: 10 minutes  
5\. Return:  
{  
  "ok": true,  
  "telegramUrl": "https://t.me/${TELEGRAM\_BOT\_USERNAME}?start=${code}"  
}

Route: POST /api/telegram/webhook

Behavior:  
1\. Validate TELEGRAM\_WEBHOOK\_SECRET if configured using Telegram secret token header  
2\. Parse Telegram update  
3\. If message contains /start \<code\>:  
   \- look up telegram\_link:{code} in Redis  
   \- if invalid/expired, send:  
     “This Lendra link has expired. Please return to Lendra and try again.”  
   \- if valid:  
     \- get wallet\_address  
     \- get telegram chat\_id and username  
     \- update wallet\_profiles:  
       telegram\_chat\_id  
       telegram\_username  
       telegram\_connected \= true  
       telegram\_alerts\_enabled \= true  
       telegram\_connected\_at \= now()  
     \- delete Redis code  
     \- send:  
       “Lendra alerts are now enabled for this wallet.”  
     \- insert notification\_events row:  
       channel \= telegram  
       event\_type \= telegram\_connected  
       status \= sent  
4\. If message not recognized, send:  
   “Open Lendra and click Enable Telegram Alerts to connect this bot.”  
5\. Return { "ok": true }

Route: GET /api/telegram/webhook

Return:  
{  
  "ok": true,  
  "service": "telegram-webhook",  
  "message": "Telegram webhook endpoint is live. Use POST for Telegram updates."  
}

Route: POST /api/telegram/test

Behavior:  
1\. Require connected wallet session  
2\. Find wallet profile  
3\. If telegram\_connected is false, return:  
   “Telegram alerts are not connected.”  
4\. Send:  
   “Lendra test alert. Telegram alerts are working.”  
5\. Insert notification\_events row  
6\. Return { "ok": true }

Routes: /api/notifications/preferences

GET:  
Return wallet notification preferences.

POST:  
Allow user to update:  
\- telegram\_alerts\_enabled  
\- telegram\_score\_alerts\_enabled  
\- telegram\_loan\_alerts\_enabled  
\- telegram\_bond\_alerts\_enabled  
\- telegram\_repayment\_alerts\_enabled  
\- telegram\_level\_alerts\_enabled

Helper:  
sendTelegramNotification({  
  walletAddress,  
  eventType,  
  message,  
  metadata  
})

Behavior:  
1\. Fetch wallet profile  
2\. If telegram\_connected is false, log skipped  
3\. If telegram\_alerts\_enabled is false, log skipped  
4\. Check category preference  
5\. If Private Mode is enabled, send minimal alert:  
   “Lendra Alert: Your trust profile changed. Open Lendra to view details privately: https://lendra.finance/dashboard”  
6\. Send message using Telegram Bot API sendMessage  
7\. Insert notification\_events with sent or failed  
8\. Store error\_message if failed

Supported events:  
\- telegram\_connected  
\- wallet\_activity\_updated  
\- wallet\_scan\_completed  
\- borrow\_eligibility\_updated  
\- loan\_created  
\- bond\_deposited  
\- repayment\_confirmed  
\- bond\_returned  
\- loan\_due\_soon  
\- loan\_overdue  
\- trust\_score\_dropped  
\- borrowing\_level\_dropped  
\- borrowing\_locked  
\- repayment\_score\_penalized  
\- score\_increased  
\- level\_unlocked  
\- sol\_identity\_connected  
\- cross\_chain\_wallet\_connected  
\- private\_mode\_enabled

Trust score drop alert rules:  
Send alert when:  
\- score drops by 15+ points  
\- user loses borrowing level  
\- user becomes ineligible  
\- repayment score is penalized  
\- late repayment reduces score  
\- default resets repayment score  
\- 90-day spend gate changes from passed to failed  
\- max single transaction gate changes from passed to failed  
\- X verification is removed/expires  
\- .sol identity removed or no longer primary  
\- cross-chain wallet disconnected  
\- Superteam PoW verification lost

Do not alert for tiny score changes below 15 unless user loses eligibility or level.

Telegram templates:

repayment\_confirmed:  
“Lendra Alert

Repayment confirmed.

Loan: ${amount} ${asset}  
Bond returned: ${bondAmount} ${asset}  
Score change: \+${points}  
New level: ${levelName}

Your wallet activity keeps building your credit profile.”

loan\_due\_soon:  
“Lendra Reminder

Your ${amount} ${asset} loan is due in ${days} days.

Repay on time to get your bond back and strengthen your Lendra score.”

level\_unlocked:  
“Lendra Update

${levelName} unlocked.

You can now borrow up to ${amount} ${asset}.”

trust\_score\_dropped:  
“Lendra Alert

Your trust score dropped by ${absoluteDelta} points.

Previous score: ${previousScore}  
Current score: ${newScore}

Reason: ${reason}

Open Lendra to see how to recover your score:  
https://lendra.finance/dashboard”

borrowing\_locked:  
“Lendra Alert

Borrowing is currently locked.

Reason: ${reason}

Open Lendra to see what to fix:  
https://lendra.finance/dashboard”

Private Mode:  
“Lendra Alert

Your trust profile changed.

Open Lendra to view details privately:  
https://lendra.finance/dashboard”

UI:  
Add Telegram controls in:  
\- Dashboard Trust Profile card  
\- Trust page  
\- Settings page if available

Buttons:  
\- Enable Telegram Alerts  
\- Send Test Alert  
\- Disconnect Telegram  
\- Manage Alert Preferences  
