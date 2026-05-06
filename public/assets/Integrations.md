# **Lendra Partner Integration Documentation**

This document explains how Lendra uses partner infrastructure.

### **QuickNode**

Lendra uses QuickNode for Solana infrastructure.

Current use:  
\- Solana RPC access  
\- Wallet activity scanning support  
\- Webhook endpoint prepared at \`/api/webhooks/quicknode\`

Webhook use cases:  
\- Wallet activity updates  
\- Score recalculation  
\- Repayment confirmation  
\- Bond deposit confirmation  
\- Bond return/liquidation  
\- Telegram notification triggers

Why it matters:  
QuickNode helps Lendra move from static wallet scans to real-time credit monitoring.

### **Solflare**

Lendra uses Solflare for wallet connection and transaction signing.

Current use:  
\- Connect Solana wallet  
\- Identify user wallet  
\- Prepare future bond deposit, borrow, and repay transactions

### **SNS.id**

Lendra uses SNS.id for .sol identity.

Current use:  
\- .sol identity as a trust signal  
\- Wallet identity improvement  
\- Future in-app .sol search and purchase

Why it matters:  
A .sol identity gives wallets a stronger identity layer beyond raw addresses.

### **X OAuth**

Lendra uses X OAuth for social identity verification.

Current use:  
\- Connect X account  
\- Capture stable X user ID  
\- Check account age  
\- Check public activity  
\- Add X score to Lendra Score

Why it matters:  
Usernames can change, but X user IDs are stable. This gives Lendra a stronger identity signal for higher tiers.

### **Telegram Bot API**

Lendra uses Telegram for direct user alerts.

Current use:  
\- Pool launch waitlist confirmation  
\- Test alerts  
\- Future loan and repayment notifications

Why it matters:  
In-app notifications are weak if users are not signed in. Telegram gives Lendra a direct notification channel.

### **QVAC**

Lendra uses QVAC as the local AI explanation layer.

Current use:  
\- Lendra AI score explanation  
\- Multilingual response layer  
\- Voice and translation-ready experience  
\- Privacy-aligned user guidance

Why it matters:  
Credit scoring is confusing. Lendra AI explains the user’s score, eligibility, and next actions in simple language.

### **Ika**

Lendra uses Ika for cross-chain credit signals.

Current use:  
\- Cross-chain credit card in Trust Score  
\- External wallet signal tracking  
\- \`ika\_connected\` and \`ika\_chains\_count\` stored in wallet profile

Why it matters:  
A user’s creditworthiness may not live only on Solana. Ika helps Lendra expand credit profiles across chains.

### **Encrypt**

Lendra uses Encrypt for Private Mode.

Current use:  
\- \`encrypt\_private\_mode\` on wallet profile  
\- Private Mode toggle  
\- Privacy-first credit profile direction

Why it matters:  
Credit data is sensitive. Encrypt helps Lendra build toward private credit profiles where users can prove trust without exposing unnecessary data.

### **Kamino**

Lendra does not use Kamino as the direct borrower-side loan source.

Lendra uses Kamino for:  
\- Lending market intelligence  
\- Capital-side research  
\- Future liquidity strategy  
\- Lender-side pool planning

Why it matters:  
Kamino is collateral-based. Lendra’s borrower flow is wallet-based and bond-backed, so Kamino is positioned on the capital side.  
