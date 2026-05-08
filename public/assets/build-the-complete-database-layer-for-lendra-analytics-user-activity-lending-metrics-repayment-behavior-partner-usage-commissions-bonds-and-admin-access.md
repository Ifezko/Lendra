Build the complete database layer for Lendra analytics, user activity, lending metrics, repayment behavior, partner usage, commissions, bonds, and admin access.

Purpose:  
This database stores and displays wallet scans, credit scores, borrowing behavior, repayment behavior, bond deposits, partner commissions, and partner integration usage. It should help the founder track usage and help future partners understand traction.

Use:  
\- Supabase PostgreSQL for persistent data  
\- Upstash Redis only for temporary/session/state data  
\- Server-side writes only for sensitive events  
\- No sensitive keys exposed to frontend

Core product rules:  
\- Lendra score starts from base score 100  
\- Max score is 1000  
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

Important:  
Use SNS.id only in product copy.  
Do not use Bonfida branding in the UI.

12\. qvac\_events

Purpose:  
Tracks Lendra AI usage and language/voice behavior.

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

Update Lendra database schema for the recent product changes.

Use Supabase PostgreSQL.

Do not drop existing data.  
Use ALTER TABLE IF EXISTS where possible.  
Create missing tables only if they do not already exist.

Product rules:  
\- Max Lendra Score is 1000  
\- Base score is 100  
\- X max score is 100  
\- Borrow Growth Bonus max is 100  
\- Credit Maturity Bonus max is 110  
\- Bond is 30% of selected loan amount  
\- Level names are Crayfish, Shrimp, Barracuda, Dolphin, Shark, Whale  
\- Level 5 and 6 require x\_verification\_score \>= 65  
\- Telegram alerts and QuickNode webhooks are supported  
\- Product brand is Lendra  
\- Domain is https://lendra.finance

Update wallet\_profiles:  
Add if missing:  
\- sol\_domain text  
\- has\_sol\_domain boolean default false  
\- x\_user\_id text  
\- x\_username text  
\- x\_display\_name text  
\- x\_profile\_image text  
\- x\_account\_created\_at timestamp with time zone  
\- x\_account\_age\_days numeric  
\- x\_posts\_count int default 0  
\- x\_followers\_count int default 0  
\- x\_following\_count int default 0  
\- x\_connected boolean default false  
\- x\_connected\_at timestamp with time zone  
\- x\_verification\_score numeric default 0  
\- superteam\_verified boolean default false  
\- cross\_chain\_connected boolean default false  
\- private\_mode\_enabled boolean default false  
\- telegram\_chat\_id text  
\- telegram\_username text  
\- telegram\_connected boolean default false  
\- telegram\_connected\_at timestamp with time zone  
\- telegram\_alerts\_enabled boolean default false  
\- telegram\_score\_alerts\_enabled boolean default true  
\- telegram\_loan\_alerts\_enabled boolean default true  
\- telegram\_bond\_alerts\_enabled boolean default true  
\- telegram\_repayment\_alerts\_enabled boolean default true  
\- telegram\_level\_alerts\_enabled boolean default true  
\- updated\_at timestamp with time zone default now()

Update wallet\_scans:  
Add if missing:  
\- score numeric default 100  
\- max\_score numeric default 1000  
\- tier text  
\- loan\_level int  
\- level\_name text  
\- eligible boolean default false  
\- eligibility\_status text  
\- base\_score numeric default 100  
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
\- credit\_maturity\_points numeric default 0  
\- borrow\_growth\_points numeric default 0  
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
\- x\_verification\_score numeric default 0  
\- superteam\_verified boolean default false  
\- cross\_chain\_connected boolean default false  
\- qvac\_used boolean default false  
\- selected\_language text default 'English'  
\- created\_at timestamp with time zone default now()

Create/update eligibility\_checks:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- scan\_id uuid references wallet\_scans(id)  
\- score\_passed boolean default false  
\- spend\_gate\_passed boolean default false  
\- max\_single\_tx\_gate\_passed boolean default false  
\- active\_loan\_gate\_passed boolean default true  
\- repayment\_requirement\_passed boolean default false  
\- level\_requirement\_passed boolean default false  
\- x\_requirement\_passed boolean default false  
\- eligible\_level int default 0  
\- eligible\_level\_name text  
\- eligible\_amount numeric default 0  
\- borrow\_asset text default 'USDC'  
\- blocked\_reason text  
\- next\_unlock\_hint text  
\- created\_at timestamp with time zone default now()

