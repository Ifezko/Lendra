import { useState, useRef, useCallback } from 'react';
import { SCORE_FACTORS, LOAN_LEVELS, calculateBond, FEE_SCHEDULE } from './useCreditScore';

// ─── Unified Lendra AI Copilot ───────────────────────────────────────
// Fully multilingual. Responses built natively in selected language.
// Runs 100% on-device. Zero API calls.

const FACTOR_META = {};
Object.entries(SCORE_FACTORS).forEach(([key, f]) => {
  FACTOR_META[key] = { name: f.label, max: f.max };
});

const WALLET_ACTIVITY_KEYS = ['age', 'volume', 'consistency', 'diversity', 'portfolio'];
const EARNED_TRUST_KEYS = ['repayment', 'xVerification', 'crossChain', 'solIdentity', 'superteam', 'creditMaturity', 'borrowGrowth'];
const WALLET_ACTIVITY_MAX = WALLET_ACTIVITY_KEYS.reduce((s, k) => s + SCORE_FACTORS[k].max, 0);
const EARNED_TRUST_MAX = EARNED_TRUST_KEYS.reduce((s, k) => s + SCORE_FACTORS[k].max, 0);

// ─── Centralized Label Translations ────────────────────────────────
const FACTOR_LABELS = {
  en: { age: 'Wallet Age', volume: 'Transaction Volume', consistency: 'Monthly Consistency', diversity: 'Protocol Diversity', portfolio: 'Portfolio Value', repayment: 'Repayment History', xVerification: 'X Verification', crossChain: 'Cross-Chain Credit', solIdentity: '.sol Identity', superteam: 'Superteam PoW', creditMaturity: 'Credit Maturity Bonus', borrowGrowth: 'Borrow Growth Bonus' },
  es: { age: 'Edad de la billetera', volume: 'Volumen de transacciones', consistency: 'Consistencia mensual', diversity: 'Diversidad de protocolos', portfolio: 'Valor de cartera', repayment: 'Historial de pagos', xVerification: 'Verificación de X', crossChain: 'Crédito cross-chain', solIdentity: 'Identidad .sol', superteam: 'Superteam PoW', creditMaturity: 'Madurez crediticia', borrowGrowth: 'Crecimiento de préstamos' },
  fr: { age: 'Âge du portefeuille', volume: 'Volume de transactions', consistency: 'Consistance mensuelle', diversity: 'Diversité de protocoles', portfolio: 'Valeur du portefeuille', repayment: 'Historique de remboursement', xVerification: 'Vérification X', crossChain: 'Crédit cross-chain', solIdentity: 'Identité .sol', superteam: 'Superteam PoW', creditMaturity: 'Maturité de crédit', borrowGrowth: "Croissance d'emprunt" },
  ar: { age: 'عمر المحفظة', volume: 'حجم المعاملات', consistency: 'الاتساق الشهري', diversity: 'تنوع البروتوكولات', portfolio: 'قيمة المحفظة', repayment: 'سجل السداد', xVerification: 'تحقق X', crossChain: 'ائتمان cross-chain', solIdentity: 'هوية .sol', superteam: 'Superteam PoW', creditMaturity: 'نضج الائتمان', borrowGrowth: 'نمو الاقتراض' },
  zh: { age: '钱包年龄', volume: '交易量', consistency: '月度一致性', diversity: '协议多样性', portfolio: '投资组合价值', repayment: '还款记录', xVerification: 'X 验证', crossChain: '跨链信用', solIdentity: '.sol 身份', superteam: 'Superteam PoW', creditMaturity: '信用成熟度', borrowGrowth: '借贷增长' },
  pcm: { age: 'Wallet Age', volume: 'Transaction Volume', consistency: 'Monthly Consistency', diversity: 'Protocol Diversity', portfolio: 'Portfolio Value', repayment: 'Repayment History', xVerification: 'X Verification', crossChain: 'Cross-Chain Credit', solIdentity: '.sol Identity', superteam: 'Superteam PoW', creditMaturity: 'Credit Maturity', borrowGrowth: 'Borrow Growth' },
  yo: { age: 'Ọjọ́ àpamọ́wọ́', volume: 'Iye àwọn ìdúnàádúrà', consistency: 'Ìṣọ̀kan oṣooṣù', diversity: 'Ìyàtọ̀ àwọn ìlànà', portfolio: 'Iye ohun-ìní', repayment: 'Ìtàn ìsanpadà', xVerification: 'Ìjẹ́rìísí X', crossChain: 'Ìgbèsè cross-chain', solIdentity: 'Ìdánimọ̀ .sol', superteam: 'Superteam PoW', creditMaturity: 'Ìdàgbàsókè ìgbèsè', borrowGrowth: 'Ìdàgbà àyíyá' },
  ig: { age: 'Afọ akpa ego', volume: 'Ọnụọgụ azụmahịa', consistency: 'Ịdị n\'otu ọnwa', diversity: 'Ụdị protocol dị iche', portfolio: 'Uru nke akpa', repayment: 'Akụkọ ịkwụ ụgwọ', xVerification: 'Nkwenye X', crossChain: 'Ụgwọ cross-chain', solIdentity: 'Njirimara .sol', superteam: 'Superteam PoW', creditMaturity: 'Ịto oke ụgwọ', borrowGrowth: 'Uto ọgbara ego' },
  ha: { age: 'Shekarun walat', volume: 'Adadin mu\'amala', consistency: 'Daidaituwar wata-wata', diversity: 'Bambancin ka\'idoji', portfolio: 'Darajar jaka', repayment: 'Tarihin biyan bashi', xVerification: 'Tabbatar da X', crossChain: 'Bashi na cross-chain', solIdentity: 'Shaida .sol', superteam: 'Superteam PoW', creditMaturity: 'Girma bashi', borrowGrowth: 'Haɓaka aro' },
};

const STRENGTH_LABELS = {
  en: { strong: 'strong', moderate: 'moderate', weak: 'weak', veryWeak: 'very weak' },
  es: { strong: 'fuerte', moderate: 'moderado', weak: 'débil', veryWeak: 'muy débil' },
  fr: { strong: 'fort', moderate: 'modéré', weak: 'faible', veryWeak: 'très faible' },
  ar: { strong: 'قوي', moderate: 'متوسط', weak: 'ضعيف', veryWeak: 'ضعيف جداً' },
  zh: { strong: '强', moderate: '中等', weak: '弱', veryWeak: '非常弱' },
  pcm: { strong: 'strong', moderate: 'so-so', weak: 'weak', veryWeak: 'very weak' },
  yo: { strong: 'lágbára', moderate: 'ìwọ̀ntúnwọ̀nsí', weak: 'aláìlágbára', veryWeak: 'aláìlágbára púpọ̀' },
  ig: { strong: 'siri ike', moderate: 'ọ dị nta', weak: 'adịghị ike', veryWeak: 'adịghị ike nke ukwuu' },
  ha: { strong: 'ƙarfi', moderate: 'matsakaici', weak: 'raunana', veryWeak: 'raunana ƙwarai' },
};

