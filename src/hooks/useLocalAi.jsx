import { useState, useRef, useCallback } from 'react';

// ─── On-Device Score Explanation Engine ───────────────────────────────
// Generates contextual, personalized credit score explanations
// entirely client-side. Zero API calls, zero cloud.

const FACTOR_LABELS = {
  age: { name: 'Wallet Age', max: 120 },
  volume: { name: 'Transaction Volume', max: 130 },
  consistency: { name: 'Monthly Consistency', max: 120 },
  diversity: { name: 'Protocol Diversity', max: 100 },
  portfolio: { name: 'Portfolio Value', max: 100 },
};

function getFactorStrength(value, max) {
  const pct = value / max;
  if (pct >= 0.8) return 'strong';
  if (pct >= 0.5) return 'moderate';
  if (pct >= 0.2) return 'weak';
  return 'very weak';
}

function generateExplanation(scoreData) {
  const { score, tier, walletAgeDays, txCount, monthlyActivity, protocolCount, balanceUsd, spend90d, breakdown, canBorrow, loanLevel } = scoreData;

  const factors = Object.entries(breakdown)
    .filter(([key]) => FACTOR_LABELS[key])
    .map(([key, value]) => ({
      key,
      ...FACTOR_LABELS[key],
      value,
      strength: getFactorStrength(value, FACTOR_LABELS[key].max),
      pct: Math.round((value / FACTOR_LABELS[key].max) * 100),
    }));

  const strongest = [...factors].sort((a, b) => b.pct - a.pct);
  const weakest = [...factors].sort((a, b) => a.pct - b.pct);

  let explanation = `Your Lendra credit score is ${score} out of 870, placing you in the "${tier.label}" tier.\n\n`;

  // Overall assessment
  if (score >= 700) {
    explanation += `This is an excellent score. Your wallet demonstrates strong on-chain credibility across multiple factors. You qualify for Level ${loanLevel.level} borrowing (up to $${loanLevel.amount}).\n\n`;
  } else if (score >= 580) {
    explanation += `This is a good score. Your wallet shows solid on-chain activity, though there's room for improvement. You qualify for Level ${loanLevel.level} borrowing (up to $${loanLevel.amount}).\n\n`;
  } else if (score >= 400) {
    explanation += `This is a fair score. Your wallet has some on-chain history, but several factors need improvement. ${canBorrow ? `You qualify for Level ${loanLevel.level} borrowing (up to $${loanLevel.amount}).` : 'You need at least $50 in 90-day on-chain spend to unlock borrowing.'}\n\n`;
  } else {
    explanation += `This score is below the borrowing threshold of 400. Your wallet needs more on-chain activity to build credibility. Focus on the improvement steps below.\n\n`;
  }

  // Factor breakdown
  explanation += `**Score Breakdown:**\n`;
  factors.forEach((f) => {
    explanation += `• ${f.name}: ${f.value}/${f.max} pts (${f.strength}) — `;
    switch (f.key) {
      case 'age':
        explanation += walletAgeDays < 30 ? `Your wallet is only ${walletAgeDays} days old. Older wallets score higher.` : walletAgeDays < 180 ? `At ${walletAgeDays} days, your wallet is relatively young. Time will help this factor.` : `At ${walletAgeDays} days, your wallet age contributes well to your score.`;
        break;
      case 'volume':
        explanation += txCount < 50 ? `Only ${txCount} transactions found. More activity improves this.` : txCount < 200 ? `${txCount} transactions show moderate activity.` : `${txCount} transactions demonstrate strong usage.`;
        break;
      case 'consistency':
        explanation += monthlyActivity < 3 ? `Active in only ${monthlyActivity} months. Regular monthly activity helps.` : monthlyActivity < 8 ? `Active in ${monthlyActivity} months — building a good pattern.` : `Active in ${monthlyActivity} months — excellent consistency.`;
        break;
      case 'diversity':
        explanation += protocolCount < 5 ? `Only ${protocolCount} protocols used. Try Jupiter, Raydium, Marinade, or Tensor.` : protocolCount < 10 ? `${protocolCount} protocols used — good diversity.` : `${protocolCount} protocols used — impressive breadth.`;
        break;
      case 'portfolio':
        explanation += balanceUsd < 50 ? `Portfolio value is $${balanceUsd.toFixed(2)}. A higher balance improves this factor.` : balanceUsd < 500 ? `Portfolio at $${balanceUsd.toFixed(2)} — moderate holdings.` : `Portfolio at $${balanceUsd.toFixed(2)} — strong holdings.`;
        break;
    }
    explanation += '\n';
  });

  // Improvement steps
  explanation += `\n**3 Steps to Improve Your Score:**\n`;

  const steps = [];

  if (weakest[0].key === 'diversity' || protocolCount < 10) {
    steps.push(`1. **Use more protocols.** Interact with popular Solana dApps like Jupiter (swap tokens), Raydium (provide liquidity), Marinade (stake SOL), or Tensor (NFTs). Each new protocol adds up to +${Math.round(100 / 15)} points per protocol.`);
  }
  if (weakest[0].key === 'volume' || txCount < 200) {
    steps.push(`${steps.length + 1}. **Increase transaction frequency.** Make regular swaps, transfers, or DeFi interactions. You need ~500 transactions for maximum points in this category.`);
  }
  if (weakest[0].key === 'consistency' || monthlyActivity < 8) {
    steps.push(`${steps.length + 1}. **Be consistent month-to-month.** Even one transaction per month counts. Set a reminder to interact with a protocol each month.`);
  }
  if (weakest[0].key === 'portfolio' || balanceUsd < 1000) {
    steps.push(`${steps.length + 1}. **Grow your portfolio.** Hold more SOL or SPL tokens. A $5,000+ portfolio earns maximum points for this factor.`);
  }
  if (weakest[0].key === 'age') {
    steps.push(`${steps.length + 1}. **Time is on your side.** Wallet age improves passively. Keep using your wallet — 365+ days earns maximum age points.`);
  }
  if (spend90d < 50) {
    steps.push(`${steps.length + 1}. **Spend at least $50 on-chain in 90 days.** You've spent ~$${spend90d.toFixed(2)} so far. Swap tokens or mint NFTs to reach the $50 threshold required for borrowing.`);
  }

  explanation += steps.slice(0, 3).join('\n');

  if (loanLevel.next) {
    explanation += `\n\nYou need ${loanLevel.next.score - score} more points to reach Level ${loanLevel.next.level} and unlock $${loanLevel.next.amount} borrowing.`;
  }

  return explanation;
}