Create/update loans:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- borrow\_asset text default 'USDC'  
\- loan\_amount numeric not null  
\- apr numeric not null  
\- interest\_amount numeric default 0  
\- total\_repayment numeric default 0  
\- bond\_amount numeric default 0  
\- bond\_percentage numeric default 30  
\- loan\_level int  
\- level\_name text  
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

Create/update loan\_events:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- event\_type text not null  
\- borrow\_asset text default 'USDC'  
\- loan\_amount numeric default 0  
\- apr numeric default 0  
\- interest\_amount numeric default 0  
\- total\_repayment numeric default 0  
\- bond\_amount numeric default 0  
\- bond\_percentage numeric default 30  
\- loan\_level int  
\- level\_name text  
\- loan\_purpose\_text text  
\- loan\_purpose\_tags text\[\]  
\- status text default 'simulated'  
\- due\_date timestamp with time zone  
\- transaction\_hash text  
\- created\_at timestamp with time zone default now()

Create/update repayments:  
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
\- borrow\_growth\_points\_awarded numeric default 0  
\- level\_before int  
\- level\_after int  
\- created\_at timestamp with time zone default now()

Create/update repayment\_stats:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text unique not null  
\- clean\_repayments int default 0  
\- early\_repayments int default 0  
\- late\_repayments int default 0  
\- defaults int default 0  
\- repayment\_score numeric default 0  
\- current\_level int default 0  
\- current\_level\_name text  
\- highest\_level\_unlocked int default 0  
\- first\_borrow\_amount numeric  
\- highest\_borrow\_amount\_repaid numeric  
\- qualifying\_higher\_borrow\_repayments int default 0  
\- borrow\_growth\_points numeric default 0  
\- last\_repayment\_at timestamp with time zone  
\- created\_at timestamp with time zone default now()  
\- updated\_at timestamp with time zone default now()

Create/update bond\_events:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- loan\_id uuid references loans(id)  
\- event\_type text not null  
\- loan\_amount numeric  
\- bond\_percentage numeric default 30  
\- bond\_amount\_usd numeric default 0  
\- borrow\_asset text default 'USDC'  
\- bond\_token text default 'USDC'  
\- loan\_level int  
\- level\_name text  
\- escrow\_provider text default 'streamflow'  
\- escrow\_account text  
\- status text default 'locked'  
\- tx\_hash text  
\- metadata jsonb  
\- created\_at timestamp with time zone default now()

Create/update partner\_events:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text  
\- partner text not null  
\- event\_type text not null  
\- metadata jsonb  
\- created\_at timestamp with time zone default now()

Create/update commission\_events:  
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

Create/update sns\_events:  
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

Create/update qvac\_events:  
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

Create/update social\_credit\_cards:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- sol\_domain text  
\- score numeric  
\- max\_score numeric default 1000  
\- tier text  
\- loan\_level int  
\- level\_name text  
\- image\_url text  
\- shared\_to\_x boolean default false  
\- x\_share\_url text  
\- private\_mode\_confirmed boolean default false  
\- created\_at timestamp with time zone default now()

Create/update notification\_events:  
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

Create/update score\_change\_events:  
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

Create/update x\_verification\_events:  
\- id uuid primary key default gen\_random\_uuid()  
\- wallet\_address text not null  
\- x\_user\_id text  
\- event\_type text not null  
\- status text default 'pending'  
\- points\_awarded numeric default 0  
\- metadata jsonb  
\- created\_at timestamp with time zone default now()

Update app\_settings:  
Use for:  
\- SNS.id referral wallet  
\- Kamino referral settings  
\- Lendra fee wallet  
\- Lendra insurance wallet  
\- supported borrow assets  
\- USDT enabled/disabled  
\- score settings  
\- Telegram settings  
\- QuickNode settings  
\- maintenance mode

Add or update views:  
\- view\_admin\_overview\_metrics  
\- view\_partner\_metrics  
\- view\_revenue\_summary  
\- view\_bond\_summary  
\- view\_repayment\_summary  
\- view\_notification\_summary  
\- view\_x\_verification\_summary  
\- view\_social\_card\_summary