// Sentence templates per language
const TEMPLATES = {
  en: {
    scoreIntro: (s, tier) => `Your Lendra Score is **${s}**/1000. You are in the ${tier} tier.`,
    scoreStructure: 'Score Structure', baseScore: 'Base Score', walletActivity: 'Wallet Activity Points', earnedTrust: 'Earned Trust Signals',
    breakdown: 'Score Breakdown', topImprovements: 'Top improvements', borrowing: 'Borrowing', bond: 'Bond', nextStepLabel: 'Next step',
    excellentScore: (lvl, label, amt) => `Excellent score. You qualify for Level ${lvl} (${label}) — up to ${amt} USDC.`,
    goodScore: (lvl, amt) => `Good score. You qualify for Level ${lvl} — up to ${amt} USDC.`,
    qualifyFor: (lvl, amt) => `You qualify for Level ${lvl} — up to ${amt} USDC.`,
    meetSpendGate: 'Meet the spend gate and other requirements to start borrowing.',
    scoreBelowThreshold: (pts) => `Score is below the ${pts} borrowing threshold. Focus on improvements below.`,
    bondReturned: (amt) => `Bond: ~${amt} (30%), returned on repayment.`,
    toUnlock: (label, score) => `To unlock ${label}: score ${score}+`,
    cleanReps: (n) => `${n} clean repayments`,
    loanFeeLabel: 'Loan Fee', termsInfo: 'Lendra supports 7-day, 14-day, and 30-day terms. Shorter terms have lower fees, longer terms cost more because pool risk is higher.',
    bondNotFee: 'No. The bond is not a fee. It is returned after clean repayment.',
    lendraRevenue: 'Lendra earns from loan fees when borrowers repay. Bonds are not revenue. Bonds are held as borrower commitment and returned after clean repayment.',
    scoreHeldBack: (s) => `Your score of ${s} is held back by:`, focusOnThese: 'Focus on these for the biggest gains.',
    youAlsoHave: (pts, max) => `You also have ${pts}/${max} Earned Trust Signals — connecting identity signals and building credit history will help significantly.`,
    yourPower: (label, amt) => `You're at **${label}**, so your borrowing power is **${amt} USDC**.`,
    noTrustYet: "You haven't earned trust signals yet. Quick wins:", connectX: 'Connect your X account', registerSol: 'Register a .sol name through SNS.id', addCrossChain: 'Add cross-chain credit through Ika',
    loanLevelsTitle: 'Lendra Loan Levels', youAreHere: '← **You are here**',
    eligCheck: 'Borrowing Eligibility', scoreCheck: (ok, s) => `**Score:** ${ok ? '✅' : '❌'} 350+ (yours: ${s})`, spendCheck: (ok, g, s) => `**Spend:** ${ok ? '✅' : '❌'} ${g}+ in 90d (yours: ${s})`, loanCheck: (ok) => `**Active loan:** ${ok ? '✅' : '❌'} None`,
    eligResult: (label, amt) => `**Result:** Eligible for ${label} — ${amt} USDC.`, notEligResult: (r) => `**Not yet eligible.** ${r}.`, needPts: (n) => `need ${n} more pts`, needSpend: (n) => `need ${n} more spend`,
    yourTopAreas: 'Your top areas to improve', scoreTooLow: (s) => `Your score is ${s}. To unlock borrowing (350+):`, useMoreProtocols: 'Use more protocols (Jupiter, Raydium, Marinade)',
    youreEligible: (amt) => `You're eligible to borrow up to ${amt} USDC.\n\n`, toReach: (label) => `To reach ${label}:`, earnMore: (g) => `Earn ${g} more points`, completeMore: (n) => `Complete ${n} more clean repayment(s)`,
    connectTrust: (pts, max) => `Connect trust signals to grow your Earned Trust Signals (${pts}/${max}).`,
    scoreIs: (s) => `Score ${s} `, below350: (n) => `is below 350 minimum. You need ${n} more points.`, meetsThreshold: (sp) => `meets threshold, but you need to meet the spend gate. Current: ${sp}.`,
    spendAbove: (s, sp) => `Score is ${s} (above 350). Meet the spend gate to start borrowing.\n\nCurrent 90d spend: ${sp}.`,
    morePointsShort: (n) => `${n} more points`,
    defaultFallback: (s, tier, wa, waMax, et, etMax, can, label, amt) => `Your Lendra Score is **${s}** (${tier}).\n\nBase: 100 | Activity: ${wa}/${waMax} | Earned Trust: ${et}/${etMax}\n\n${can ? `Eligible to borrow up to ${amt} USDC (${label}).` : 'Complete unlock steps to borrow.'}\n\nAsk about: **score**, **borrow**, **bond**, **levels**, **Earned Trust Signals**, **X verification**, **SNS.id**, **Ika**, **QVAC**, **Encrypt**, or **how to improve**.`,
  },
  es: {
    scoreIntro: (s, tier) => `Tu puntuación Lendra es **${s}**/1000. Estás en el nivel ${tier}.`,
    scoreStructure: 'Estructura de la puntuación', baseScore: 'Puntuación base', walletActivity: 'Puntos de actividad', earnedTrust: 'Señales de confianza ganadas',
    breakdown: 'Desglose', topImprovements: 'Mejoras principales', borrowing: 'Préstamo', bond: 'Depósito', nextStepLabel: 'Siguiente paso',
    excellentScore: (lvl, label, amt) => `Puntuación excelente. Calificas para el Nivel ${lvl} (${label}) — hasta ${amt} USDC.`,
    goodScore: (lvl, amt) => `Buena puntuación. Calificas para el Nivel ${lvl} — hasta ${amt} USDC.`,
    qualifyFor: (lvl, amt) => `Calificas para el Nivel ${lvl} — hasta ${amt} USDC.`,
    meetSpendGate: 'Cumple con el umbral de gasto y otros requisitos para empezar a pedir préstamos.',
    scoreBelowThreshold: (pts) => `La puntuación está por debajo del umbral de préstamo de ${pts}. Enfócate en las mejoras a continuación.`,
    bondReturned: (amt) => `Depósito: ~${amt} (30%), devuelto tras el pago.`,
    toUnlock: (label, score) => `Para desbloquear ${label}: puntuación ${score}+`,
    cleanReps: (n) => `${n} pagos limpios`,
    loanFeeLabel: 'Comisión del préstamo', termsInfo: 'Lendra ofrece plazos de 7, 14 y 30 días. Los plazos más cortos tienen comisiones más bajas, los más largos cuestan más porque el riesgo del pool es mayor.',
    bondNotFee: 'No. El depósito no es una comisión. Se devuelve tras el pago limpio.',
    lendraRevenue: 'Lendra gana de las comisiones de préstamo cuando los prestatarios pagan. Los depósitos no son ingresos. Se devuelven tras el pago limpio.',
    scoreHeldBack: (s) => `Tu puntuación de ${s} está limitada por:`, focusOnThese: 'Enfócate en estos para los mayores avances.',
    youAlsoHave: (pts, max) => `También tienes ${pts}/${max} señales de confianza ganadas — conectar señales de identidad y construir historial crediticio ayudará significativamente.`,
    yourPower: (label, amt) => `Estás en **${label}**, tu capacidad de préstamo es **${amt} USDC**.`,
    noTrustYet: 'Aún no has ganado señales de confianza. Acciones rápidas:', connectX: 'Conecta tu cuenta de X', registerSol: 'Registra un nombre .sol a través de SNS.id', addCrossChain: 'Añade crédito cross-chain a través de Ika',
    loanLevelsTitle: 'Niveles de préstamo Lendra', youAreHere: '← **Estás aquí**',
    eligCheck: 'Elegibilidad para préstamos', scoreCheck: (ok, s) => `**Puntuación:** ${ok ? '✅' : '❌'} 350+ (la tuya: ${s})`, spendCheck: (ok, g, s) => `**Gasto:** ${ok ? '✅' : '❌'} ${g}+ en 90d (el tuyo: ${s})`, loanCheck: (ok) => `**Préstamo activo:** ${ok ? '✅' : '❌'} Ninguno`,
    eligResult: (label, amt) => `**Resultado:** Elegible para ${label} — ${amt} USDC.`, notEligResult: (r) => `**Aún no elegible.** ${r}.`, needPts: (n) => `necesitas ${n} pts más`, needSpend: (n) => `necesitas ${n} más de gasto`,
    yourTopAreas: 'Tus principales áreas de mejora', scoreTooLow: (s) => `Tu puntuación es ${s}. Para desbloquear préstamos (350+):`, useMoreProtocols: 'Usa más protocolos (Jupiter, Raydium, Marinade)',
    youreEligible: (amt) => `Eres elegible para pedir hasta ${amt} USDC.\n\n`, toReach: (label) => `Para alcanzar ${label}:`, earnMore: (g) => `Gana ${g} puntos más`, completeMore: (n) => `Completa ${n} pago(s) limpio(s) más`,
    connectTrust: (pts, max) => `Conecta señales de confianza para crecer tus señales (${pts}/${max}).`,
    scoreIs: (s) => `Puntuación ${s} `, below350: (n) => `está por debajo del mínimo de 350. Necesitas ${n} puntos más.`, meetsThreshold: (sp) => `alcanza el umbral, pero necesitas cumplir el umbral de gasto. Actual: ${sp}.`,
    spendAbove: (s, sp) => `La puntuación es ${s} (por encima de 350). Cumple el umbral de gasto para empezar a pedir prestado.\n\nGasto 90 días actual: ${sp}.`,
    morePointsShort: (n) => `${n} puntos más`,
    defaultFallback: (s, tier, wa, waMax, et, etMax, can, label, amt) => `Tu puntuación Lendra es **${s}** (${tier}).\n\nBase: 100 | Actividad: ${wa}/${waMax} | Confianza: ${et}/${etMax}\n\n${can ? `Elegible para pedir hasta ${amt} USDC (${label}).` : 'Completa los pasos de desbloqueo para pedir prestado.'}\n\nPregunta sobre: **puntuación**, **préstamo**, **depósito**, **niveles**, **señales de confianza**, o **cómo mejorar**.`,
  },
  fr: {
    scoreIntro: (s, tier) => `Votre score Lendra est de **${s}**/1000. Vous êtes au niveau ${tier}.`,
    scoreStructure: 'Structure du score', baseScore: 'Score de base', walletActivity: "Points d'activité", earnedTrust: 'Signaux de confiance gagnés',
    breakdown: 'Détail du score', topImprovements: 'Améliorations principales', borrowing: 'Emprunt', bond: 'Dépôt', nextStepLabel: 'Prochaine étape',
    excellentScore: (lvl, label, amt) => `Excellent score. Éligible au Niveau ${lvl} (${label}) — jusqu'à ${amt} USDC.`,
    goodScore: (lvl, amt) => `Bon score. Éligible au Niveau ${lvl} — jusqu'à ${amt} USDC.`,
    qualifyFor: (lvl, amt) => `Éligible au Niveau ${lvl} — jusqu'à ${amt} USDC.`,
    meetSpendGate: "Atteignez le seuil de dépense et autres conditions pour emprunter.",
    scoreBelowThreshold: (pts) => `Le score est en dessous du seuil d'emprunt de ${pts}. Concentrez-vous sur les améliorations.`,
    bondReturned: (amt) => `Dépôt : ~${amt} (30%), retourné après remboursement.`,
    toUnlock: (label, score) => `Pour débloquer ${label} : score ${score}+`,
    cleanReps: (n) => `${n} remboursements propres`,
    loanFeeLabel: 'Frais de prêt', termsInfo: 'Lendra propose des termes de 7, 14 et 30 jours. Les termes plus courts ont des frais plus bas, les plus longs coûtent plus.',
    bondNotFee: "Non. Le dépôt n'est pas des frais. Il est retourné après un remboursement propre.",
    scoreHeldBack: (s) => `Votre score de ${s} est limité par :`, focusOnThese: 'Concentrez-vous sur ces points.',
    noTrustYet: "Vous n'avez pas encore gagné de signaux de confiance. Actions rapides :", connectX: 'Connectez votre compte X', registerSol: 'Enregistrez un nom .sol via SNS.id', addCrossChain: 'Ajoutez du crédit cross-chain via Ika',
    loanLevelsTitle: 'Niveaux de prêt Lendra', youAreHere: '← **Vous êtes ici**',
    yourTopAreas: 'Vos principaux axes d\'amélioration', scoreTooLow: (s) => `Votre score est de ${s}. Pour débloquer les emprunts (350+) :`, useMoreProtocols: 'Utilisez plus de protocoles (Jupiter, Raydium, Marinade)',
    yourPower: (label, amt) => `Vous êtes au niveau **${label}**, capacité d'emprunt : **${amt} USDC**.`,
    defaultFallback: (s, tier, wa, waMax, et, etMax, can, label, amt) => `Votre score Lendra est de **${s}** (${tier}).\n\nBase : 100 | Activité : ${wa}/${waMax} | Confiance : ${et}/${etMax}\n\n${can ? `Éligible pour emprunter jusqu'à ${amt} USDC (${label}).` : 'Complétez les étapes pour emprunter.'}\n\nDemandez : **score**, **emprunt**, **dépôt**, **niveaux**, **signaux de confiance**, ou **comment améliorer**.`,
  },
  ar: {
    scoreIntro: (s, tier) => `نتيجة Lendra الخاصة بك هي **${s}**/1000. أنت في مستوى ${tier}.`,
    scoreStructure: 'هيكل النتيجة', baseScore: 'النتيجة الأساسية', walletActivity: 'نقاط نشاط المحفظة', earnedTrust: 'إشارات الثقة المكتسبة',
    breakdown: 'تفصيل النتيجة', topImprovements: 'أهم التحسينات', borrowing: 'اقتراض', bond: 'ضمان', nextStepLabel: 'الخطوة التالية',
    scoreBelowThreshold: (pts) => `النتيجة أقل من حد الاقتراض ${pts}. ركز على التحسينات أدناه.`,
    scoreHeldBack: (s) => `نتيجتك ${s} محدودة بسبب:`, focusOnThese: 'ركز على هذه للحصول على أكبر المكاسب.',
    noTrustYet: 'لم تكسب إشارات ثقة بعد. إجراءات سريعة:', connectX: 'اربط حسابك في X', registerSol: 'سجل اسم .sol عبر SNS.id', addCrossChain: 'أضف ائتمان cross-chain عبر Ika',
    loanLevelsTitle: 'مستويات قروض Lendra', youAreHere: '← **أنت هنا**',
    yourPower: (label, amt) => `أنت في مستوى **${label}**، قدرة الاقتراض: **${amt} USDC**.`,
    defaultFallback: (s, tier, wa, waMax, et, etMax, can, label, amt) => `نتيجة Lendra الخاصة بك هي **${s}** (${tier}).\n\nالأساس: 100 | النشاط: ${wa}/${waMax} | الثقة: ${et}/${etMax}\n\n${can ? `مؤهل للاقتراض حتى ${amt} USDC (${label}).` : 'أكمل خطوات الفتح للاقتراض.'}\n\nاسأل عن: **النتيجة**، **الاقتراض**، **الضمان**، **المستويات**، أو **كيف تتحسن**.`,
  },
  zh: {
    scoreIntro: (s, tier) => `您的 Lendra 评分为 **${s}**/1000。您处于 ${tier} 级别。`,
    scoreStructure: '评分结构', baseScore: '基础评分', walletActivity: '钱包活动积分', earnedTrust: '获得的信任信号',
    breakdown: '评分明细', topImprovements: '主要改进方向', borrowing: '借贷', bond: '保证金', nextStepLabel: '下一步',
    scoreBelowThreshold: (pts) => `评分低于 ${pts} 的借贷门槛。请关注以下改进方向。`,
    scoreHeldBack: (s) => `您的评分 ${s} 受限于：`, focusOnThese: '专注于这些以获得最大提升。',
    noTrustYet: '您尚未获得信任信号。快速行动：', connectX: '连接您的 X 账户', registerSol: '通过 SNS.id 注册 .sol 名称', addCrossChain: '通过 Ika 添加跨链信用',
    loanLevelsTitle: 'Lendra 贷款级别', youAreHere: '← **您在这里**',
    yourPower: (label, amt) => `您处于 **${label}** 级别，借贷能力：**${amt} USDC**。`,
    defaultFallback: (s, tier, wa, waMax, et, etMax, can, label, amt) => `您的 Lendra 评分为 **${s}**（${tier}）。\n\n基础：100 | 活动：${wa}/${waMax} | 信任：${et}/${etMax}\n\n${can ? `有资格借入最多 ${amt} USDC（${label}）。` : '完成解锁步骤以借款。'}\n\n询问：**评分**、**借贷**、**保证金**、**级别**、**信任信号**、或**如何改进**。`,
  },
  pcm: {
    scoreIntro: (s, tier) => `Your Lendra Score na **${s}**/1000. You dey for ${tier} level.`,
    scoreBelowThreshold: (pts) => `Score dey below ${pts}. Focus on the improvements below.`,
    scoreHeldBack: (s) => `Your score of ${s} dey held back by:`, focusOnThese: 'Focus on these ones make you level up fast.',
    noTrustYet: 'You never get trust signals. Quick ways:', connectX: 'Connect your X account', registerSol: 'Register .sol name through SNS.id', addCrossChain: 'Add cross-chain credit through Ika',
    yourPower: (label, amt) => `You dey for **${label}**, you fit borrow **${amt} USDC**.`,
    defaultFallback: (s, tier, wa, waMax, et, etMax, can, label, amt) => `Your Lendra Score na **${s}** (${tier}).\n\nBase: 100 | Activity: ${wa}/${waMax} | Trust: ${et}/${etMax}\n\n${can ? `You fit borrow up to ${amt} USDC (${label}).` : 'Complete the steps to start borrowing.'}\n\nAsk about: **score**, **borrow**, **bond**, **levels**, **trust signals**, or **how to improve**.`,
  },
  yo: {
    scoreIntro: (s, tier) => `Nọ́mbà Lendra rẹ jẹ́ **${s}**/1000. O wà ní ìpele ${tier}.`,
    focusOnThese: 'Fojúsí àwọn wọ̀nyí fún àǹfààní tó pọ̀ jùlọ.',
    noTrustYet: 'O kò tíì gba àmì ìgbẹ́kẹ̀lé. Àwọn ìgbésẹ̀ tó yára:', connectX: 'So àkọ́ọ̀lẹ̀ X rẹ', registerSol: 'Forúkọsílẹ̀ orúkọ .sol nípasẹ̀ SNS.id', addCrossChain: 'Fi ìgbèsè cross-chain kún nípasẹ̀ Ika',
    yourPower: (label, amt) => `O wà ní **${label}**, o lè yá **${amt} USDC**.`,
    defaultFallback: (s, tier, wa, waMax, et, etMax, can, label, amt) => `Nọ́mbà Lendra rẹ jẹ́ **${s}** (${tier}).\n\nIpìlẹ̀: 100 | Ìgbésẹ̀: ${wa}/${waMax} | Ìgbẹ́kẹ̀lé: ${et}/${etMax}\n\n${can ? `O lè yá títí dé ${amt} USDC (${label}).` : 'Parí àwọn ìgbésẹ̀ láti bẹ̀rẹ̀ yíyá.'}\n\nBéèrè nípa: **nọ́mbà**, **àyíyá**, **ìdógò**, **ìpele**, **àmì ìgbẹ́kẹ̀lé**, tàbí **bí o ṣe lè mú u dára sí**.`,
  },
  ig: {
    scoreIntro: (s, tier) => `Akara Lendra gị bụ **${s}**/1000. Ị nọ na ọkwa ${tier}.`,
    focusOnThese: 'Lekwasị anya na ndị a maka nnukwu uru.',
    noTrustYet: 'Ị nwebeghị akara ntụkwasị obi. Ụzọ ọsọ ọsọ:', connectX: 'Jikọọ akaụntụ X gị', registerSol: 'Debanye aha .sol site na SNS.id', addCrossChain: 'Tinye ụgwọ cross-chain site na Ika',
    yourPower: (label, amt) => `Ị nọ na **${label}**, ị nwere ike ịgba **${amt} USDC**.`,
    defaultFallback: (s, tier, wa, waMax, et, etMax, can, label, amt) => `Akara Lendra gị bụ **${s}** (${tier}).\n\nNtọala: 100 | Ọrụ: ${wa}/${waMax} | Ntụkwasị obi: ${et}/${etMax}\n\n${can ? `Ị nwere ike ịgba ego ruo ${amt} USDC (${label}).` : 'Mezuo usoro iji malite ịgba ego.'}\n\nJụọ maka: **akara**, **ịgba ego**, **bond**, **ọkwa**, **ntụkwasị obi**, ma ọ bụ **otu esi eme ka ọ dị mma**.`,
  },
  ha: {
    scoreIntro: (s, tier) => `Makin Lendra naka shine **${s}**/1000. Kana a matakin ${tier}.`,
    focusOnThese: 'Ka mai da hankali kan waɗannan domin babban ci gaba.',
    noTrustYet: 'Ba ka sami alamun amana ba tukuna. Hanyoyi masu sauri:', connectX: 'Haɗa asusun X naka', registerSol: 'Yi rajista sunan .sol ta hanyar SNS.id', addCrossChain: 'Ƙara bashi na cross-chain ta hanyar Ika',
    yourPower: (label, amt) => `Kana a matakin **${label}**, kana iya aron **${amt} USDC**.`,
    defaultFallback: (s, tier, wa, waMax, et, etMax, can, label, amt) => `Makin Lendra naka shine **${s}** (${tier}).\n\nTushe: 100 | Aiki: ${wa}/${waMax} | Amana: ${et}/${etMax}\n\n${can ? `Kana iya aron har ${amt} USDC (${label}).` : 'Kammala matakai domin fara aro.'}\n\nTambaya game da: **maki**, **aro**, **bond**, **mataki**, **alamun amana**, ko **yadda za a inganta**.`,
  },
};

