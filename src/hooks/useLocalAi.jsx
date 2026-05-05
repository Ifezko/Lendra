import { useState, useRef, useCallback } from 'react';
import { SCORE_FACTORS, LOAN_LEVELS, calculateBond } from './useCreditScore';

// ─── Unified Lendra AI Copilot ───────────────────────────────────────
// Single copilot: score, eligibility, borrowing, repayments, bonds,
// level unlocks, partner integrations, product knowledge.
// Runs 100% on-device. Zero API calls.

const FACTOR_META = {};
Object.entries(SCORE_FACTORS).forEach(([key, f]) => {
  FACTOR_META[key] = { name: f.label, max: f.max };
});

const WALLET_ACTIVITY_KEYS = ['age', 'volume', 'consistency', 'diversity', 'portfolio'];
const EARNED_TRUST_KEYS = ['repayment', 'xVerification', 'crossChain', 'solIdentity', 'superteam', 'creditMaturity', 'borrowGrowth'];
const WALLET_ACTIVITY_MAX = WALLET_ACTIVITY_KEYS.reduce((s, k) => s + SCORE_FACTORS[k].max, 0);
const EARNED_TRUST_MAX = EARNED_TRUST_KEYS.reduce((s, k) => s + SCORE_FACTORS[k].max, 0);

function getFactorStrength(value, max) {
  const pct = value / max;
  if (pct >= 0.8) return 'strong';
  if (pct >= 0.5) return 'moderate';
  if (pct >= 0.2) return 'weak';
  return 'very weak';
}

function getTypingDelay(text) {
  const len = text.length;
  if (len < 200) return 600;
  if (len < 500) return 900;
  return 1200;
}

