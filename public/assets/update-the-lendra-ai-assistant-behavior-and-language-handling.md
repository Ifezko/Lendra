Update the Lendra AI assistant behavior and language handling.

Important language rule:  
When a user selects a language, all assistant-facing translated UI text must appear only in that selected language.

Do NOT show mixed English \+ translated text side by side.

Examples:  
\- If language \= Yoruba, suggestion chips, translated questions, assistant responses, labels, and generated explanations should be Yoruba only where translation is applied.  
\- If language \= Igbo, show Igbo only.  
\- If language \= Hausa, show Hausa only.  
\- If language \= French, show French only.  
\- If language \= Spanish, show Spanish only.  
\- If language \= Chinese, show Chinese only.  
\- If language \= Arabic, show Arabic only.

Do not render:  
“Explain cross-chain credit / \[translated text\]”

Instead render only the translated version:  
“\[translated text\]”

Keep product/integration names unchanged where appropriate:  
\- Lendra  
\- Solana  
\- QuickNode  
\- Kamino  
\- Solflare  
\- QVAC  
\- SNS.id  
\- Encrypt  
\- Ika  
\- .sol

Assistant behavior:  
Do NOT create separate answer modes like “Personal mode” and “Product knowledge mode.”

Instead, create one unified Lendra AI assistant.

The assistant should:  
\- answer any question about Lendra, the user’s wallet score, borrowing, repayments, bonds, eligibility, and integrations  
\- automatically use the connected wallet context when relevant  
\- answer general product questions normally when wallet context is not needed  
\- blend product knowledge and wallet-specific context in one response

Examples:

User asks:  
“How does cross-chain credit work?”

Assistant should answer:  
\- Explain cross-chain credit generally  
\- Then, if wallet context exists, add how it could affect this user’s Lendra profile  
\- Mention Ika if relevant  
\- Keep the answer simple and actionable

User asks:  
“How much can I borrow?”

Assistant should answer:  
\- Use wallet score, spend gate, loan level, and active loan status  
\- Give exact eligible amount if available  
\- Explain what blocks the user if not eligible

User asks:  
“What is SNS.id?”

Assistant should answer:  
\- Explain SNS.id simply  
\- Explain how .sol identity helps the user’s Lendra trust profile  
\- If user does not have a .sol domain, suggest searching for one inside Lendra

User asks:  
“Why is my score low?”

Assistant should answer:  
\- Use actual score breakdown  
\- Mention the main limiting factors  
\- Give 3 concrete next steps

Quick-action chips:  
Translate quick-action chips fully into the selected language.  
Do not show English alongside translations.

Default English chips:  
\- Why is my score low?  
\- How can I improve?  
\- How much can I borrow?  
\- What bond is required?  
\- Explain cross-chain credit  
\- Explain private borrowing  
\- What is SNS.id?  
\- Change language

If user selects another language, replace the visible chip text with translated versions only.

UI text color fix:  
Assistant response text must be light and readable.  
Use:  
\- primary text: white or slate-100  
\- secondary text: slate-300  
\- muted text: slate-400

Do not use dark text on dark message cards.

Input placeholder:  
Default English:  
“Ask about your score, borrowing, or how Lendra works...”

When another language is selected:  
Translate the placeholder into that language only.

Voice:  
Use a warm, local, natural voice where possible.  
Voice output should match the selected language.  
The voice should feel local and natural, not generic.  
Use a warm, region-aware voice.  
Support localized voice output where possible.

Voice/language behavior:  
\- Default language: English  
\- Also support local language options  
\- Responses should stay clear, simple, and professional  
\- Avoid robotic or overly formal language  
Do not use a generic robotic voice if localized voice is available.

Privacy badge:  
Keep:  
“Runs locally on your device. No financial data sent to cloud.”

Translate this badge into the selected language only when a non-English language is selected.

Replace all Bonfida-branded .sol flows with SNS.id.

Add an in-app SNS.id identity upgrade flow.

Do not redirect users away from Lendra.

Features:  
1\. On wallet connect, check whether the wallet owns or has a primary .sol domain.  
2\. If no .sol domain exists, show an upgrade card:  
   "Boost your credit score with a .sol identity"  
3\. Add domain search inside Lendra:  
   \- search input: "Search your .sol name"  
   \- show availability  
   \- show price  
   \- show whether the name is available to register or listed for sale  
4\. Allow users to buy/register the domain in-app using Solflare.  
5\. Use SNS.id SDK/API only for product integration.  
6\. Include referral support:  
   \- pass Lendra's approved SNS referral wallet/key when registering or buying  
   \- send referral commission to LENDRA\_FEE\_WALLET  
7\. After transaction confirms:  
   \- refresh wallet identity  
   \- show .sol badge on dashboard  
   \- apply .sol credit boost up to \+50 pts  
   \- show success toast: ".sol identity added. Your credit profile was updated."

Important:  
\- The user must never be redirected to sns.id.  
\- The purchase must happen inside Lendra.  
\- The .sol domain is part of the credit score upgrade journey.

2\. Update bond amounts