function _t(lang, key, ...args) {
  const tmpl = TEMPLATES[lang]?.[key] || TEMPLATES.en[key];
  if (typeof tmpl === 'function') return tmpl(...args);
  return tmpl || TEMPLATES.en[key] || key;
}

function _fl(lang, factorKey) {
  return (FACTOR_LABELS[lang] || FACTOR_LABELS.en)[factorKey] || FACTOR_LABELS.en[factorKey] || factorKey;
}

function getFactorStrength(value, max) {
  const pct = value / max;
  if (pct >= 0.8) return 'strong';
  if (pct >= 0.5) return 'moderate';
  if (pct >= 0.2) return 'weak';
  return 'veryWeak';
}

function getStrength(lang, key) {
  return (STRENGTH_LABELS[lang] || STRENGTH_LABELS.en)[key] || key;
}

function getTypingDelay(text) {
  const len = text.length;
  if (len < 200) return 600;
  if (len < 500) return 900;
  return 1200;
}

// Follow-ups return {en, display} so AiDrawer can display translated text but send English for matching
function getFollowUps(question, scoreData, lang = 'en') {
  const q = question.toLowerCase();
  const { canBorrow, breakdown } = scoreData;
  const fu = (en, chipKey) => ({ en, display: chipKey ? getUiString(lang, chipKey) : en });

  if (q.includes('score') || q.includes('explain') || q.includes('puntuación') || q.includes('评分') || q.includes('نتيجة') || q.includes('nọ́mbà') || q.includes('akara') || q.includes('maki'))
    return [fu('How can I improve?', 'chipImprove'), fu('What are Earned Trust Signals?', 'chipTrust'), fu('How much can I borrow?', 'chipBorrow')];
  if (q.includes('trust') || q.includes('signal') || q.includes('confianza') || q.includes('confiance') || q.includes('信任') || q.includes('ثقة')) {
    const tips = [fu('How can I improve?', 'chipImprove')];
    if (!breakdown.xVerification) tips.push(fu('How does X verification work?'));
    if (!breakdown.solIdentity) tips.push(fu('How do I get a .sol name?'));
    if (!breakdown.crossChain) tips.push(fu('How does cross-chain credit work?'));
    return tips.slice(0, 3);
  }
  if (q.includes('borrow') || q.includes('loan') || q.includes('how much') || q.includes('préstamo') || q.includes('prêt') || q.includes('借') || q.includes('aro') || q.includes('اقتراض'))
    return canBorrow ? [fu('What bond do I need?', 'chipBond'), fu('How do I unlock next level?', 'chipLevel'), fu('Explain my score', 'explainMyScore')] : [fu('How can I improve?', 'chipImprove'), fu('What are Earned Trust Signals?', 'chipTrust')];
  if (q.includes('improve') || q.includes('boost') || q.includes('mejorar') || q.includes('améliorer') || q.includes('提升') || q.includes('inganta')) {
    const tips = [];
    if (!breakdown.xVerification) tips.push(fu('How does X verification work?'));
    if (!breakdown.solIdentity) tips.push(fu('How do I get a .sol name?'));
    if (!breakdown.crossChain) tips.push(fu('How does cross-chain credit work?'));
    if (tips.length < 3) tips.push(fu('How much can I borrow?', 'chipBorrow'));
    return tips.slice(0, 3);
  }
  if (q.includes('bond') || q.includes('collateral') || q.includes('depósito') || q.includes('dépôt') || q.includes('保证金') || q.includes('ضمان'))
    return [fu('How much can I borrow?', 'chipBorrow'), fu('How do I unlock next level?', 'chipLevel'), fu('Explain my score', 'explainMyScore')];
  return [fu('Explain my score', 'explainMyScore'), fu('How can I improve?', 'chipImprove'), fu('How much can I borrow?', 'chipBorrow')];
}