function getFollowUps(question, scoreData) {
  const q = question.toLowerCase();
  const { canBorrow, loanLevel, breakdown } = scoreData;
  const earnedTrustPts = EARNED_TRUST_KEYS.reduce((s, k) => s + (breakdown[k] || 0), 0);

  if (q.includes('score') || q.includes('explain')) {
    return ['How can I improve?', 'What are Earned Trust Signals?', 'How much can I borrow?'];
  }
  if (q.includes('trust') || q.includes('signal') || q.includes('earned')) {
    const tips = ['How can I improve?'];
    if (!breakdown.xVerification) tips.push('How does X verification work?');
    if (!breakdown.solIdentity) tips.push('How do I get a .sol name?');
    if (!breakdown.crossChain) tips.push('How does cross-chain credit work?');
    return tips.slice(0, 3);
  }
  if (q.includes('borrow') || q.includes('loan') || q.includes('how much')) {
    return canBorrow ? ['What bond do I need?', 'How do I unlock next level?', 'Explain my score'] : ['How can I improve?', 'What are Earned Trust Signals?', 'Explain my eligibility'];
  }
  if (q.includes('improve') || q.includes('boost') || q.includes('raise') || q.includes('increase')) {
    const tips = [];
    if (!breakdown.xVerification) tips.push('How does X verification work?');
    if (!breakdown.solIdentity) tips.push('How do I get a .sol name?');
    if (!breakdown.crossChain) tips.push('How does cross-chain credit work?');
    if (tips.length < 3) tips.push('How much can I borrow?');
    return tips.slice(0, 3);
  }
  if (q.includes('bond') || q.includes('collateral')) {
    return ['How much can I borrow?', 'How do I unlock next level?', 'Explain my score'];
  }
  if (q.includes('next') || q.includes('what should')) {
    return ['Explain my score', 'What are Earned Trust Signals?', 'How much can I borrow?'];
  }
  return ['Explain my score', 'How can I improve?', 'How much can I borrow?'];
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

// ─── Score Explanation ────────────────────────────────────────────────

function getImprovementTip(key, data) {
  const { walletAgeDays, txCount, monthlyActivity, protocolCount, balanceUsd } = data;
  const tips = {
    age: walletAgeDays < 30 ? `Wallet is only ${walletAgeDays} days old. Age improves passively — 365+ days earns max.` : `At ${walletAgeDays} days, keep using your wallet. Time helps.`,
    volume: `${txCount} transactions. More swaps and interactions help. 500+ earns max.`,
    consistency: `Active in ${monthlyActivity} months. Transact at least once per month for consistency.`,
    diversity: `${protocolCount} protocols used. Try Jupiter, Raydium, Marinade, Tensor, or Orca.`,
    portfolio: `Portfolio at ${balanceUsd.toFixed(2)}. Holding more SOL or SPL tokens helps. $5,000+ earns max.`,
    repayment: 'Borrow and repay on time. Each clean repayment: +25 pts. Early bonus: +5 pts.',
    xVerification: 'Connect and verify your X account through the Trust panel. Up to 100 pts.',
    crossChain: 'Connect an EVM wallet via Ika for cross-chain credit points (up to 90 pts).',
    solIdentity: 'Search and register a .sol domain through SNS.id in Lendra. Up to 40 pts.',
    superteam: 'Verify Superteam Proof-of-Work credentials for up to 30 bonus pts.',
    creditMaturity: 'Climb through loan levels. Bonuses are awarded at Level 3+.',
    borrowGrowth: 'Repay higher loan amounts over time. Each qualifying repayment: +5 pts.',
  };
  return tips[key] || 'Keep building on-chain activity.';
}

function generateExplanation(scoreData) {
  const { score, tier, breakdown, canBorrow, loanLevel } = scoreData;

  const walletActivityPts = WALLET_ACTIVITY_KEYS.reduce((s, k) => s + (breakdown[k] || 0), 0);
  const earnedTrustPts = EARNED_TRUST_KEYS.reduce((s, k) => s + (breakdown[k] || 0), 0);

  const factors = Object.entries(breakdown)
    .filter(([key]) => FACTOR_META[key])
    .map(([key, value]) => ({ key, ...FACTOR_META[key], value, strength: getFactorStrength(value, FACTOR_META[key].max), pct: Math.round((value / FACTOR_META[key].max) * 100) }));
  const weakest = [...factors].sort((a, b) => a.pct - b.pct);

  let t = `Your Lendra Score is **${score}** out of 1000.\n\n`;
  t += `**Score Structure:**\n`;
  t += `• Base Score: 100/100\n`;
  t += `• Wallet Activity Points: ${walletActivityPts}/${WALLET_ACTIVITY_MAX}\n`;
  t += `• Earned Trust Signals: ${earnedTrustPts}/${EARNED_TRUST_MAX}\n\n`;

  if (score >= 700) {
    const lvl = LOAN_LEVELS.find(l => l.level === loanLevel.level);
    t += `Excellent score. You qualify for Level ${loanLevel.level} (${lvl?.label || ''}) — up to ${loanLevel.amount} USDC.\n\n`;
  } else if (score >= 500) {
    t += `Good score. You qualify for Level ${loanLevel.level} — up to ${loanLevel.amount} USDC.\n\n`;
  } else if (score >= 350) {
    t += `${canBorrow ? `You qualify for Level ${loanLevel.level} — up to ${loanLevel.amount} USDC.` : 'Meet the spend gate and other requirements to start borrowing.'}\n\n`;
  } else {
    t += `Score is below the 350 borrowing threshold. Focus on improvements below.\n\n`;
  }

  t += `**Top improvements:**\n`;
  weakest.slice(0, 3).forEach((f, i) => { t += `${i + 1}. **${f.name}** (${f.value}/${f.max}) — ${getImprovementTip(f.key, scoreData)}\n`; });

  if (canBorrow) {
    const bond = calculateBond(loanLevel.amount);
    t += `\n**Borrowing:** Level ${loanLevel.level} — up to ${loanLevel.amount} USDC. Bond: ~${bond.toFixed(2)} (30%).`;
  }

  if (loanLevel.next) {
    const gap = (loanLevel.next.minScore || 0) - score;
    t += `\n\nNext level: ${gap > 0 ? gap : 0} more points${loanLevel.next.repayments > 0 ? ` + ${loanLevel.next.repayments} clean repayment(s)` : ''} for Level ${loanLevel.next.level} (${loanLevel.next.label}).`;
  }
  return t;
}

// ─── Unified Q&A Engine ───────────────────────────────────────────────

function answerQuestion(question, scoreData) {
  const q = question.toLowerCase();
  const { score, tier, walletAgeDays, txCount, monthlyActivity, protocolCount, balanceUsd, spend90d, canBorrow, loanLevel, breakdown, cleanRepayments = 0 } = scoreData;
  const walletActivityPts = WALLET_ACTIVITY_KEYS.reduce((s, k) => s + (breakdown[k] || 0), 0);
  const earnedTrustPts = EARNED_TRUST_KEYS.reduce((s, k) => s + (breakdown[k] || 0), 0);

  if ((q.includes('score') || q.includes('explain') || q.includes('breakdown')) && (q.includes('what') || q.includes('how') || q.includes('explain') || q.includes('my'))) return generateExplanation(scoreData);

  // Trust Signals / Earned Trust Signals
  if (q.includes('trust') && (q.includes('signal') || q.includes('point') || q.includes('earned')) || q.includes('earned trust')) {
    let a = `**Earned Trust Signals** are the part of your Lendra Score that comes from actions proving trust beyond basic wallet activity.\n\n`;
    a += `**Your Earned Trust Signals: ${earnedTrustPts}/${EARNED_TRUST_MAX}**\n\n`;
    a += `They include:\n`;
    a += `• Repayment History: ${breakdown.repayment || 0}/140\n`;
    a += `• X Verification: ${breakdown.xVerification || 0}/100\n`;
    a += `• Cross-Chain Credit: ${breakdown.crossChain || 0}/90\n`;
    a += `• .sol Identity: ${breakdown.solIdentity || 0}/40\n`;
    a += `• Superteam PoW: ${breakdown.superteam || 0}/30\n`;
    a += `• Credit Maturity: ${breakdown.creditMaturity || 0}/110\n`;
    a += `• Borrow Growth: ${breakdown.borrowGrowth || 0}/100\n`;
    if (earnedTrustPts === 0) {
      a += `\nYou haven't earned trust signals yet. Quick wins:\n`;
      if (!breakdown.xVerification) a += `• Connect your X account\n`;
      if (!breakdown.solIdentity) a += `• Register a .sol name through SNS.id\n`;
      if (!breakdown.crossChain) a += `• Add cross-chain credit through Ika\n`;
    }
    return a;
  }

  // Score structure
  if (q.includes('structure') || q.includes('three part') || q.includes('how is') || q.includes('what makes up') || q.includes('parts of')) {
    return `Your Lendra Score has three parts:\n\n**1. Base Score: 100/100**\nEvery wallet starts here.\n\n**2. Wallet Activity Points: ${walletActivityPts}/${WALLET_ACTIVITY_MAX}**\nWallet age, transaction volume, consistency, protocol diversity, portfolio value.\n\n**3. Earned Trust Signals: ${earnedTrustPts}/${EARNED_TRUST_MAX}**\nRepayment history, X verification, cross-chain credit, .sol identity, Superteam PoW, credit maturity, borrow growth.\n\nTotal: 100 + ${WALLET_ACTIVITY_MAX} + ${EARNED_TRUST_MAX} = 1000`;
  }

  if (q.includes('why') && (q.includes('low') || q.includes('bad') || q.includes('poor'))) {
    const weak = Object.entries(breakdown).filter(([k]) => FACTOR_META[k]).sort((a, b) => (a[1] / FACTOR_META[a[0]].max) - (b[1] / FACTOR_META[b[0]].max));
    let a = `Your score of ${score} is held back by:\n\n`;
    weak.slice(0, 3).forEach(([k, v]) => { const f = FACTOR_META[k]; a += `• **${f.name}**: ${v}/${f.max} (${Math.round((v / f.max) * 100)}%)\n`; });
    a += `\nFocus on these for the biggest gains.`;
    if (earnedTrustPts === 0) a += ` You also have 0/${EARNED_TRUST_MAX} Earned Trust Signals — connecting identity signals and building credit history will help significantly.`;
    return a;
  }

  if (q.includes('borrow') || q.includes('loan') || q.includes('how much')) {
    if (canBorrow) {
      const bond = calculateBond(loanLevel.amount);
      const lvl = LOAN_LEVELS.find(l => l.level === loanLevel.level);
      let a = `You're at **${lvl?.label || 'Level ' + loanLevel.level}**, so your borrowing power is **${loanLevel.amount} USDC**.\n\n`;
      a += `**Terms:** 7d (12% APR), 14d (10%), 30d (8%).\n**Bond:** ~${bond.toFixed(2)} (30%), returned on repayment.`;
      if (loanLevel.next) {
        a += `\n\nTo unlock ${loanLevel.next.label}: score ${loanLevel.next.minScore}+`;
        if (loanLevel.next.repayments > 0) a += `, ${loanLevel.next.repayments} clean repayments`;
        a += '.';
      }
      return a;
    }
    let a = `Score ${score} `;
    if (score < 350) a += `is below 350 minimum. You need ${350 - score} more points.`;
    else a += `meets threshold, but you need to meet the spend gate. Current: ${spend90d.toFixed(2)}.`;
    return a;
  }

  if (q.includes('bond') || q.includes('collateral') || q.includes('deposit')) {
    if (canBorrow) { const bond = calculateBond(loanLevel.amount); return `Bond is 30% of your loan amount.\n\nAt Level ${loanLevel.level} (${loanLevel.label}), max ${loanLevel.amount} → bond ~${bond.toFixed(2)} USDC.\n\n• Deposited into escrow before borrowing\n• Returned in full on timely repayment\n• Liquidated on default\n\nBonds protect lenders and are not revenue.`; }
    return `Bond is 30% of loan amount. Reach score 350+ and meet the spend gate to unlock borrowing.`;
  }

  if (q.includes('level') || q.includes('unlock') || q.includes('next') || q.includes('tier')) {
    let a = `**Lendra Loan Levels:**\n\n`;
    LOAN_LEVELS.forEach((l) => { const marker = loanLevel.level === l.level ? ' ← **You are here**' : ''; a += `• **${l.label}** (L${l.level}): Score ${l.minScore}+${l.repayments > 0 ? `, ${l.repayments} repayments` : ''}, ${l.spendGate}+ spend — ${l.amount} USDC${marker}\n`; });
    if (loanLevel.next) { const gap = (loanLevel.next.minScore || 0) - score; a += `\nNext: ${gap > 0 ? `${gap} more points` : 'Score met'}${loanLevel.next.repayments > 0 ? ` + ${loanLevel.next.repayments} repayments` : ''} for ${loanLevel.next.label} (${loanLevel.next.amount}).`; }
    return a;
  }

  if (q.includes('improve') || q.includes('increase') || q.includes('raise') || q.includes('better') || q.includes('boost')) {
    const weak = Object.entries(breakdown).filter(([k]) => FACTOR_META[k]).sort((a, b) => (a[1] / FACTOR_META[a[0]].max) - (b[1] / FACTOR_META[b[0]].max));
    let a = `**Your top areas to improve:**\n\n`;
    weak.slice(0, 4).forEach(([k, v], i) => { a += `${i + 1}. **${FACTOR_META[k].name}** (${v}/${FACTOR_META[k].max}) — ${getImprovementTip(k, scoreData)}\n`; });
    if (earnedTrustPts < 100) {
      a += `\nEarned Trust Signals (${earnedTrustPts}/${EARNED_TRUST_MAX}):`;
      if (!breakdown.solIdentity) a += `\n• .sol name (+40 max)`;
      if (!breakdown.xVerification) a += `\n• X verification (+100 max)`;
      if (!breakdown.crossChain) a += `\n• Cross-chain via Ika (+90 max)`;
    }
    return a;
  }

  if (q.includes('x ') || q.includes('twitter') || q.includes('x account') || q.includes('verification') || q.includes('verify'))
    return `**X Verification** earns up to 100 points.\n\nScore is based on account age, post count, follower ratio, and public activity.\n\n**How:** Trust panel → Connect X → authorize via OAuth → score calculated automatically.\n\n**Note:** Levels 5-6 require X verification score of at least 65/100.`;

  if (q.includes('sns') || q.includes('.sol') || q.includes('domain') || q.includes('identity'))
    return `**.sol Identity** earns up to 40 points.\n\nSearch and register a .sol name directly inside Lendra through SNS.id integration.\n\n**Steps:**\n1. Go to Trust panel\n2. Search for your .sol name\n3. Register using your wallet\n4. Identity boost applied automatically\n\nYou never leave Lendra.`;

  if (q.includes('quicknode') || q.includes('rpc') || q.includes('node'))
    return `**QuickNode** powers Lendra's infrastructure.\n\n• High-performance Solana RPC for wallet scanning\n• Real-time transaction monitoring\n• Powers Telegram alert delivery\n\nEvery wallet scan uses QuickNode.`;

  if (q.includes('kamino'))
    return `**Kamino** is part of Lendra's lending infrastructure.\n\nKamino interactions count toward Protocol Diversity score. Lendra borrowing is from the Lendra Credit Pool.`;

  if (q.includes('solflare') || (q.includes('wallet') && !q.includes('borrow') && !q.includes('scan')))
    return `**Solflare** is Lendra's recommended wallet.\n\n• Native Solana wallet with Wallet Standard\n• Smooth connection with Lendra\n• Supports all SPL tokens and DeFi\n\nOther wallets (Phantom, etc.) also work via Wallet Standard.`;

  if (q.includes('qvac') || q.includes('local ai') || q.includes('assistant'))
    return `**QVAC** powers Lendra AI — this assistant.\n\n• 100% on-device — no cloud\n• 9 languages including Pidgin, Yoruba, Igbo, Hausa\n• Voice input and output\n• Explains score, borrowing, improvements\n\nYour data never leaves your browser.`;

  if (q.includes('encrypt') || q.includes('private') || q.includes('privacy') || q.includes('hidden'))
    return `**Encrypt** powers private borrowing.\n\n• Hide credit score, loan details, portfolio\n• Borrow without exposing terms publicly\n• For institutions: private credit strategies, encrypted lender vaults\n\nEnable via Dashboard privacy toggle.`;

  if (q.includes('ika') || q.includes('cross-chain') || q.includes('cross chain') || q.includes('ethereum') || q.includes('evm'))
    return `**Ika** enables cross-chain credit — up to 90 points.\n\nConnect EVM or BTC wallets via Ika dWallet MPC. Your ETH/BTC activity history is imported without bridging.\n\n**How:** Trust panel → Connect Cross-Chain Wallet → verify → points added.`;

  if (q.includes('telegram') || q.includes('alert') || q.includes('notification'))
    return `**Telegram Alerts:**\n\n• Score changes\n• Loan status (borrowed, due, overdue)\n• Bond status (deposited, returned)\n• Repayment confirmations\n• Level unlocks\n\nSetup: Dashboard Settings → Connect Telegram → choose alerts.\nPowered by QuickNode webhooks.`;

  if (q.includes('repay') || q.includes('repayment') || q.includes('pay back'))
    return `**Repayment Scoring:**\n\n• On-time: **+25 pts**\n• Early bonus: **+5 pts** (cap +20)\n• Late: **-15 pts**\n• Default: resets to 0\n• Max repayment score: **140 pts**\n\nClean repayments also unlock higher loan levels and earn Borrow Growth Bonus.\nBond is returned in full on-time.`;

  if (q.includes('eligible') || q.includes('eligib') || q.includes('block') || q.includes('qualify') || q.includes('can i') || q.includes('gate')) {
    const spendGate = LOAN_LEVELS.find(l => l.level === Math.max(1, loanLevel.level))?.spendGate || 5;
    let a = `**Borrowing Eligibility:**\n\n`;
    a += `• **Score:** ${score >= 350 ? '✅' : '❌'} 350+ (yours: ${score})\n`;
    a += `• **Spend:** ${spend90d >= spendGate ? '✅' : '❌'} ${spendGate}+ in 90d (yours: ${spend90d.toFixed(2)})\n`;
    a += `• **Active loan:** ${!scoreData.hasActiveLoan ? '✅' : '❌'} None\n`;
    if (canBorrow) a += `\n**Result:** Eligible for ${loanLevel.label} — ${loanLevel.amount} USDC.`;
    else { const b = []; if (score < 350) b.push(`need ${350 - score} more pts`); if (spend90d < spendGate) b.push(`need ${(spendGate - spend90d).toFixed(2)} more spend`); a += `\n**Not yet eligible.** ${b.join(', ') || 'Check gates above'}.`; }
    return a;
  }

  if (q.includes('superteam') || q.includes('pow') || q.includes('proof of work'))
    return `**Superteam PoW** earns up to 30 pts.\n\nSuperteam members earn reputation through ecosystem contributions. Verify via Trust panel → points added automatically.`;

  if ((q.includes('what') && q.includes('next')) || q.includes('what should') || q.includes('next step')) {
    let a = '';
    if (score < 350) {
      a = `Your score is ${score}. To unlock borrowing (350+):\n\n`;
      if (breakdown.diversity < 35) a += `• Use more protocols (Jupiter, Raydium, Marinade)\n`;
      if (!breakdown.xVerification) a += `• Connect your X account\n`;
      if (!breakdown.solIdentity) a += `• Register a .sol name through SNS.id\n`;
      if (!breakdown.crossChain) a += `• Add cross-chain credit through Ika\n`;
    } else if (!canBorrow) {
      a = `Score is ${score} (above 350). Meet the spend gate to start borrowing.\n\nCurrent 90d spend: ${spend90d.toFixed(2)}.`;
    } else {
      a = `You're eligible to borrow up to ${loanLevel.amount} USDC.\n\n`;
      if (loanLevel.next) {
        a += `To reach ${loanLevel.next.label}:\n`;
        const gap = (loanLevel.next.minScore || 0) - score;
        if (gap > 0) a += `• Earn ${gap} more points\n`;
        if (loanLevel.next.repayments > cleanRepayments) a += `• Complete ${loanLevel.next.repayments - cleanRepayments} more clean repayment(s)\n`;
      }
      if (earnedTrustPts < 100) a += `\nConnect trust signals to grow your Earned Trust Signals (${earnedTrustPts}/${EARNED_TRUST_MAX}).`;
    }
    return a;
  }

  if (q.includes('protocol') || q.includes('diversity') || q.includes('dapp'))
    return `${protocolCount} protocols used → ${breakdown.diversity || 0}/${FACTOR_META.diversity?.max || 70} pts.\n\nTry: Jupiter (swaps), Raydium (AMM), Marinade (staking), Tensor (NFTs), Orca (liquidity), Kamino (lending).`;

  // Default fallback
  const walletAct = WALLET_ACTIVITY_KEYS.reduce((s, k) => s + (breakdown[k] || 0), 0);
  const earnedTrust = EARNED_TRUST_KEYS.reduce((s, k) => s + (breakdown[k] || 0), 0);
  return `Your Lendra Score is **${score}** (${tier.label}).\n\nBase: 100 | Activity: ${walletAct}/${WALLET_ACTIVITY_MAX} | Earned Trust: ${earnedTrust}/${EARNED_TRUST_MAX}\n\n${canBorrow ? `Eligible to borrow up to ${loanLevel.amount} USDC (${loanLevel.label}).` : 'Complete unlock steps to borrow.'}\n\nAsk about: **score**, **borrow**, **bond**, **levels**, **Earned Trust Signals**, **X verification**, **SNS.id**, **Ika**, **QVAC**, **Encrypt**, or **how to improve**.`;
}

// ─── Translation Engine ───────────────────────────────────────────────

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

const PHRASE_MAP = {
  pcm: { 'Your Lendra credit score is': 'Your Lendra credit score na', 'out of 1000': 'out of 1000', 'Score Breakdown': 'Score Breakdown', 'Top 3 Improvements': 'Top 3 Ways to Level Up', 'strong': 'strong', 'moderate': 'so-so', 'weak': 'weak', 'very weak': 'very weak', 'Borrowing': 'Borrowing', 'Bond': 'Bond', 'You qualify for': 'You fit borrow for', 'You need': 'You need', 'more points': 'more points', 'Result': 'Result', 'Blocked': 'E no work', 'Your top areas to improve': 'Where you fit improve pass' },
  ig: { 'Your Lendra credit score is': 'Akara ego Lendra gị bụ', 'out of 1000': 'n\'ime 870', 'Score Breakdown': 'Nkọwa Akara', 'strong': 'siri ike', 'moderate': 'ọ dị nta', 'weak': 'adịghị ike', 'very weak': 'adịghị ike nke ukwuu', 'Result': 'Nsonaazụ' },
  yo: { 'Your Lendra credit score is': 'Nọ́mbà gbese Lendra rẹ jẹ́', 'out of 1000': 'nínú 870', 'Score Breakdown': 'Àlàyé Nọ́mbà', 'strong': 'lágbára', 'moderate': 'ìwọ̀ntúnwọ̀nsí', 'weak': 'aláìlágbára', 'very weak': 'aláìlágbára púpọ̀', 'Result': 'Àbájáde' },
  ha: { 'Your Lendra credit score is': 'Makin bashi na Lendra naka shine', 'out of 1000': 'daga cikin 870', 'Score Breakdown': 'Bayanin Maki', 'strong': 'ƙarfi', 'moderate': 'matsakaici', 'weak': 'raunana', 'very weak': 'raunana ƙwarai', 'Result': 'Sakamako' },
  fr: { 'Your Lendra credit score is': 'Votre score de crédit Lendra est de', 'out of 1000': 'sur 870', 'Score Breakdown': 'Détail du Score', 'Top 3 Improvements': '3 axes d\'amélioration', 'strong': 'fort', 'moderate': 'modéré', 'weak': 'faible', 'very weak': 'très faible', 'Borrowing': 'Emprunt', 'Bond': 'Dépôt', 'Result': 'Résultat', 'Blocked': 'Bloqué', 'Your top areas to improve': 'Vos axes d\'amélioration' },
  es: { 'Your Lendra credit score is': 'Tu puntuación crediticia Lendra es de', 'out of 1000': 'de 870', 'Score Breakdown': 'Desglose', 'Top 3 Improvements': '3 pasos para mejorar', 'strong': 'fuerte', 'moderate': 'moderado', 'weak': 'débil', 'very weak': 'muy débil', 'Borrowing': 'Préstamo', 'Bond': 'Depósito', 'Result': 'Resultado', 'Blocked': 'Bloqueado' },
  ar: { 'Your Lendra credit score is': 'درجة ائتمان Lendra الخاصة بك هي', 'out of 1000': 'من 870', 'Score Breakdown': 'تفصيل النتيجة', 'strong': 'قوي', 'moderate': 'متوسط', 'weak': 'ضعيف', 'very weak': 'ضعيف جداً', 'Result': 'النتيجة' },
  zh: { 'Your Lendra credit score is': '您的 Lendra 信用评分为', 'out of 1000': '（满分 870）', 'Score Breakdown': '评分明细', 'Top 3 Improvements': '3个提升方向', 'strong': '强', 'moderate': '中等', 'weak': '弱', 'very weak': '非常弱', 'Borrowing': '借贷', 'Bond': '保证金', 'Result': '结果' },
};

function translateText(text, targetLang) {
  if (targetLang === 'en' || !PHRASE_MAP[targetLang]) return text;
  const phrases = PHRASE_MAP[targetLang];
  let translated = text;
  const sorted = Object.entries(phrases).sort((a, b) => b[0].length - a[0].length);
  for (const [en, local] of sorted) {
    translated = translated.replaceAll(en, local);
  }
  return translated;
}

// ─── Browser Language Detection ───────────────────────────────────────

function detectBrowserLanguage() {
  const lang = navigator.language?.split('-')[0] || 'en';
  return TRANSLATIONS[lang] ? lang : 'en';
}

// ─── Speech ───────────────────────────────────────────────────────────

function getSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  return new SR();
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

// ─── Main Hook ────────────────────────────────────────────────────────

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

  const streamResponse = useCallback((text, lang, question) => {
    return new Promise((resolve) => {
      setIsThinking(true);
      setFollowUps([]);
      const translated = translateText(text, lang);
      const delay = getTypingDelay(translated);

      setTimeout(() => {
        setIsThinking(false);
        setIsGenerating(true);
        const words = translated.split(' ');
        let current = '';
        let idx = 0;
        const msgId = Date.now() + Math.random();
        setMessages((prev) => [...prev, { role: 'ai', text: '', id: msgId }]);
        const interval = setInterval(() => {
          const chunk = Math.min(3, words.length - idx);
          for (let i = 0; i < chunk; i++) { current += (current ? ' ' : '') + words[idx]; idx++; }
          setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, text: current } : m)));
          if (idx >= words.length) {
            clearInterval(interval);
            setIsGenerating(false);
            resolve(translated);
          }
        }, 30);
      }, delay);
    });
  }, []);

  const explainScore = useCallback(async () => {
    if (!scoreData || isGenerating || isThinking) return;
    const q = getUiString(language, 'explainMyScore');
    addMessage('user', q);
    const explanation = generateExplanation(scoreData);
    await streamResponse(explanation, language, q);
    setFollowUps(getFollowUps(q, scoreData));
  }, [scoreData, language, isGenerating, isThinking, addMessage, streamResponse]);

  const sendMessage = useCallback(async (text) => {
    if (!scoreData || isGenerating || isThinking || !text.trim()) return;
    addMessage('user', text);
    const answer = answerQuestion(text, scoreData);
    await streamResponse(answer, language, text);
    setFollowUps(getFollowUps(text, scoreData));
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

  const stopListening = useCallback(() => {
    if (recognitionRef.current) { recognitionRef.current.stop(); recognitionRef.current = null; }
    setIsListening(false);
  }, []);

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