Update Lendra bond logic.

Replace fixed bond amounts with a simple percentage-based bond.

Bond rule:  
\- Bond amount \= 30% of selected loan amount  
\- Bond token should match borrow asset where supported  
\- Default bond token: USDC  
\- Round bond amount to 2 decimal places

Examples:  
\- $10 loan → $3 bond  
\- $25 loan → $7.50 bond  
\- $50 loan → $15 bond  
\- $100 loan → $30 bond  
\- $200 loan → $60 bond  
\- $400 loan → $120 bond

Remove old fixed bond amounts:  
\- Level 1 $3  
\- Level 2 $5  
\- Level 3 $7  
\- Level 4 $12  
\- Level 5 $20  
\- Level 6 $35

Update borrow simulation screen:  
Show:  
\- Selected loan amount  
\- Borrow asset  
\- APR  
\- Interest  
\- Bond required: 30% of loan amount  
\- Bond amount  
\- Total repayment  
\- Due date  
\- Loan purpose  
\- Consent checkbox  
\- Sign with Solflare

Bond explanation copy:  
“Your bond is held in escrow and returned when you repay on time.”

Detailed tooltip:  
“Lendra uses a 30% bond to create borrower commitment without requiring full overcollateralization. If you repay on time, your bond is returned. If you default, your bond may be liquidated into the insurance fund.”

Update bond\_events tracking:  
\- Store bond\_percentage \= 30  
\- Store bond\_amount\_usd  
\- Store loan\_amount  
\- Store borrow\_asset  
\- Store bond\_token

Update bond\_events table if needed:  
Add fields:  
\- bond\_percentage numeric default 30  
\- loan\_amount numeric  
\- borrow\_asset text default 'USDC'

Update admin /bonds page:  
Show:  
\- Bond percentage  
\- Loan amount  
\- Bond amount  
\- Bond status  
\- Escrow provider  
\- Tx hash

Update /admin/revenue and /admin/bonds accounting note:  
\- Bonds deposited are not revenue.  
\- Active locked bonds are escrowed user funds.  
\- Only liquidated bonds count as insurance fund inflow.

Update Lendra AI:  
When user asks “what bond do I need?” answer:  
“Lendra requires a 30% bond. For a $X loan, your bond is $Y. It is returned when you repay on time.”

Update eligibility and loan simulation logic:  
\- calculateBondAmount(loanAmount) \= roundToTwoDecimals(loanAmount \* 0.30)

Show bond clearly as:  
“Returned when you repay on time.”

3\. Update loan purpose UX

Do not make loan purpose fixed-only.

Keep quick suggestion chips, but add a required custom text field.

Loan Purpose section:  
Title:  
Loan Purpose

Helper text:  
Tell us why you need this loan. This helps Lendra understand borrowing intent.

Suggestion chips:  
\- DeFi opportunity  
\- NFT purchase  
\- Token swap  
\- Protocol participation  
\- Gas fees  
\- Other

Behavior:  
\- Clicking a chip adds it as a selected tag or pre-fills the text field.  
\- User can edit the purpose freely.  
\- User can write their own purpose even without selecting a chip.  
\- Purpose text field is required before signing.

Text field placeholder:  
“Example: I want to cover gas fees and participate in a Solana DeFi campaign.”

Validation:  
\- Required  
\- Minimum 10 characters  
\- Maximum 180 characters  
\- Show character counter  
\- Show clear error if empty:  
  “Please describe your loan purpose before continuing.”

Store:  
\- loan\_purpose\_text  
\- loan\_purpose\_tags  
\- created\_at  
\- wallet\_address  
\- loan\_level  
\- loan\_amount

4\. Update borrow simulation screen

The simulation should show:  
\- Selected loan amount  
\- Borrow asset: USDC / USDT if supported  
\- APR  
\- Interest  
\- Bond amount  
\- Total repayment  
\- Due date  
\- Loan purpose  
\- Consent checkbox  
\- Sign with Solflare button

5\. Analytics

Track loan purpose in admin dashboard.

In loan\_events table:  
Add fields:  
\- loan\_purpose\_text  
\- loan\_purpose\_tags

In admin / loans page:  
Show:  
\- Wallet  
\- Amount  
\- Level  
\- Purpose  
\- APR  
\- Bond  
\- Status  
\- Due date  
\- Tx hash

Add filters:  
\- Loan amount  
\- Loan level  
\- Purpose tag  
\- Status

4\. Update Boost Your Score section

Add Cross-Chain Credit to the Boost Your Score cards.

Boost cards should be:

Use the current official X logo, not the old Twitter bird logo.

Store these X fields:  
\- x\_user\_id  
\- x\_username  
\- x\_display\_name  
\- x\_profile\_image  
\- x\_verified\_at

Important:  
Use x\_user\_id as the stable identity anchor because users can change their username/handle.

Card:  
Title: Add Cross-Chain Credit  
Points: \+80 pts  
Description: Connect ETH or BTC activity through Ika to strengthen your credit profile.  
CTA: Add external wallet