// ─── Translations ─────────────────────────────────────────────────────

export const UI_STRINGS = {
  en: {
    askAboutScore: 'Ask about your score',
    getInsights: 'Get personalized insights about your credit score, borrowing, repayments, and more. Everything runs locally on your device.',
    explainMyScore: 'Explain my score',
    chipLow: 'Why is my score low?',
    chipImprove: 'How can I improve?',
    chipBorrow: 'How much can I borrow?',
    chipBond: 'What bond do I need?',
    chipLevel: 'How do I unlock next level?',
    chipPartners: 'What partners help my score?',
    chipTrust: 'What are Earned Trust Signals?',
    chipNextStep: 'What should I do next?',
    placeholder: 'Ask about your score, loans, levels...',
    placeholderNoWallet: 'Connect wallet first...',
    speak: 'Speak',
    listen: 'Listen',
    stop: 'Stop',
    translatedLocally: 'Translated locally',
    privacyBadge: 'Runs locally on your device. No financial data sent to cloud.',
    thinking: 'Lendra AI is thinking',
    micError: 'Microphone error. Check browser permissions.',
    micUnsupported: 'Speech recognition not supported. Try Chrome or Edge.',
    headerTitle: 'Lendra AI',
    headerSub: 'Private. Local. Multilingual.',
  },
  pcm: {
    askAboutScore: 'Ask about your score',
    getInsights: 'Get beta understanding of your credit score, how to borrow, repay, and more. Everything dey run for your device.',
    explainMyScore: 'Explain my score',
    chipLow: 'Why my score low?',
    chipImprove: 'How I fit improve am?',
    chipBorrow: 'How much I fit borrow?',
    chipBond: 'Which bond I need?',
    chipLevel: 'How I go unlock next level?',
    chipPartners: 'Which partners fit help my score?',
    chipTrust: 'Wetin be Earned Trust Signals?',
    chipNextStep: 'Wetin I suppose do next?',
    placeholder: 'Ask about your score, loans, levels...',
    placeholderNoWallet: 'Connect wallet first...',
    speak: 'Talk',
    listen: 'Hear am',
    stop: 'Stop',
    translatedLocally: 'Translated for your device',
    privacyBadge: 'E dey run for your device. No financial data go cloud.',
    thinking: 'Lendra AI dey think',
    micError: 'Mic error. Check your browser permissions.',
    micUnsupported: 'Speech no dey supported. Try Chrome or Edge.',
    headerTitle: 'Lendra AI',
    headerSub: 'Private. Local. Multilingual.',
  },
  yo: {
    askAboutScore: 'Béèrè nípa nọ́mbà rẹ',
    getInsights: 'Gba ìmọ̀ràn pàtó nípa nọ́mbà gbese rẹ, yíyà, ìsanpadà, àti bẹ́ẹ̀ bẹ́ẹ̀ lọ.',
    explainMyScore: 'Ṣàlàyé nọ́mbà mi',
    chipLow: 'Kí ló fà kí nọ́mbà mi kéré?',
    chipImprove: 'Báwo ni mo ṣe lè mú u dára sí?',
    chipBorrow: 'Mélòó ni mo lè yá?',
    chipBond: 'Bond wo ni mo nílò?',
    chipLevel: 'Báwo ni mo ṣe lè ṣí ìpele tó kàn?',
    chipPartners: 'Àwọn alájọṣepọ̀ wo ló ṣèrànwọ́?',
    chipTrust: 'Kí ni Earned Trust Signals?',
    chipNextStep: 'Kí ni mo ṣe lè ṣe lẹ́yìn?',
    placeholder: 'Béèrè nípa nọ́mbà, àwín, ìpele...',
    placeholderNoWallet: 'So àpamọ́wọ́ rẹ kọ́kọ́...',
    speak: 'Sọ̀rọ̀', listen: 'Gbọ́', stop: 'Dúró',
    translatedLocally: 'A túmọ̀ rẹ̀ ní ẹ̀rọ rẹ',
    privacyBadge: 'Ń ṣiṣẹ́ ní ẹ̀rọ rẹ. Kò sí data tí a fi ránṣẹ́.',
    thinking: 'Lendra AI ń ronú', micError: 'Àṣìṣe mic.', micUnsupported: 'Ìdánimọ̀ ohùn kò ní àtìlẹ́yìn.',
    headerTitle: 'Lendra AI', headerSub: 'Àṣírí. Ẹ̀rọ rẹ. Èdè púpọ̀.',
  },
  ig: {
    askAboutScore: 'Jụọ maka akara gị',
    getInsights: 'Nweta nghọta pụrụ iche maka akara ego gị, ịgba ego, ịkwụ ụgwọ, na ndị ọzọ.',
    explainMyScore: 'Kọwaa akara m',
    chipLow: 'Gịnị mere akara m ji dị ala?',
    chipImprove: 'Olee otú m ga-esi melite?',
    chipBorrow: 'Ego ole ka m nwere ike ịgba?',
    chipBond: 'Kedu bond m chọrọ?',
    chipLevel: 'Olee otú m ga-esi mepe ọkwa ọzọ?',
    chipPartners: 'Kedu ndị mmekọ ga-enyere m aka?',
    chipTrust: 'Kedu ihe bụ Earned Trust Signals?',
    chipNextStep: 'Kedu ihe m ga-eme ugbu a?',
    placeholder: 'Jụọ maka akara, ego, ọkwa...',
    placeholderNoWallet: 'Jikọọ akpa ego gị mbụ...',
    speak: 'Kwuo', listen: 'Gee ntị', stop: 'Kwụsị',
    translatedLocally: 'E sụgharịrị ya na ngwaọrụ gị',
    privacyBadge: 'Na-agba ọsọ na ngwaọrụ gị. Enweghị data ego a ziga.',
    thinking: 'Lendra AI na-eche', micError: 'Njehie mic.', micUnsupported: 'A naghị akwado ịmata olu.',
    headerTitle: 'Lendra AI', headerSub: 'Nzuzo. Ngwaọrụ gị. Asụsụ dị iche iche.',
  },
  ha: {
    askAboutScore: 'Tambaya game da makin ku',
    getInsights: 'Sami bayani na musamman game da makin bashi, aro, biya, da ƙari.',
    explainMyScore: 'Bayyana makin na',
    chipLow: 'Me yasa makin na ya yi ƙasa?',
    chipImprove: 'Ta yaya zan inganta?',
    chipBorrow: 'Nawa zan iya aro?',
    chipBond: 'Wane bond nake bukata?',
    chipLevel: 'Ta yaya zan buɗe mataki na gaba?',
    chipPartners: 'Wane abokan hulɗa za su taimaka?',
    chipTrust: 'Menene Earned Trust Signals?',
    chipNextStep: 'Me zan yi yanzu?',
    placeholder: 'Tambaya game da maki, bashi, mataki...',
    placeholderNoWallet: 'Fara haɗa walat...',
    speak: 'Yi magana', listen: 'Saurara', stop: 'Tsaya',
    translatedLocally: 'An fassara a na\'urar ku',
    privacyBadge: 'Yana gudana a na\'urar ku. Babu bayanan kuɗi da aka aika.',
    thinking: 'Lendra AI yana tunani', micError: 'Kuskuren mic.', micUnsupported: 'Ba a tallafawa gane murya ba.',
    headerTitle: 'Lendra AI', headerSub: 'Sirri. Na\'ura. Harsuna da yawa.',
  },
  fr: {
    askAboutScore: 'Posez vos questions sur votre score',
    getInsights: 'Obtenez des informations personnalisées sur votre score, emprunts, remboursements et plus.',
    explainMyScore: 'Expliquer mon score',
    chipLow: 'Pourquoi mon score est bas ?',
    chipImprove: 'Comment améliorer ?',
    chipBorrow: 'Combien puis-je emprunter ?',
    chipBond: 'Quel dépôt faut-il ?',
    chipLevel: 'Comment débloquer le niveau suivant ?',
    chipPartners: 'Quels partenaires aident ?',
    chipTrust: 'Que sont les Earned Trust Signals ?',
    chipNextStep: 'Que dois-je faire ensuite ?',
    placeholder: 'Posez une question sur votre score, prêts...',
    placeholderNoWallet: 'Connectez le portefeuille d\'abord...',
    speak: 'Parler', listen: 'Écouter', stop: 'Arrêter',
    translatedLocally: 'Traduit localement',
    privacyBadge: 'Fonctionne sur votre appareil. Aucune donnée envoyée au cloud.',
    thinking: 'Lendra AI réfléchit', micError: 'Erreur micro.', micUnsupported: 'Reconnaissance vocale non supportée.',
    headerTitle: 'Lendra AI', headerSub: 'Privé. Local. Multilingue.',
  },
  es: {
    askAboutScore: 'Pregunta sobre tu puntuación',
    getInsights: 'Obtén información personalizada sobre tu puntuación, préstamos, reembolsos y más.',
    explainMyScore: 'Explica mi puntuación',
    chipLow: '¿Por qué mi puntuación es baja?',
    chipImprove: '¿Cómo puedo mejorar?',
    chipBorrow: '¿Cuánto puedo pedir prestado?',
    chipBond: '¿Qué depósito necesito?',
    chipLevel: '¿Cómo desbloqueo el siguiente nivel?',
    chipPartners: '¿Qué socios ayudan?',
    chipTrust: '¿Qué son las Earned Trust Signals?',
    chipNextStep: '¿Qué debo hacer ahora?',
    placeholder: 'Pregunta sobre tu puntuación, préstamos...',
    placeholderNoWallet: 'Conecta tu billetera primero...',
    speak: 'Hablar', listen: 'Escuchar', stop: 'Parar',
    translatedLocally: 'Traducido localmente',
    privacyBadge: 'Se ejecuta en tu dispositivo. Sin datos enviados a la nube.',
    thinking: 'Lendra AI está pensando', micError: 'Error de micrófono.', micUnsupported: 'Reconocimiento de voz no soportado.',
    headerTitle: 'Lendra AI', headerSub: 'Privado. Local. Multilingüe.',
  },
  ar: {
    askAboutScore: 'اسأل عن نتيجتك',
    getInsights: 'احصل على رؤى مخصصة حول درجة الائتمان والقروض والسداد والمزيد.',
    explainMyScore: 'اشرح نتيجتي',
    chipLow: 'لماذا نتيجتي منخفضة؟',
    chipImprove: 'كيف أحسّنها؟',
    chipBorrow: 'كم يمكنني الاقتراض؟',
    chipBond: 'ما هو الضمان المطلوب؟',
    chipLevel: 'كيف أفتح المستوى التالي؟',
    chipPartners: 'أي شركاء يساعدون؟',
    chipTrust: 'ما هي إشارات الثقة المكتسبة؟',
    chipNextStep: 'ماذا أفعل الآن؟',
    placeholder: 'اسأل عن النتيجة، القروض، المستويات...',
    placeholderNoWallet: 'اربط المحفظة أولاً...',
    speak: 'تحدث', listen: 'استمع', stop: 'توقف',
    translatedLocally: 'مترجم محليًا',
    privacyBadge: 'يعمل على جهازك. لا ترسل بيانات مالية إلى السحابة.',
    thinking: 'Lendra AI يفكر', micError: 'خطأ في الميكروفون.', micUnsupported: 'التعرف على الصوت غير مدعوم.',
    headerTitle: 'Lendra AI', headerSub: 'خاص. محلي. متعدد اللغات.',
  },
  zh: {
    askAboutScore: '询问您的评分',
    getInsights: '获取关于您的信用评分、借贷、还款等个性化见解。',
    explainMyScore: '解释我的评分',
    chipLow: '为什么我的评分低？',
    chipImprove: '如何提升？',
    chipBorrow: '我能借多少？',
    chipBond: '我需要什么保证金？',
    chipLevel: '如何解锁下一级？',
    chipPartners: '哪些合作伙伴有帮助？',
    chipTrust: '什么是获得的信任信号？',
    chipNextStep: '我接下来该做什么？',
    placeholder: '询问评分、贷款、等级...',
    placeholderNoWallet: '请先连接钱包...',
    speak: '说话', listen: '收听', stop: '停止',
    translatedLocally: '本地翻译',
    privacyBadge: '在您的设备上运行。不向云端发送财务数据。',
    thinking: 'Lendra AI 正在思考', micError: '麦克风错误。', micUnsupported: '不支持语音识别。',
    headerTitle: 'Lendra AI', headerSub: '私密。本地。多语言。',
  },
};