function answerQuestion(question, scoreData) {
  const q = question.toLowerCase();
  const { score, tier, walletAgeDays, txCount, monthlyActivity, protocolCount, balanceUsd, spend90d, canBorrow, loanLevel, breakdown } = scoreData;

  if (q.includes('why') && (q.includes('low') || q.includes('bad') || q.includes('poor'))) {
    const weakest = Object.entries(breakdown).filter(([key]) => FACTOR_LABELS[key]).sort((a, b) => (a[1] / FACTOR_LABELS[a[0]].max) - (b[1] / FACTOR_LABELS[b[0]].max));
    const top3 = weakest.slice(0, 3);
    let answer = `Your score of ${score} is primarily held back by:\n\n`;
    top3.forEach(([key, val]) => {
      const f = FACTOR_LABELS[key];
      const pct = Math.round((val / f.max) * 100);
      answer += `• **${f.name}**: Only ${pct}% of maximum (${val}/${f.max} pts)\n`;
    });
    answer += `\nFocus on improving these factors to see the biggest score gains.`;
    return answer;
  }

  if (q.includes('borrow') || q.includes('loan') || q.includes('how much')) {
    if (canBorrow) {
      return `With your score of ${score}, you qualify for **Level ${loanLevel.level}** borrowing — up to **$${loanLevel.amount}** in undercollateralized loans.\n\nTerms available: 7 days (12% APR), 14 days (10% APR), or 30 days (8% APR). A small SOL bond is required and refunded upon repayment.${loanLevel.next ? `\n\nReach ${loanLevel.next.score} points to unlock Level ${loanLevel.next.level} ($${loanLevel.next.amount} limit).` : ''}`;
    }
    return `Your score of ${score} ${score < 400 ? 'is below the 400 minimum threshold for borrowing' : 'qualifies, but you need at least $50 in 90-day on-chain spend'}. ${spend90d < 50 ? `You've spent ~$${spend90d.toFixed(2)} — you need $${(50 - spend90d).toFixed(2)} more.` : 'Increase your on-chain activity to improve your score.'}`;
  }

  if (q.includes('improve') || q.includes('increase') || q.includes('raise') || q.includes('better') || q.includes('boost')) {
    const weakest = Object.entries(breakdown).filter(([key]) => FACTOR_LABELS[key]).sort((a, b) => (a[1] / FACTOR_LABELS[a[0]].max) - (b[1] / FACTOR_LABELS[b[0]].max));
    const [key] = weakest[0];
    const tips = {
      age: 'Your wallet is relatively new. Keep using it — wallet age improves passively over time. 365+ days earns maximum points.',
      volume: `You have ${txCount} transactions. Make more swaps, transfers, and DeFi interactions. 500+ transactions earns maximum points.`,
      consistency: `You've been active in ${monthlyActivity} months. Transact at least once per month for 12+ months to maximize this factor.`,
      diversity: `You've used ${protocolCount} protocols. Try Jupiter, Raydium, Marinade, Tensor, or Orca to increase diversity.`,
      portfolio: `Your portfolio is $${balanceUsd.toFixed(2)}. Holding more SOL or SPL tokens increases this factor. $5,000+ earns maximum points.`,
    };
    return `Your weakest factor is **${FACTOR_LABELS[key].name}**.\n\n${tips[key]}\n\nAlso consider registering a .sol domain (+50 pts) or connecting your X account (+80 pts) through the Boost panel.`;
  }

  if (q.includes('protocol') || q.includes('diversity') || q.includes('dapp')) {
    return `You've interacted with ${protocolCount} unique protocols. This earns you ${breakdown.diversity}/${FACTOR_LABELS.diversity.max} points.\n\nPopular Solana protocols to try:\n• **Jupiter** — Token swaps\n• **Raydium** — AMM & liquidity\n• **Marinade** — SOL staking\n• **Tensor** — NFT marketplace\n• **Orca** — Concentrated liquidity\n\nEach new protocol interaction can add ~${Math.round(100 / 15)} points.`;
  }

  if (q.includes('score') && (q.includes('what') || q.includes('how') || q.includes('explain'))) {
    return generateExplanation(scoreData);
  }

  // Default: give overview
  return `Your Lendra score is **${score}** (${tier.label}). Here's a quick summary:\n\n• Wallet age: ${walletAgeDays} days\n• Transactions: ${txCount}\n• Active months: ${monthlyActivity}\n• Protocols used: ${protocolCount}\n• Portfolio: $${balanceUsd.toFixed(2)}\n• 90-day spend: $${spend90d.toFixed(2)}\n\n${canBorrow ? `You can borrow up to $${loanLevel.amount}.` : 'Complete the unlock steps to enable borrowing.'}\n\nAsk me "why is my score low?", "how can I improve?", or "how much can I borrow?" for detailed guidance.`;
}