5\. Replace green/teal UI colors with Lendra brand color

The trust page currently use green/teal colors in some active states.

Replace those with Lendra primary color:  
\#EC81FF

Use \#EC81FF for:  
\- active nav tabs  
\- primary buttons  
\- score ring accents  
\- selected tabs  
\- hover states  
\- boost badges  
\- borders and glows

Use green only for true success/status states:  
\- repayment confirmed  
\- healthy position  
\- transaction success

Do not use green as the main brand color.

6\. Cross-chain credit page color update

On the Cross-Chain Credit page:  
\- Replace teal icon background with dark purple/pink accent styling.  
\- Replace teal selected tab/button with \#EC81FF styling.  
\- Keep the page visually consistent with Lendra’s dark purple brand.

8\. Product logic note

A high score should not automatically mean borrowing is unlocked.

Add a Dashboard/Home page to the authenticated Lendra app.

This should be the first sidebar nav item.

Route:  
/dashboard

Sidebar:  
Add Dashboard as the first item.

Updated sidebar order:  
1\. Dashboard  
2\. Score  
3\. Borrow  
4\. Repay  
5\. Position  
6\. Trust  
7\. History  
8\. Lendra AI

Secondary nav at bottom:  
\- Docs  
\- Support

Top status bar:  
\- Private Mode toggle  
\- Network badge  
\- Wallet address button  
\- Notifications icon

Remove the old header nav links:  
\- Score  
\- Borrow  
\- Repay  
\- Trust

Do not remove the wallet button.  
Move wallet button to top-right status bar.

Mobile behavior:  
\- Show hamburger button  
\- Sidebar opens as full-height drawer  
\- Close sidebar when user selects a nav item

Important:  
\- Dashboard should be the main user home after wallet connect.  
\- After user connects wallet, redirect them to /dashboard instead of directly to /scan if a profile already exists.  
\- If no scan exists, show a “Run your first scan” CTA.

Dashboard goal:  
Show every relevant user detail in one command center.

Dashboard sections:

1\. Profile Summary Card  
Show:  
\- wallet address  
\- .sol domain if available  
\- score  
\- tier  
\- current loan level  
\- eligibility status  
\- borrow asset options  
\- active loan status

Example UI copy:  
Wallet: Ep7g...VCiD  
Identity: ifeanyi.sol  
Score: 690  
Tier: Good  
Level: 5  
Eligible: Up to $200 USDC  
Status: No active loan

2\. Borrowing Power Card  
Show:  
\- current eligible amount  
\- current borrow asset, e.g. USDC  
\- next level amount  
\- requirements to unlock next level

Example:  
You can borrow up to $200 USDC.  
Next unlock: $400  
Needed:  
\- \+35 score points  
\- 1 clean repayment  
\- $400 max single transaction history

CTA:  
Borrow now

3\. Score Summary Card  
Show a compact score breakdown:  
\- Wallet age  
\- Transaction activity  
\- Monthly consistency  
\- Protocol diversity  
\- Portfolio value  
\- Repayment history  
\- X verification  
\- Cross-chain credit  
\- .sol identity  
\- Superteam PoW

Do not show the full detailed score breakdown here.  
Add CTA:  
View full score breakdown

4\. Eligibility Gates Card  
Show pass/fail badges for:  
\- Score requirement  
\- 90-day spend gate  
\- Max single transaction gate  
\- Active loan gate  
\- Repayment requirement  
\- Level requirement

Important:  
Make it clear that score and eligibility are not the same.  
Add helper copy:  
Your score shows trust. Eligibility decides whether you can borrow now.

5\. Active Loan / Position Card  
If user has an active loan, show:  
\- loan amount  
\- borrow asset  
\- APR  
\- due date  
\- repayment amount  
\- bond locked  
\- status  
\- repay button

If user has no active loan, show:  
No active loan.  
You are eligible to borrow up to $X.

CTA:  
Borrow now

6\. Trust Profile Card  
Show:  
\- .sol identity status  
\- X verification status  
\- X user ID if verified  
\- Superteam PoW status  
\- Cross-chain wallets connected  
\- Private Mode status

CTA:  
Boost trust profile

7\. Lendra AI Card  
Show:  
Ask Lendra AI  
Understand your score, borrowing power, and next unlock step.

CTA:  
Ask about my score

Clicking CTA opens the Lendra AI assistant drawer with wallet context.

8\. Recent Activity Card  
Show last 5 user events:  
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

Design:  
\- Dark fintech dashboard  
\- \#EC81FF accent  
\- Rounded cards  
\- Thin borders  
\- Grid layout  
\- Responsive mobile layout  
\- Do not use green/teal as primary brand color  
\- Make the dashboard feel like the user’s Lendra control center

Data:  
Pull from:  
\- latest wallet scan  
\- loan events  
\- bond events  
\- partner events  
\- trust connections  
\- repayment history

Empty states:  
If no wallet scan exists:  
Show:  
Your Lendra profile is not ready yet.  
Scan your wallet to generate your first credit profile.

CTA:  
Run wallet scan

