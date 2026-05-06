# Lendra

Your wallet is your credit score.

Lendra is a Solana-native wallet-based credit product for active crypto users who have on-chain history but no usable credit reputation.

Users can connect a wallet, receive a Lendra Score, see their borrowing tier, simulate short-term USDC borrowing, and join the Lendra Credit Pool waitlist.

## Problem

Active crypto users in emerging markets can have years of wallet activity, stablecoin usage, and DeFi participation, but no recognized credit profile.

Banks do not use their on-chain behavior, and most DeFi lending still requires overcollateralization. This means a user may have real wallet history but still cannot access small short-term liquidity.

## Target Users

Lendra is built for:

- Active Solana wallet users
- Stablecoin users in Nigeria and West Africa
- DeFi-native users who need small short-term liquidity
- Wallets with real activity but no traditional credit profile
- Future protocols that need wallet credit intelligence

## Core Use Cases

- Scan wallet activity
- Generate a Lendra Score
- See borrowing tier and eligibility gates
- Simulate USDC borrowing
- Calculate fixed term loan fees
- Calculate 30% bond requirement
- Join the Lendra Credit Pool waitlist
- Receive Telegram alerts
- Generate a shareable social credit card
- Use Lendra AI to understand score and next steps

## How It Works

1. User connects Solflare wallet.
2. Lendra scans wallet activity.
3. Lendra calculates a score out of 1000.
4. User sees their borrowing tier.
5. User simulates a loan from the Lendra Credit Pool.
6. User sees required bond, fee, total repayment, and term.
7. User joins the pool launch waitlist.
8. User can receive Telegram alerts when the pool goes live.

## Lendra Score

Lendra Score is out of 1000.

Score groups:

- Base Score: 100
- Wallet Activity Points: 290
- Earned Trust Signals: 610

Earned Trust Signals include:

- Repayment History
- X Verification
- Cross-Chain Credit
- .sol Identity via SNS.id
- Superteam PoW
- Credit Maturity Bonus
- Borrow Growth Bonus

## Borrowing Tiers

| Level | Tier | Loan Limit |
|---|---|---|
| 1 | Starter | $10 |
| 2 | Bronze | $25 |
| 3 | Silver | $50 |
| 4 | Gold | $100 |
| 5 | Platinum | $200 |
| 6 | Diamond | $400 |

Level 5 and Level 6 require stronger identity verification through X OAuth.

## Loan Terms and Fees

Lendra uses fixed short-term loan fees instead of APR.

Supported terms:

- 7 days
- 14 days
- 30 days

The fee decreases as the user climbs tiers.

Example:

- Starter, 14 days: 15%
- Diamond, 14 days: 6%

Bond rule:

- Bond = 30% of loan amount
- Bond is not revenue
- Bond is returned after clean repayment

## Lendra Credit Pool

Lendra Credit Pool is currently in beta/simulation mode.

The current MVP lets users simulate borrowing and join the pool launch waitlist. The first live version will use small admin-funded USDC liquidity before expanding into a larger credit pool.

Lendra does not position Kamino as the borrower-side loan engine. Kamino is used for capital-side lending market intelligence and future liquidity strategy.

## Partner Integrations

### QuickNode

Lendra uses QuickNode for Solana RPC, wallet activity infrastructure, and webhook-ready monitoring.

Planned webhook use cases:

- Wallet activity updates
- Score recalculation triggers
- Bond deposit detection
- Repayment detection
- Telegram alert triggers

### Solflare

Lendra uses Solflare Wallet Adapter for wallet connection and future transaction signing.

### SNS.id

Lendra integrates SNS.id for .sol identity signals. Users can search or connect .sol identity as part of their trust profile.

### X OAuth

Lendra uses X OAuth to capture stable X identity signals.

No X DM OTP is used.

X score is based on:

- OAuth connection
- Stable X user ID
- Account age
- Public activity

### Telegram

Lendra uses Telegram Bot API for user alerts.

Examples:

- Pool launch notification
- Score change alert
- Repayment reminder
- Loan status update
- Bond returned alert

### QVAC

Lendra uses QVAC as the local AI layer for multilingual score explanation, voice, translation, and privacy-aware guidance.

Lendra AI helps users understand:

- Lendra Score
- Eligibility
- Borrowing power
- Earned Trust Signals
- Bond requirements
- Next unlock steps

### Ika

Lendra uses Ika for cross-chain credit signals. Users can connect external wallet activity to strengthen their Lendra trust profile.

### Encrypt

Lendra uses Encrypt for private mode. Sensitive credit and loan data can be protected so users can build credit without exposing unnecessary personal financial history.

### Kamino

Kamino is used for capital-side research and future lender-side strategy, not as the direct borrower-side loan source.

## How Lendra Uses Encrypt and Ika

### Encrypt

Encrypt supports Lendra Private Mode.

Private Mode is designed to protect sensitive user data such as wallet-linked credit status, loan history, and trust profile details.

In the MVP, Private Mode is represented in the app as an opt-in privacy layer.

### Ika

Ika supports cross-chain credit.

Lendra uses Ika to let users import external wallet activity from chains like Ethereum or Bitcoin, increasing the depth of their credit profile beyond one Solana wallet.

## Tech Stack

- Solana
- Solflare Wallet Adapter
- QuickNode
- Supabase
- Vite
- React
- TypeScript
- Tailwind CSS
- Eitherway
- Telegram Bot API
- X OAuth
- SNS.id
- QVAC
- Ika
- Encrypt
- Kamino
- Vercel

## Build Instructions

```bash
npm install
npm run dev# Lendra

```

## Environment Variables

NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

UPSTASH_REDIS_URL=
UPSTASH_REDIS_TOKEN=

X_CLIENT_ID=
X_CLIENT_SECRET=
X_REDIRECT_URI=
X_SCOPES=

TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_USERNAME=
TELEGRAM_WEBHOOK_SECRET=

QUICKNODE_WEBHOOK_SECRET=

## Test Instructions

Manual test flow:

1. Connect wallet
2. Run Trust Score scan
3. Open Trust Score page
4. Simulate a loan
5. Change term between 7, 14, and 30 days
6. Confirm bond and fee calculations
7. Join pool launch waitlist
8. Generate social credit card
9. Open Lendra AI
10. Enable Telegram alerts

## Frontend Link

https://lendra.finance

## Demo Video

soon demo video link here

## Status

Lendra is currently in beta/simulation mode. The Lendra Credit Pool is not yet live for real borrowing.


---

# 3. Partner integration documentation

```text
/public/assets/Integrations.md