// ─── On-Device Translation Engine ─────────────────────────────────────
// Client-side translation using template mapping. No API calls.

const TRANSLATIONS = {
  en: { name: 'English', flag: '🇬🇧' },
  ig: { name: 'Igbo', flag: '🇳🇬' },
  yo: { name: 'Yoruba', flag: '🇳🇬' },
  ha: { name: 'Hausa', flag: '🇳🇬' },
  fr: { name: 'French', flag: '🇫🇷' },
  es: { name: 'Spanish', flag: '🇪🇸' },
  ar: { name: 'Arabic', flag: '🇸🇦', dir: 'rtl' },
  zh: { name: 'Chinese', flag: '🇨🇳' },
};

// Key phrase translations for non-English languages
const PHRASE_MAP = {
  ig: {
    'Your Lendra credit score is': 'Akara ego Lendra gị bụ',
    'out of 870': 'n\'ime 870',
    'Score Breakdown': 'Nkọwa Akara',
    '3 Steps to Improve Your Score': 'Usoro 3 iji melite akara gị',
    'Wallet Age': 'Afọ obere akpa',
    'Transaction Volume': 'Ọnụ ọgụgụ azụmahịa',
    'Monthly Consistency': 'Ịdị n\'otu kwa ọnwa',
    'Protocol Diversity': 'Ụdị protocol dị iche iche',
    'Portfolio Value': 'Uru nke portfolio',
    'strong': 'siri ike',
    'moderate': 'ọ dị nta',
    'weak': 'adịghị ike',
    'very weak': 'adịghị ike nke ukwuu',
    'excellent': 'ọ dị mma nke ukwuu',
    'good': 'ọ dị mma',
    'fair': 'ọ dị nta',
    'poor': 'ọ jọrọ njọ',
  },
  yo: {
    'Your Lendra credit score is': 'Nọmba gbese Lendra rẹ jẹ',
    'out of 870': 'ninu 870',
    'Score Breakdown': 'Alaye Nọmba',
    '3 Steps to Improve Your Score': 'Igbesẹ 3 lati mu nọmba rẹ dara si',
    'Wallet Age': 'Ọjọ ori apamọwọ',
    'Transaction Volume': 'Iye idunadura',
    'Monthly Consistency': 'Iṣọkan oṣooṣu',
    'Protocol Diversity': 'Oriṣiriṣi ilana',
    'Portfolio Value': 'Iye portfolio',
    'strong': 'lagbara',
    'moderate': 'iwọntunwọnsi',
    'weak': 'alailagbara',
    'very weak': 'alailagbara pupọ',
  },
  ha: {
    'Your Lendra credit score is': 'Makin bashi na Lendra naka shine',
    'out of 870': 'daga cikin 870',
    'Score Breakdown': 'Bayanin Maki',
    '3 Steps to Improve Your Score': 'Matakai 3 don inganta makin ku',
    'Wallet Age': 'Shekarun walat',
    'Transaction Volume': 'Adadin ma\'amala',
    'Monthly Consistency': 'Daidaituwa ta wata-wata',
    'Protocol Diversity': 'Bambancin yarjejeniya',
    'Portfolio Value': 'Darajar portfolio',
  },
  fr: {
    'Your Lendra credit score is': 'Votre score de crédit Lendra est de',
    'out of 870': 'sur 870',
    'Score Breakdown': 'Détail du Score',
    '3 Steps to Improve Your Score': '3 étapes pour améliorer votre score',
    'Wallet Age': 'Âge du portefeuille',
    'Transaction Volume': 'Volume de transactions',
    'Monthly Consistency': 'Régularité mensuelle',
    'Protocol Diversity': 'Diversité des protocoles',
    'Portfolio Value': 'Valeur du portefeuille',
    'strong': 'fort',
    'moderate': 'modéré',
    'weak': 'faible',
    'very weak': 'très faible',
    'excellent': 'excellent',
    'good': 'bon',
    'fair': 'passable',
    'poor': 'faible',
  },
  es: {
    'Your Lendra credit score is': 'Tu puntuación crediticia Lendra es de',
    'out of 870': 'de 870',
    'Score Breakdown': 'Desglose de Puntuación',
    '3 Steps to Improve Your Score': '3 pasos para mejorar tu puntuación',
    'Wallet Age': 'Antigüedad de la billetera',
    'Transaction Volume': 'Volumen de transacciones',
    'Monthly Consistency': 'Consistencia mensual',
    'Protocol Diversity': 'Diversidad de protocolos',
    'Portfolio Value': 'Valor del portafolio',
    'strong': 'fuerte',
    'moderate': 'moderado',
    'weak': 'débil',
    'very weak': 'muy débil',
  },
  ar: {
    'Your Lendra credit score is': 'درجة ائتمان Lendra الخاصة بك هي',
    'out of 870': 'من 870',
    'Score Breakdown': 'تفصيل النتيجة',
    '3 Steps to Improve Your Score': '3 خطوات لتحسين نتيجتك',
    'Wallet Age': 'عمر المحفظة',
    'Transaction Volume': 'حجم المعاملات',
    'Monthly Consistency': 'الاتساق الشهري',
    'Protocol Diversity': 'تنوع البروتوكولات',
    'Portfolio Value': 'قيمة المحفظة',
    'strong': 'قوي',
    'moderate': 'متوسط',
    'weak': 'ضعيف',
    'very weak': 'ضعيف جداً',
  },
  zh: {
    'Your Lendra credit score is': '您的 Lendra 信用评分为',
    'out of 870': '（满分 870）',
    'Score Breakdown': '评分明细',
    '3 Steps to Improve Your Score': '提升评分的3个步骤',
    'Wallet Age': '钱包年龄',
    'Transaction Volume': '交易量',
    'Monthly Consistency': '月度一致性',
    'Protocol Diversity': '协议多样性',
    'Portfolio Value': '投资组合价值',
    'strong': '强',
    'moderate': '中等',
    'weak': '弱',
    'very weak': '非常弱',
    'excellent': '卓越',
    'good': '良好',
    'fair': '一般',
    'poor': '较差',
  },
};