If no .sol identity:  
Show:  
No .sol identity linked.  
Add a .sol name to strengthen your trust profile.

If no X verification:  
Show:  
X account not verified.  
Connect X to strengthen identity using your stable X account ID.

If no cross-chain wallet:  
Show:  
No external wallet connected.  
Add ETH or BTC activity to strengthen cross-chain credit.

If no active loan:  
Show:  
No active loan.  
Borrowing options will appear once eligibility is confirmed.

Update Lendra scoring so the base score starts at 200 instead of 300\.

Reason:  
A lower base score makes users earn trust by connecting stronger identity and credit signals such as X verification, .sol identity, cross-chain credit, Superteam PoW, and repayment history.

Keep max score at 870\.

Use this score allocation:

Base score:  
\- 200

Activity signals:  
\- Wallet age: max 60 pts  
\- Transaction volume: max 60 pts  
\- Monthly consistency: max 60 pts  
\- Protocol diversity: max 70 pts  
\- Portfolio value: max 40 pts

Core trust signals:  
\- Repayment history: max 140 pts  
\- X verification: max 80 pts  
\- Cross-chain credit: max 90 pts  
\- .sol identity via SNS.id: max 40 pts  
\- Superteam PoW: max 30 pts

Total max:  
870

Repayment score logic:  
\- Each clean on-time repayment: \+25 pts  
\- Each early repayment: \+5 bonus pts  
\- Early repayment bonus capped at \+20 pts  
\- Each late repayment: \-15 pts  
\- Default: repayment score resets to 0  
\- Repayment score capped at 140 pts

Update borrowing ladder:

Level 1:  
\- Loan: $10  
\- Min score: 350  
\- Clean repayments needed: 0

Level 2:  
\- Loan: $25  
\- Min score: 430  
\- Clean repayments needed: 1

Level 3:  
\- Loan: $50  
\- Min score: 500  
\- Clean repayments needed: 2

Level 4:  
\- Loan: $100  
\- Min score: 575  
\- Clean repayments needed: 3

Level 5:  
\- Loan: $200  
\- Min score: 650  
\- Clean repayments needed: 4

Level 6:  
\- Loan: $400  
\- Min score: 725  
\- Clean repayments needed: 5

Eligibility still depends on:  
\- score  
\- 90-day spend gate  
\- max single transaction requirement  
\- active loan status  
\- clean repayment requirement  
\- level rules

Important:  
Do not let old wallet age alone make a user look highly creditworthy.  
Repayment history, X verification, and cross-chain credit should matter more than passive wallet age.

Update score breakdown UI to show:

\- Base Score \+200  
\- Wallet Age \+X/60  
\- Transaction Volume \+X/60  
\- Monthly Consistency \+X/60  
\- Protocol Diversity \+X/70  
\- Portfolio Value \+X/40  
\- Repayment History \+X/140  
\- X Verification \+X/80  
\- Cross-Chain Credit \+X/90  
\- .sol Identity \+X/40  
\- Superteam PoW \+X/30

Update score messaging:  
If user score is low, show:  
“Your base score starts at 200\. Connect more trust signals and build repayment history to unlock higher borrowing limits.”

Add helper copy:  
“Wallet activity gets you started. Repayment and verified identity move you up.”

Update Boost Your Score cards:  
\- Connect X: \+80 pts  
\- Add Cross-Chain Credit: \+90 pts  
\- Add .sol Identity: \+40 pts  
\- Verify Superteam PoW: \+30 pts  
\- Repay loans on time: up to \+140 pts

Update Lendra AI:  
When users ask why their score is low, explain that Lendra starts at 200 and rewards verified signals, repayment behavior, and cross-chain activity.

Add Social Credit Card sharing to Lendra.

Feature:  
Users should be able to generate a shareable Lendra credit score card and share it on X.

Add this in two places:  
1\. /dashboard  
\- Add a card or button: “Share Credit Card”  
\- Show current score, tier, level, and .sol identity if available

2\. /scan or Score page  
\- After score reveal, show CTA: “Generate Share Card”

Card requirements:  
\- Generate image using @vercel/og  
\- Route: /api/og/credit-card  
\- Card should use Lendra branding:  
  \- dark background  
  \- \#EC81FF accent  
  \- Lendra logo  
  \- clean premium credit-card style  
\- Show:  
  \- .sol domain if available, otherwise shortened wallet  
  \- Lendra score  
  \- tier  
  \- loan level  
  \- “Your wallet is your credit score”  
  \- lendra.app

Privacy rules:  
\- Do not show full wallet address  
\- Do not show portfolio value  
\- Do not show balances  
\- Do not show loan history  
\- Do not show repayment history  
\- Do not show private-mode data  
\- If Private Mode is on, ask user to confirm before generating share card

Actions:  
\- Download image  
\- Share to X  
\- Copy link

X share text:  
“My wallet has a Lendra score of {score}.

Your wallet is your credit score.

Scan yours on Lendra.”

If user has .sol:  
“{solDomain} has a Lendra score of {score}.

Your wallet is your credit score.

Scan yours on Lendra.”