export function getUiString(lang, key) {
  return (UI_STRINGS[lang] || UI_STRINGS.en)[key] || UI_STRINGS.en[key] || key;
}

// ─── Language-Native Response Generation ──────────────────────────────

function generateExplanation(scoreData, lang = 'en') {
  const { score, tier, breakdown, canBorrow, loanLevel } = scoreData;
  const waPts = WALLET_ACTIVITY_KEYS.reduce((s, k) => s + (breakdown[k] || 0), 0);
  const etPts = EARNED_TRUST_KEYS.reduce((s, k) => s + (breakdown[k] || 0), 0);

  let text = _t(lang, 'scoreIntro', score, tier.label) + '\n\n';
  text += `**${_t(lang, 'scoreStructure')}:**\n`;
  text += `• ${_t(lang, 'baseScore')}: 100/100\n`;
  text += `• ${_t(lang, 'walletActivity')}: ${waPts}/${WALLET_ACTIVITY_MAX}\n`;
  text += `• ${_t(lang, 'earnedTrust')}: ${etPts}/${EARNED_TRUST_MAX}\n\n`;

  if (score >= 700) text += _t(lang, 'excellentScore', loanLevel.level, loanLevel.label, loanLevel.amount) + '\n\n';
  else if (score >= 500) text += _t(lang, 'goodScore', loanLevel.level, loanLevel.amount) + '\n\n';
  else if (score >= 350) text += (canBorrow ? _t(lang, 'qualifyFor', loanLevel.level, loanLevel.amount) : _t(lang, 'meetSpendGate')) + '\n\n';
  else text += _t(lang, 'scoreBelowThreshold', 350) + '\n\n';

  text += `**${_t(lang, 'breakdown')}:**\n`;
  Object.entries(breakdown).filter(([k]) => FACTOR_META[k]).forEach(([k, v]) => {
    text += `- ${_fl(lang, k)}: ${v}/${FACTOR_META[k].max} pts\n`;
  });

  text += `\n**${_t(lang, 'topImprovements')}:**\n`;
  const weak = Object.entries(breakdown).filter(([k]) => FACTOR_META[k]).map(([k, v]) => ({ k, v, pct: v / FACTOR_META[k].max })).sort((a, b) => a.pct - b.pct);
  weak.slice(0, 3).forEach((f, i) => { text += `${i + 1}. **${_fl(lang, f.k)}** (${f.v}/${FACTOR_META[f.k].max})\n`; });

  if (canBorrow) {
    const bond = calculateBond(loanLevel.amount);
    text += `\n**${_t(lang, 'borrowing')}:** Level ${loanLevel.level} — ${loanLevel.amount} USDC. ${_t(lang, 'bondReturned', bond.toFixed(2))}`;
  }
  if (loanLevel.next) {
    text += `\n\n**${_t(lang, 'nextStepLabel')}:** ${_t(lang, 'toUnlock', loanLevel.next.label, loanLevel.next.minScore)}`;
    if (loanLevel.next.repayments > 0) text += `, ${_t(lang, 'cleanReps', loanLevel.next.repayments)}`;
    text += '.';
  }
  return text;
}