function translateText(text, targetLang) {
  if (targetLang === 'en' || !PHRASE_MAP[targetLang]) return text;

  const phrases = PHRASE_MAP[targetLang];
  let translated = text;

  // Sort phrases by length (longest first) to avoid partial replacements
  const sortedPhrases = Object.entries(phrases).sort((a, b) => b[0].length - a[0].length);
  for (const [en, local] of sortedPhrases) {
    translated = translated.replaceAll(en, local);
  }

  return translated;
}

// ─── Browser Language Detection ───────────────────────────────────────

function detectBrowserLanguage() {
  const lang = navigator.language?.split('-')[0] || 'en';
  return TRANSLATIONS[lang] ? lang : 'en';
}

// ─── Speech Recognition (Web Speech API — on-device) ─────────────────

function getSpeechRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  return new SR();
}

// ─── Speech Synthesis (Web Speech API — on-device) ───────────────────

function speak(text, lang = 'en') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  // Strip markdown formatting for speech
  const clean = text
    .replace(/\*\*/g, '')
    .replace(/\*/g, '')
    .replace(/#{1,6}\s/g, '')
    .replace(/•/g, '')
    .replace(/\n+/g, '. ');

  const langMap = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar-SA', zh: 'zh-CN', ig: 'en-US', yo: 'en-US', ha: 'en-US' };

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
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const recognitionRef = useRef(null);
  const utteranceRef = useRef(null);

  const addMessage = useCallback((role, text) => {
    setMessages((prev) => [...prev, { role, text, id: Date.now() + Math.random() }]);
  }, []);

  // Simulate streaming token generation
  const streamResponse = useCallback((text, lang) => {
    return new Promise((resolve) => {
      setIsGenerating(true);
      const translated = translateText(text, lang);
      const words = translated.split(' ');
      let current = '';
      let idx = 0;
      const msgId = Date.now() + Math.random();

      setMessages((prev) => [...prev, { role: 'ai', text: '', id: msgId }]);

      const interval = setInterval(() => {
        const chunk = Math.min(3, words.length - idx);
        for (let i = 0; i < chunk; i++) {
          current += (current ? ' ' : '') + words[idx];
          idx++;
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === msgId ? { ...m, text: current } : m))
        );
        if (idx >= words.length) {
          clearInterval(interval);
          setIsGenerating(false);
          resolve(translated);
        }
      }, 30);
    });
  }, []);

  const explainScore = useCallback(async () => {
    if (!scoreData || isGenerating) return;
    addMessage('user', language === 'en' ? 'Explain my score' : 'Explain my score');
    const explanation = generateExplanation(scoreData);
    await streamResponse(explanation, language);
  }, [scoreData, language, isGenerating, addMessage, streamResponse]);

  const sendMessage = useCallback(async (text) => {
    if (!scoreData || isGenerating || !text.trim()) return;
    addMessage('user', text);
    const answer = answerQuestion(text, scoreData);
    await streamResponse(answer, language);
  }, [scoreData, language, isGenerating, addMessage, streamResponse]);

  const changeLanguage = useCallback((lang) => {
    setLanguage(lang);
    // Re-translate last AI message if exists
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== 'ai') return prev;
      // Find the original English text by looking at what was generated
      return prev; // Keep as-is; new messages will use new language
    });
  }, []);

  const startListening = useCallback(() => {
    const recognition = getSpeechRecognition();
    if (!recognition) {
      addMessage('system', 'Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const langMap = { en: 'en-US', fr: 'fr-FR', es: 'es-ES', ar: 'ar-SA', zh: 'zh-CN', ig: 'en-US', yo: 'en-US', ha: 'en-US' };
    recognition.lang = langMap[language] || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setIsListening(false);
      sendMessage(transcript);
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      if (event.error !== 'aborted') {
        addMessage('system', `Microphone error: ${event.error}. Check browser permissions.`);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    setIsListening(true);
    recognition.start();
  }, [language, sendMessage, addMessage]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsListening(false);
  }, []);

  const speakLastResponse = useCallback(() => {
    const lastAi = [...messages].reverse().find((m) => m.role === 'ai');
    if (!lastAi) return;

    if (isSpeaking) {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      return;
    }

    const utterance = speak(lastAi.text, language);
    if (utterance) {
      setIsSpeaking(true);
      utteranceRef.current = utterance;
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
    }
  }, [messages, language, isSpeaking]);

  const clearChat = useCallback(() => {
    setMessages([]);
    window.speechSynthesis?.cancel();
    setIsSpeaking(false);
  }, []);

  return {
    messages,
    language,
    isGenerating,
    isListening,
    isSpeaking,
    languages: TRANSLATIONS,
    explainScore,
    sendMessage,
    changeLanguage,
    startListening,
    stopListening,
    speakLastResponse,
    clearChat,
  };
}