Track analytics:  
When card is generated:  
trackPartnerEvent({  
  partner: "lendra",  
  event\_type: "credit\_card\_generated",  
  wallet\_address,  
  metadata: { score, tier, level }  
})

When user shares to X:  
trackPartnerEvent({  
  partner: "x",  
  event\_type: "credit\_card\_shared",  
  wallet\_address,  
  metadata: { score, tier, level }  
})

Admin dashboard:  
Show social card metrics:  
\- Cards generated  
\- X shares  
\- Share conversion rate

Build the complete database layer for Lendra analytics, user activity, lending metrics, repayment behavior, partner usage, commissions, bonds, and admin access.

Purpose:  
This database stores and displays wallet scans, credit scores, borrowing behavior, repayment behavior, bond deposits, partner commissions, and partner integration usage. It should help the founder track usage and help future partners understand traction.

Use:  
\- Supabase PostgreSQL for persistent data  
\- Upstash Redis only for temporary/session/state data  
\- Server-side writes only for sensitive events  
\- No sensitive keys exposed to frontend

Core product rules:  
\- Lendra score starts from base score 200  
\- Max score is 870  
\- Score and borrowing eligibility are separate  
\- Borrowing eligibility depends on:  
  \- score  
  \- 90-day spend gate  
  \- max single transaction gate  
  \- active loan status  
  \- clean repayment count  
  \- level rules  
\- Users can borrow USDC now  
\- USDT may exist as disabled/coming soon unless supported  
\- Users can write their own loan purpose  
\- Repayments increase score and help users climb levels  
\- Bonds deposited are not revenue  
\- Only liquidated bonds count as insurance fund inflow

Create these tables:

1\. wallet\_profiles

Purpose:  
Stores the latest known wallet profile.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text unique not null  
\- sol\_domain text  
\- has\_sol\_domain boolean default false  
\- x\_user\_id text  
\- x\_username text  
\- x\_display\_name text  
\- x\_profile\_image text  
\- x\_verified\_at timestamp with time zone  
\- x\_connected boolean default false  
\- x\_dm\_verified boolean default false  
\- superteam\_verified boolean default false  
\- cross\_chain\_connected boolean default false  
\- private\_mode\_enabled boolean default false  
\- created\_at timestamp with time zone default now()  
\- updated\_at timestamp with time zone default now()

Important:  
Use x\_user\_id as the stable X identity anchor because X usernames can change.

2\. wallet\_scans

Purpose:  
Stores every wallet scan and score result.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- score numeric default 200  
\- tier text  
\- loan\_level int  
\- eligible boolean default false  
\- eligibility\_status text  
\- base\_score numeric default 200  
\- wallet\_age\_points numeric default 0  
\- transaction\_volume\_points numeric default 0  
\- monthly\_consistency\_points numeric default 0  
\- protocol\_diversity\_points numeric default 0  
\- portfolio\_value\_points numeric default 0  
\- repayment\_history\_points numeric default 0  
\- x\_verification\_points numeric default 0  
\- cross\_chain\_credit\_points numeric default 0  
\- sol\_identity\_points numeric default 0  
\- superteam\_pow\_points numeric default 0  
\- wallet\_age\_days numeric default 0  
\- total\_transactions int default 0  
\- avg\_monthly\_transactions numeric default 0  
\- unique\_protocols int default 0  
\- recent\_spend\_90d numeric default 0  
\- max\_single\_tx\_usd numeric default 0  
\- portfolio\_value\_usd numeric default 0  
\- has\_sol\_domain boolean default false  
\- sol\_domain text  
\- x\_connected boolean default false  
\- x\_user\_id text  
\- superteam\_verified boolean default false  
\- cross\_chain\_connected boolean default false  
\- qvac\_used boolean default false  
\- selected\_language text default 'English'  
\- created\_at timestamp with time zone default now()

Score allocation:  
\- Base score: 200  
\- Wallet age: max 60  
\- Transaction volume: max 60  
\- Monthly consistency: max 60  
\- Protocol diversity: max 70  
\- Portfolio value: max 40  
\- Repayment history: max 140  
\- X verification: max 80  
\- Cross-chain credit: max 90  
\- .sol identity via SNS.id: max 40  
\- Superteam PoW: max 30  
\- Max score: 870

3\. eligibility\_checks

Purpose:  
Stores the pass/fail gates for borrowing eligibility.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- scan\_id uuid references wallet\_scans(id)  
\- score\_passed boolean default false  
\- spend\_gate\_passed boolean default false  
\- max\_single\_tx\_gate\_passed boolean default false  
\- active\_loan\_gate\_passed boolean default true  
\- repayment\_requirement\_passed boolean default false  
\- level\_requirement\_passed boolean default false  
\- eligible\_level int default 0  
\- eligible\_amount numeric default 0  
\- borrow\_asset text default 'USDC'  
\- blocked\_reason text  
\- next\_unlock\_hint text  
\- created\_at timestamp with time zone default now()

4\. loan\_events