function answerQuestion(question, scoreData, lang = 'en') {
  const q = question.toLowerCase();
  const { score, tier, walletAgeDays, txCount, monthlyActivity, protocolCount, balanceUsd, spend90d, canBorrow, loanLevel, breakdown, cleanRepayments = 0 } = scoreData;
  const waPts = WALLET_ACTIVITY_KEYS.reduce((s, k) => s + (breakdown[k] || 0), 0);
  const etPts = EARNED_TRUST_KEYS.reduce((s, k) => s + (breakdown[k] || 0), 0);

  // Score explanation
  if ((q.includes('score') || q.includes('explain') || q.includes('breakdown') || q.includes('puntuación') || q.includes('评分') || q.includes('نتيجة') || q.includes('nọ́mbà') || q.includes('akara') || q.includes('maki')) && (q.includes('what') || q.includes('how') || q.includes('explain') || q.includes('explic') || q.includes('解释') || q.includes('اشرح') || q.includes('my') || q.includes('mi') || q.includes('mon') || q.includes('我')))
    return generateExplanation(scoreData, lang);

  // Trust signals
  if ((q.includes('trust') && (q.includes('signal') || q.includes('point') || q.includes('earned'))) || q.includes('earned trust') || q.includes('confianza') || q.includes('confiance') || q.includes('信任') || q.includes('ثقة')) {
    let a = `**${_t(lang, 'earnedTrust')}**: ${etPts}/${EARNED_TRUST_MAX}\n\n`;
    EARNED_TRUST_KEYS.forEach((k) => { a += `• ${_fl(lang, k)}: ${breakdown[k] || 0}/${FACTOR_META[k].max}\n`; });
    if (etPts === 0) { a += `\n${_t(lang, 'noTrustYet')}\n`; if (!breakdown.xVerification) a += `• ${_t(lang, 'connectX')}\n`; if (!breakdown.solIdentity) a += `• ${_t(lang, 'registerSol')}\n`; if (!breakdown.crossChain) a += `• ${_t(lang, 'addCrossChain')}\n`; }
    return a;
  }

  // Why low
  if ((q.includes('why') || q.includes('por qué') || q.includes('pourquoi') || q.includes('لماذا') || q.includes('为什么')) && (q.includes('low') || q.includes('bad') || q.includes('poor') || q.includes('baj') || q.includes('bas') || q.includes('منخفض') || q.includes('低'))) {
    const weak = Object.entries(breakdown).filter(([k]) => FACTOR_META[k]).sort((a, b) => (a[1] / FACTOR_META[a[0]].max) - (b[1] / FACTOR_META[b[0]].max));
    let a = _t(lang, 'scoreHeldBack', score) + '\n\n';
    weak.slice(0, 3).forEach(([k, v]) => { a += `• **${_fl(lang, k)}**: ${v}/${FACTOR_META[k].max} (${Math.round((v / FACTOR_META[k].max) * 100)}%)\n`; });
    a += `\n${_t(lang, 'focusOnThese')}`;
    if (etPts === 0) a += ` ${_t(lang, 'youAlsoHave', 0, EARNED_TRUST_MAX)}`;
    return a;
  }

  // Borrow / loan / terms / fees / revenue
  if (q.includes('borrow') || q.includes('loan') || q.includes('how much') || q.includes('préstamo') || q.includes('prêt') || q.includes('emprunter') || q.includes('借') || q.includes('aro') || q.includes('اقتراض') || q.includes('cuánto') || q.includes('combien') || q.includes('term') || q.includes('fee') || q.includes('revenue') || q.includes('comisión') || q.includes('plazo') || q.includes('frais') || q.includes('费')) {
    if (q.includes('revenue') || q.includes('makes money') || q.includes('gana') || q.includes('gagne') || q.includes('赚')) return _t(lang, 'lendraRevenue');
    if (q.includes('term') || q.includes('fee') || q.includes('plazo') || q.includes('comisión') || q.includes('frais') || q.includes('费')) return _t(lang, 'termsInfo');
    if (canBorrow) {
      const bond = calculateBond(loanLevel.amount);
      const fees = FEE_SCHEDULE[loanLevel.level] || FEE_SCHEDULE[1];
      let a = _t(lang, 'yourPower', loanLevel.label, loanLevel.amount) + '\n\n';
      a += `**${_t(lang, 'loanFeeLabel')}:** 7d (${fees[7]}%), 14d (${fees[14]}%), 30d (${fees[30]}%).\n`;
      a += `**${_t(lang, 'bond')}:** ~${bond.toFixed(2)} (30%).\n`;
      a += _t(lang, 'termsInfo');
      if (loanLevel.next) { a += `\n\n${_t(lang, 'toUnlock', loanLevel.next.label, loanLevel.next.minScore)}`; if (loanLevel.next.repayments > 0) a += `, ${_t(lang, 'cleanReps', loanLevel.next.repayments)}`; a += '.'; }
      return a;
    }
    let a = _t(lang, 'scoreIs', score);
    if (score < 350) a += _t(lang, 'below350', 350 - score);
    else a += _t(lang, 'meetsThreshold', spend90d.toFixed(2));
    return a;
  }

  // Bond
  if (q.includes('bond') || q.includes('collateral') || q.includes('deposit') || q.includes('depósito') || q.includes('dépôt') || q.includes('保证金') || q.includes('ضمان')) {
    if (q.includes('not a fee') || q.includes('fee')) return _t(lang, 'bondNotFee');
    if (canBorrow) { const bond = calculateBond(loanLevel.amount); return `${_t(lang, 'bond')}: 30%.\n\nLevel ${loanLevel.level} (${loanLevel.label}), ${loanLevel.amount} → ~${bond.toFixed(2)} USDC.`; }
    return _t(lang, 'bondNotFee');
  }

  // Level / tier
  if (q.includes('level') || q.includes('unlock') || q.includes('next') || q.includes('tier') || q.includes('nivel') || q.includes('niveau') || q.includes('级') || q.includes('mataki') || q.includes('ìpele') || q.includes('ọkwa') || q.includes('مستوى')) {
    let a = `**${_t(lang, 'loanLevelsTitle')}:**\n\n`;
    LOAN_LEVELS.forEach((l) => { const m = loanLevel.level === l.level ? ` ${_t(lang, 'youAreHere')}` : ''; a += `• **${l.label}** (L${l.level}): ${l.minScore}+${l.repayments > 0 ? `, ${_t(lang, 'cleanReps', l.repayments)}` : ''}, ${l.spendGate}+ — ${l.amount} USDC${m}\n`; });
    if (loanLevel.next) { const gap = (loanLevel.next.minScore || 0) - score; a += `\n${_t(lang, 'nextStepLabel')}: ${gap > 0 ? _t(lang, 'morePointsShort', gap) : '✅'}${loanLevel.next.repayments > 0 ? ` + ${_t(lang, 'cleanReps', loanLevel.next.repayments)}` : ''} → ${loanLevel.next.label} (${loanLevel.next.amount}).`; }
    return a;
  }

  // Improve
  if (q.includes('improve') || q.includes('increase') || q.includes('raise') || q.includes('better') || q.includes('boost') || q.includes('mejorar') || q.includes('améliorer') || q.includes('提升') || q.includes('inganta') || q.includes('melite') || q.includes('تحسين')) {
    const weak = Object.entries(breakdown).filter(([k]) => FACTOR_META[k]).sort((a, b) => (a[1] / FACTOR_META[a[0]].max) - (b[1] / FACTOR_META[b[0]].max));
    let a = `**${_t(lang, 'yourTopAreas')}:**\n\n`;
    weak.slice(0, 4).forEach(([k, v], i) => { a += `${i + 1}. **${_fl(lang, k)}** (${v}/${FACTOR_META[k].max})\n`; });
    if (etPts < 100) { a += `\n${_t(lang, 'earnedTrust')} (${etPts}/${EARNED_TRUST_MAX}):`; if (!breakdown.solIdentity) a += `\n• .sol (+40)`; if (!breakdown.xVerification) a += `\n• X (+100)`; if (!breakdown.crossChain) a += `\n• Ika (+90)`; }
    return a;
  }

  // Eligibility
  if (q.includes('eligible') || q.includes('eligib') || q.includes('qualify') || q.includes('can i') || q.includes('gate') || q.includes('elegible') || q.includes('éligible') || q.includes('资格') || q.includes('مؤهل')) {
    const gate = LOAN_LEVELS.find(l => l.level === Math.max(1, loanLevel.level))?.spendGate || 5;
    let a = `**${_t(lang, 'eligCheck')}:**\n\n`;
    a += `• ${_t(lang, 'scoreCheck', score >= 350, score)}\n`;
    a += `• ${_t(lang, 'spendCheck', spend90d >= gate, gate, spend90d.toFixed(2))}\n`;
    a += `• ${_t(lang, 'loanCheck', !scoreData.hasActiveLoan)}\n`;
    if (canBorrow) a += `\n${_t(lang, 'eligResult', loanLevel.label, loanLevel.amount)}`;
    else { const b = []; if (score < 350) b.push(_t(lang, 'needPts', 350 - score)); if (spend90d < gate) b.push(_t(lang, 'needSpend', (gate - spend90d).toFixed(2))); a += `\n${_t(lang, 'notEligResult', b.join(', ') || '')}`; }
    return a;
  }

  // What next
  if ((q.includes('what') && q.includes('next')) || q.includes('what should') || q.includes('next step') || q.includes('qué debo') || q.includes('que dois') || q.includes('接下来') || q.includes('ماذا')) {
    let a = '';
    if (score < 350) { a = _t(lang, 'scoreTooLow', score) + '\n\n'; if (breakdown.diversity < 35) a += `• ${_t(lang, 'useMoreProtocols')}\n`; if (!breakdown.xVerification) a += `• ${_t(lang, 'connectX')}\n`; if (!breakdown.solIdentity) a += `• ${_t(lang, 'registerSol')}\n`; if (!breakdown.crossChain) a += `• ${_t(lang, 'addCrossChain')}\n`; }
    else if (!canBorrow) a = _t(lang, 'spendAbove', score, spend90d.toFixed(2));
    else { a = _t(lang, 'youreEligible', loanLevel.amount); if (loanLevel.next) { a += `${_t(lang, 'toReach', loanLevel.next.label)}:\n`; const gap = (loanLevel.next.minScore || 0) - score; if (gap > 0) a += `• ${_t(lang, 'earnMore', gap)}\n`; if (loanLevel.next.repayments > cleanRepayments) a += `• ${_t(lang, 'completeMore', loanLevel.next.repayments - cleanRepayments)}\n`; } if (etPts < 100) a += `\n${_t(lang, 'connectTrust', etPts, EARNED_TRUST_MAX)}`; }
    return a;
  }

  // Default
  return _t(lang, 'defaultFallback', score, tier.label, waPts, WALLET_ACTIVITY_MAX, etPts, EARNED_TRUST_MAX, canBorrow, loanLevel.label, loanLevel.amount);
}

