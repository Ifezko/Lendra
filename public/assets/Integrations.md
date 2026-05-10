# Lendra Partner Integration Documentation

This document explains how Lendra uses partner infrastructure.

## QuickNode

Lendra uses QuickNode as the Solana infrastructure layer.

Current use:

- QuickNode HTTP RPC for wallet scanning and score input data
- QuickNode WSS for future live wallet activity monitoring
- QuickNode webhook receiver at `/api/webhooks/quicknode`
- Event-triggered architecture for future score updates and Telegram alerts

Webhook use cases:

- Wallet activity updates
- Score recalculation
- Repayment confirmation
- Bond deposit confirmation
- Bond return/liquidation
- Telegram notification triggers

Why it matters:

QuickNode helps Lendra move from static wallet scans to real-time credit monitoring.

## Solflare

Lendra uses Solflare for wallet connection and future transaction signing.

Current use:

- Connect Solana wallet
- Identify user wallet
- Prepare future bond deposit, borrow, and repay transactions

## SNS.id

Lendra uses SNS.id for .sol identity.

Current use:

- .sol identity as a trust signal
- Wallet identity improvement
- Future in-app .sol search and purchase

Why it matters:

A .sol identity gives wallets a stronger identity layer beyond raw addresses.

## X OAuth

Lendra uses X OAuth for social identity verification.

Current use:

- Connect X account
- Capture stable X user ID
- Check account age
- Check public activity
- Add X score to Lendra Score

Why it matters:

Usernames can change, but X user IDs are stable. This gives Lendra a stronger identity signal for higher tiers.

## Telegram Bot API

Lendra uses Telegram for direct user alerts.

Current use:

- Pool launch waitlist confirmation
- Test alerts
- Future loan and repayment notifications

Why it matters:

In-app notifications are weak if users are not signed in. Telegram gives Lendra a direct notification channel.

## QVAC

Lendra uses QVAC as the local AI explanation layer.

Current use:

- Lendra AI score explanation
- Multilingual response layer
- Voice and translation-ready experience
- Privacy-aligned user guidance

Why it matters:

Credit scoring is confusing. Lendra AI explains the user’s score, eligibility, and next actions in simple language.

## Ika

Lendra uses Ika as the Cross-Chain Credit integration layer.

Current implementation:

- User enters an Ethereum wallet address
- Lendra validates the address
- Lendra creates a Solana devnet memo proof transaction
- The connected wallet signs the transaction
- Lendra stores the devnet transaction signature and explorer link in Supabase
- The user’s profile is updated with `ika_connected = true` and `ika_chains_count = 1`

This is a devnet/pre-alpha proof integration used to demonstrate cross-chain credit signal import.

## Encrypt

Lendra uses Encrypt as the Private Mode integration layer.

Current implementation:

- User enables Private Mode from the app
- Lendra creates a Solana devnet memo proof transaction
- The connected wallet signs the transaction
- Lendra stores the devnet transaction signature and explorer link in Supabase
- The user’s wallet profile is updated with `encrypt_private_mode = true`

This is a devnet/pre-alpha proof integration. Lendra does not store sensitive credit or loan data in the memo.

### Devnet Funding Note

Devnet proof transactions require the connected Solana wallet to have devnet SOL. If the wallet has no devnet SOL, Solana may return:

“Attempt to debit an account but found no record of a prior credit.”

Users can fund their connected Solana wallet using a Solana devnet faucet.

## Kamino

Lendra does not use Kamino as the direct borrower-side loan source.

Lendra uses Kamino for:

- Lending market intelligence
- Capital-side research
- Future liquidity strategy
- Lender-side pool planning

Why it matters:

Kamino is collateral-based. Lendra’s borrower flow is wallet-based and bond-backed, so Kamino is positioned on the capital side.