Purpose:  
Stores all borrow simulations, borrow attempts, successful borrows, repayment events, overdue states, and defaults.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- event\_type text not null  
\- borrow\_asset text default 'USDC'  
\- loan\_amount numeric default 0  
\- apr numeric default 0  
\- interest\_amount numeric default 0  
\- total\_repayment numeric default 0  
\- bond\_amount numeric default 0  
\- loan\_level int  
\- loan\_purpose\_text text  
\- loan\_purpose\_tags text\[\]  
\- status text default 'simulated'  
\- due\_date timestamp with time zone  
\- transaction\_hash text  
\- created\_at timestamp with time zone default now()

event\_type values:  
\- simulation  
\- borrow\_attempt  
\- borrowed  
\- repayment\_started  
\- repaid  
\- overdue  
\- defaulted  
\- cancelled  
\- failed

status values:  
\- simulated  
\- pending  
\- active  
\- repaid  
\- overdue  
\- defaulted  
\- failed  
\- cancelled

5\. loans

Purpose:  
Stores current and historical loan records.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- borrow\_asset text default 'USDC'  
\- loan\_amount numeric not null  
\- apr numeric not null  
\- interest\_amount numeric default 0  
\- total\_repayment numeric default 0  
\- bond\_amount numeric default 0  
\- loan\_level int  
\- loan\_purpose\_text text  
\- loan\_purpose\_tags text\[\]  
\- status text default 'active'  
\- borrowed\_at timestamp with time zone default now()  
\- due\_date timestamp with time zone  
\- repaid\_at timestamp with time zone  
\- borrow\_tx\_hash text  
\- repay\_tx\_hash text  
\- created\_at timestamp with time zone default now()  
\- updated\_at timestamp with time zone default now()

Important:  
Only one active loan per wallet.

6\. repayments

Purpose:  
Stores repayment behavior and score/level movement.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- loan\_id uuid references loans(id)  
\- amount\_repaid numeric default 0  
\- interest\_paid numeric default 0  
\- bond\_returned numeric default 0  
\- repaid\_at timestamp with time zone  
\- was\_late boolean default false  
\- was\_early boolean default false  
\- transaction\_hash text  
\- score\_before numeric  
\- score\_after numeric  
\- repayment\_points\_awarded numeric default 0  
\- level\_before int  
\- level\_after int  
\- created\_at timestamp with time zone default now()

Repayment scoring:  
\- Each clean on-time repayment: \+25 points  
\- Each early repayment: \+5 bonus points  
\- Early repayment bonus capped at \+20 points  
\- Each late repayment: \-15 points  
\- Default resets repayment score to 0  
\- Repayment score capped at 140 points

7\. repayment\_stats

Purpose:  
Stores aggregate repayment profile per wallet.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text unique not null  
\- clean\_repayments int default 0  
\- early\_repayments int default 0  
\- late\_repayments int default 0  
\- defaults int default 0  
\- repayment\_score numeric default 0  
\- current\_level int default 0  
\- highest\_level\_unlocked int default 0  
\- last\_repayment\_at timestamp with time zone  
\- created\_at timestamp with time zone default now()  
\- updated\_at timestamp with time zone default now()

8\. bond\_events

Purpose:  
Stores user bond deposits and escrow status.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- loan\_id uuid references loans(id)  
\- event\_type text not null  
\- bond\_amount\_usd numeric default 0  
\- bond\_token text default 'USDC'  
\- loan\_level int  
\- escrow\_provider text default 'streamflow'  
\- escrow\_account text  
\- status text default 'locked'  
\- tx\_hash text  
\- metadata jsonb  
\- created\_at timestamp with time zone default now()

event\_type values:  
\- bond\_deposited  
\- bond\_returned  
\- bond\_partially\_returned  
\- bond\_liquidated

status values:  
\- locked  
\- returned  
\- partially\_returned  
\- liquidated  
\- failed

Accounting rule:  
Bonds deposited are not revenue.  
Active locked bonds are escrowed user funds.  
Only liquidated bonds count as insurance fund inflow.

9\. partner\_events

Purpose:  
Stores all partner integration usage events.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text  
\- partner text not null  
\- event\_type text not null  
\- metadata jsonb  
\- created\_at timestamp with time zone default now()

Partner values:  
\- quicknode  
\- kamino  
\- solflare  
\- qvac  
\- sns\_id  
\- encrypt  
\- ika  
\- superteam  
\- x  
\- lendra

Example event types:  
\- wallet\_scan  
\- webhook\_event  
\- websocket\_session  
\- borrow\_simulation  
\- wallet\_signature  
\- score\_explained  
\- translation\_used  
\- voice\_session  
\- domain\_search  
\- domain\_purchase  
\- private\_mode\_enabled  
\- external\_wallet\_connected  
\- x\_connected  
\- x\_dm\_verified  
\- credit\_card\_generated  
\- credit\_card\_shared

10\. commission\_events