// ─── Language definitions ──────────────────────────────────────────
const TRANSLATIONS = {
  en: { name: 'English', flag: '🇬🇧' },
  pcm: { name: 'Pidgin', flag: '🇳🇬' },
  yo: { name: 'Yoruba', flag: '🇳🇬' },
  ig: { name: 'Igbo', flag: '🇳🇬' },
  ha: { name: 'Hausa', flag: '🇳🇬' },
  fr: { name: 'Français', flag: '🇫🇷' },
  es: { name: 'Español', flag: '🇪🇸' },
  ar: { name: 'العربية', flag: '🇸🇦', dir: 'rtl' },
  zh: { name: '中文', flag: '🇨🇳' },
};

function detectBrowserLanguage() {
  const lang = navigator.language?.split('-')[0] || 'en';
  return TRANSLATIONS[lang] ? lang : 'en';
}

function getSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  return SR ? new SR() : null;
}

function speak(text, lang = 'en') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const clean = text.replace(/\*\*/g, '').replace(/\*/g, '').replace(/#{1,6}\s/g, '').replace(/•/g, '').replace(/\n+/g, '. ');
  const langMap = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar-SA', zh: 'zh-CN', pcm: 'en-US', ig: 'en-US', yo: 'en-US', ha: 'en-US' };
  const utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang = langMap[lang] || 'en-US';
  utterance.rate = 0.95;
  utterance.pitch = 1;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

// ─── Main Hook ─────────────────────────────────────────────────────

export function useLocalAi(scoreData) {
  const [messages, setMessages] = useState([]);
  const [language, setLanguage] = useState(detectBrowserLanguage);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [followUps, setFollowUps] = useState([]);
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);

  const addMessage = useCallback((role, text) => {
    setMessages((prev) => [...prev, { role, text, id: Date.now() + Math.random() }]);
  }, []);

  // Responses are already in the target language — no post-hoc translation
  const streamResponse = useCallback((text, question) => {
    return new Promise((resolve) => {
      setIsThinking(true);
      setFollowUps([]);
      const delay = getTypingDelay(text);
      setTimeout(() => {
        setIsThinking(false);
        setIsGenerating(true);
        const words = text.split(' ');
        let current = '';
        let idx = 0;
        const msgId = Date.now() + Math.random();
        setMessages((prev) => [...prev, { role: 'ai', text: '', id: msgId }]);
        const interval = setInterval(() => {
          const chunk = Math.min(3, words.length - idx);
          for (let i = 0; i < chunk; i++) { current += (current ? ' ' : '') + words[idx]; idx++; }
          setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: current } : m)));
          if (idx >= words.length) { clearInterval(interval); setIsGenerating(false); resolve(text); }
        }, 30);
      }, delay);
    });
  }, []);

  const explainScore = useCallback(async () => {
    if (!scoreData || isGenerating || isThinking) return;
    const q = getUiString(language, 'explainMyScore');
    addMessage('user', q);
    const explanation = generateExplanation(scoreData, language);
    await streamResponse(explanation, q);
    setFollowUps(getFollowUps(q, scoreData, language));
  }, [scoreData, language, isGenerating, isThinking, addMessage, streamResponse]);

  // sendMessage(displayText, matchText?) — display is shown in bubble, matchText used for keyword matching
  const sendMessage = useCallback(async (displayText, matchText) => {
    if (!scoreData || isGenerating || isThinking || !displayText.trim()) return;
    addMessage('user', displayText);
    const queryText = matchText || displayText;
    const answer = answerQuestion(queryText, scoreData, language);
    await streamResponse(answer, queryText);
    setFollowUps(getFollowUps(queryText, scoreData, language));
  }, [scoreData, language, isGenerating, isThinking, addMessage, streamResponse]);

  const changeLanguage = useCallback((lang) => { setLanguage(lang); }, []);

  const startListening = useCallback(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) { addMessage('system', getUiString(language, 'micUnsupported')); return; }
    const langMap = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar-SA', zh: 'zh-CN', pcm: 'en-US', ig: 'en-US', yo: 'en-US', ha: 'en-US' };
    recognition.lang = langMap[language] || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => { setIsListening(false); sendMessage(event.results[0][0].transcript); };
    recognition.onerror = (event) => { setIsListening(false); if (event.error !== 'aborted') addMessage('system', getUiString(language, 'micError')); };
    recognition.onend = () => setIsListening(false);
    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [language, sendMessage, addMessage]);

  const stopListening = useCallback(() => { if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; } setIsListening(false); }, []);

  const speakLastResponse = useCallback(() => {
    const lastAi = [...messages].reverse().find((m) => m.role === 'ai');
    if (!lastAi) return;
    if (isSpeaking) { window.speechSynthesis?.cancel(); setIsSpeaking(false); return; }
    const utterance = speak(lastAi.text, language);
    if (utterance) { setIsSpeaking(true); utteranceRef.current = utterance; utterance.onend = () => setIsSpeaking(false); utterance.onerror = () => setIsSpeaking(false); }
  }, [messages, language, isSpeaking]);

  const clearChat = useCallback(() => { setMessages([]); setFollowUps([]); window.speechSynthesis?.cancel(); setIsSpeaking(false); }, []);

  return {
    messages, language, isGenerating, isThinking, isListening, isSpeaking, followUps,
    languages: TRANSLATIONS,
    explainScore, sendMessage, changeLanguage, startListening, stopListening, speakLastResponse, clearChat,
  };
}