Purpose:  
Stores commissions and partner revenue events.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- partner text not null  
\- event\_type text not null  
\- wallet\_address text  
\- amount\_usd numeric default 0  
\- commission\_usd numeric default 0  
\- commission\_token text default 'USDC'  
\- status text default 'pending'  
\- tx\_hash text  
\- metadata jsonb  
\- created\_at timestamp with time zone default now()

Partner values:  
\- sns\_id  
\- kamino  
\- lendra\_loans

Event type values:  
\- sns\_domain\_purchase  
\- sns\_marketplace\_purchase  
\- kamino\_borrow\_referral  
\- lendra\_interest\_spread

Status values:  
\- pending  
\- confirmed  
\- paid  
\- failed

11\. sns\_events

Purpose:  
Tracks SNS.id .sol search, registration, purchase, and referral activity.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text  
\- domain text  
\- event\_type text not null  
\- availability\_status text  
\- price\_usd numeric default 0  
\- referral\_wallet text  
\- commission\_usd numeric default 0  
\- tx\_hash text  
\- metadata jsonb  
\- created\_at timestamp with time zone default now()

event\_type values:  
\- domain\_search  
\- domain\_available  
\- domain\_unavailable  
\- domain\_registered  
\- marketplace\_purchase  
\- referral\_commission\_pending  
\- referral\_commission\_confirmed

Important:  
Use SNS.id only in product copy.  
Do not use Bonfida branding in the UI.

12\. qvac\_events

Purpose:  
Tracks Lendra AI usage and language/voice behavior.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text  
\- event\_type text not null  
\- selected\_language text default 'English'  
\- user\_question text  
\- response\_summary text  
\- used\_voice boolean default false  
\- used\_translation boolean default false  
\- used\_tts boolean default false  
\- used\_stt boolean default false  
\- created\_at timestamp with time zone default now()

event\_type values:  
\- score\_explained  
\- product\_question\_answered  
\- translation\_used  
\- voice\_question\_asked  
\- voice\_response\_played  
\- language\_changed

13\. social\_credit\_cards

Purpose:  
Tracks generated and shared Lendra credit score cards.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- sol\_domain text  
\- score numeric  
\- tier text  
\- loan\_level int  
\- image\_url text  
\- shared\_to\_x boolean default false  
\- x\_share\_url text  
\- private\_mode\_confirmed boolean default false  
\- created\_at timestamp with time zone default now()

Privacy rules:  
Never store or show full wallet address on social card.  
Never include balances, portfolio value, repayment history, or private-mode data.

14\. admin\_users

Purpose:  
Stores admin users.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- email text unique not null  
\- password\_hash text  
\- role text default 'viewer'  
\- wallet\_address text  
\- totp\_secret text  
\- totp\_enabled boolean default false  
\- status text default 'pending'  
\- force\_password\_reset boolean default false  
\- invited\_by uuid references admin\_users(id)  
\- invited\_at timestamp with time zone  
\- invite\_accepted\_at timestamp with time zone  
\- last\_login\_at timestamp with time zone  
\- created\_at timestamp with time zone default now()  
\- updated\_at timestamp with time zone default now()

Status values:  
\- pending  
\- active  
\- disabled  
\- revoked  
\- expired

15\. admin\_invites

Purpose:  
Stores admin invitation records.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- email text not null  
\- role text not null default 'viewer'  
\- token\_hash text not null  
\- status text default 'pending'  
\- invited\_by uuid references admin\_users(id)  
\- expires\_at timestamp with time zone not null  
\- accepted\_at timestamp with time zone  
\- created\_at timestamp with time zone default now()

16\. admin\_sessions

Purpose:  
Stores admin sessions.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- admin\_user\_id uuid references admin\_users(id)  
\- session\_token\_hash text not null  
\- revoked boolean default false  
\- expires\_at timestamp with time zone  
\- created\_at timestamp with time zone default now()  
\- revoked\_at timestamp with time zone

17\. admin\_login\_attempts

Purpose:  
Stores admin login success/failure attempts.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- email text  
\- ip\_address text  
\- success boolean default false  
\- failure\_reason text  
\- created\_at timestamp with time zone default now()

18\. admin\_permission\_overrides

Purpose:  
Stores custom permission changes made by super\_admin.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- admin\_user\_id uuid references admin\_users(id)  
\- permission\_key text not null  
\- allowed boolean not null  
\- updated\_by uuid references admin\_users(id)  
\- updated\_at timestamp with time zone default now()

19\. admin\_audit\_logs

Purpose:  
Stores admin management and security actions.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- actor\_admin\_id uuid references admin\_users(id)  
\- action text not null  
\- target\_admin\_id uuid references admin\_users(id)  
\- metadata jsonb  
\- created\_at timestamp with time zone default now()

Audit actions:  
\- admin\_invited  
\- invite\_revoked  
\- invite\_accepted  
\- admin\_role\_changed  
\- admin\_status\_changed  
\- admin\_2fa\_reset  
\- admin\_password\_reset\_forced  
\- admin\_sessions\_revoked  
\- admin\_permission\_override\_added  
\- admin\_permission\_override\_removed  
\- admin\_login\_success  
\- admin\_login\_failed  
\- admin\_logout  
\- csv\_exported  
\- revenue\_exported  
\- bond\_exported  
\- settings\_updated

20\. app\_settings

Purpose:  
Stores editable app settings.

Fields:  
\- id uuid primary key default gen\_random\_uuid()  
\- setting\_key text unique not null  
\- setting\_value jsonb  
\- updated\_by uuid references admin\_users(id)  
\- updated\_at timestamp with time zone default now()

Use for:  
\- SNS.id referral wallet  
\- Kamino referral settings  
\- Lendra fee wallet  
\- Lendra insurance wallet  
\- supported borrow assets  
\- USDT enabled/disabled  
\- score settings  
\- maintenance mode

Create helpful database views:

1\. view\_admin\_overview\_metrics  
Return:  
\- total wallet scans  
\- unique wallets  
\- average score  
\- eligible wallets  
\- blocked wallets  
\- borrow simulations  
\- loans issued  
\- active loans  
\- repayment rate  
\- total bond volume  
\- active bonds locked  
\- bonds returned  
\- bonds liquidated  
\- total commission earned  
\- pending commission  
\- QVAC usage  
\- SNS searches  
\- SNS purchases  
\- credit cards generated  
\- X shares

2\. view\_partner\_metrics  
Return aggregate metrics by partner:  
\- partner  
\- total events  
\- unique wallets  
\- last event date

3\. view\_revenue\_summary  
Return:  
\- total commission earned  
\- pending commission  
\- paid commission  
\- failed commission  
\- commission by partner  
\- commission by month  
\- insurance inflow from liquidated bonds

4\. view\_bond\_summary  
Return:  
\- total bond volume  
\- active bonds locked  
\- bonds returned  
\- bonds partially returned  
\- bonds liquidated  
\- failed bond transactions  
\- insurance fund inflow

5\. view\_repayment\_summary  
Return:  
\- total repayments  
\- clean repayments  
\- early repayments  
\- late repayments  
\- defaults  
\- average score increase  
\- users who climbed levels

Create helper functions or server-side utility functions:

\- trackWalletScan(data)  
\- trackEligibilityCheck(data)  
\- trackLoanEvent(data)  
\- createLoan(data)  
\- updateLoanStatus(data)  
\- trackRepayment(data)  
\- updateRepaymentStats(data)  
\- trackBondEvent(data)  
\- trackPartnerEvent(data)  
\- trackCommissionEvent(data)  
\- trackSnsEvent(data)  
\- trackQvacEvent(data)  
\- trackSocialCreditCard(data)  
\- logAdminAudit(data)  
\- logLoginAttempt(data)

Event tracking requirements:

When wallet scan completes:  
\- insert into wallet\_scans  
\- upsert wallet\_profiles  
\- insert partner\_event quicknode/wallet\_scan  
When eligibility is calculated:  
\- insert into eligibility\_checks

When borrow simulation is generated:  
\- insert into loan\_events with event\_type simulation  
\- insert partner\_event kamino/borrow\_simulation

When user locks a bond:  
\- insert into bond\_events with bond\_deposited

When loan is created:  
\- insert into loans  
\- insert into loan\_events with borrowed

When repayment happens:  
\- insert into repayments  
\- update repayment\_stats  
\- update loans status  
\- insert loan\_event repaid  
\- insert bond\_event bond\_returned  
\- store score\_before, score\_after, level\_before, level\_after

When QVAC assistant is used:  
\- insert into qvac\_events  
\- insert into partner\_events qvac/score\_explained or qvac/translation\_used

When user changes language:  
\- insert into qvac\_events language\_changed

When SNS.id search happens:  
\- insert into sns\_events domain\_search  
\- insert into partner\_events sns\_id/domain\_search

When SNS.id purchase happens:  
\- insert into sns\_events domain\_registered or marketplace\_purchase  
\- insert into commission\_events sns\_id  
\- insert into partner\_events sns\_id/domain\_purchase

When Kamino referral happens:  
\- insert into commission\_events kamino\_borrow\_referral

When user generates social credit card:  
\- insert into social\_credit\_cards  
\- insert into partner\_events lendra/credit\_card\_generated

When user shares score card to X:  
\- update social\_credit\_cards shared\_to\_x  
\- insert partner\_events x/credit\_card\_shared

When cross-chain wallet is connected:  
\- update wallet\_profiles cross\_chain\_connected  
\- insert partner\_events ika/external\_wallet\_connected

When private mode is enabled:  
\- update wallet\_profiles private\_mode\_enabled  
\- insert partner\_events encrypt/private\_mode\_enabled

Security:  
\- Enable Row Level Security where appropriate.  
\- Admin reads must be server-side through protected API routes.  
\- Do not expose private admin tables to public users.  
\- Do not expose service role key to frontend.  
\- Public app can only write events through safe server-side tracking endpoints.

Seed:  
Create a script:  
npm run create-super-admin

It should:  
\- ask for email  
\- ask for password  
\- hash password  
\- create admin\_user with role super\_admin  
\- status active  
\- totp\_enabled false  
\- force 2FA setup on first login

