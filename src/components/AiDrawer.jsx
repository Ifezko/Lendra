import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Brain,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Send,
  Sparkles,
  Globe,
  ChevronDown,
  Trash2,
  Lock,
} from 'lucide-react';
import { useLocalAi, getUiString } from '../hooks/useLocalAi';

function MarkdownText({ text }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
      {lines.map((line, i) => {
        if (!line.trim()) return <div key={i} className="h-1" />;

        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        const rendered = parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <span key={j} className="font-semibold text-white">
                {part.slice(2, -2)}
              </span>
            );
          }
          return part;
        });

        const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-');
        const isNumbered = /^\d+\./.test(line.trim());

        if (isBullet) {
          return (
            <p key={i} className="text-xs leading-relaxed pl-2 text-slate-200">
              {rendered}
            </p>
          );
        }
        if (isNumbered) {
          return (
            <p key={i} className="text-xs leading-relaxed pl-1 text-slate-200">
              {rendered}
            </p>
          );
        }
        return (
          <p key={i} className="text-xs leading-relaxed text-slate-200">
            {rendered}
          </p>
        );
      })}
    </div>
  );
}

function WaveAnimation() {
  return (
    <div className="flex items-center gap-0.5 h-4">
      {[...Array(5)].map((_, i) => (
        <motion.div
          key={i}
          className="w-0.5 bg-brand-accent rounded-full"
          animate={{
            height: [4, 16, 4],
          }}
          transition={{
            duration: 0.6,
            repeat: Infinity,
            delay: i * 0.1,
            ease: 'easeInOut',
          }}
        />
      ))}
    </div>
  );
}

export default function AiDrawer({ isOpen, onClose, scoreData }) {
  const {
    messages,
    language,
    isGenerating,
    isThinking,
    isListening,
    isSpeaking,
    followUps,
    languages,
    explainScore,
    sendMessage,
    changeLanguage,
    startListening,
    stopListening,
    speakLastResponse,
    clearChat,
  } = useLocalAi(scoreData);

  const isBusy = isGenerating || isThinking;

  const [input, setInput] = useState('');
  const [showLangMenu, setShowLangMenu] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const handleSend = () => {
    if (!input.trim() || isBusy) return;
    sendMessage(input.trim());
    setInput('');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const currentLang = languages[language];

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[420px] bg-brand-bg border-l border-brand-border z-50 flex flex-col"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-brand-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-accent to-brand-accentDark flex items-center justify-center">
                  <Brain className="w-4 h-4 text-white" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-white">{getUiString(language, 'headerTitle')}</h2>
                  <p className="text-[10px] text-slate-400">{getUiString(language, 'headerSub')}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Language Selector */}
                <div className="relative">
                  <button
                    onClick={() => setShowLangMenu(!showLangMenu)}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-brand-card border border-brand-border text-xs text-brand-text hover:border-brand-accent/30 transition-colors"
                  >
                    <Globe className="w-3 h-3 text-brand-accent" />
                    <span>{currentLang.flag}</span>
                    <span className="hidden sm:inline">{currentLang.name}</span>
                    <ChevronDown className="w-3 h-3 text-brand-muted" />
                  </button>

                  <AnimatePresence>
                    {showLangMenu && (
                      <motion.div
                        className="absolute right-0 top-full mt-1 w-44 bg-brand-card border border-brand-border rounded-xl shadow-xl overflow-hidden z-10"
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                      >
                        {Object.entries(languages).map(([code, lang]) => (
                          <button
                            key={code}
                            onClick={() => {
                              changeLanguage(code);
                              setShowLangMenu(false);
                            }}
                            className={`w-full flex items-center gap-2 px-3 py-2 text-xs text-left hover:bg-brand-cardHover transition-colors ${
                              language === code
                                ? 'bg-brand-accent/10 text-brand-accent'
                                : 'text-brand-text'
                            }`}
                          >
                            <span className="text-sm">{lang.flag}</span>
                            <span>{lang.name}</span>
                            {language === code && (
                              <span className="ml-auto text-brand-accent text-[10px]">●</span>
                            )}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Clear */}
                {messages.length > 0 && (
                  <button
                    onClick={clearChat}
                    className="p-1.5 rounded-lg text-brand-muted hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    title="Clear chat"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {/* Close */}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg text-brand-muted hover:text-white hover:bg-brand-cardHover transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-accent/20 to-brand-accentDark/20 flex items-center justify-center mb-4">
                    <Brain className="w-8 h-8 text-brand-accent" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">
                    {getUiString(language, 'askAboutScore')}
                  </h3>
                  <p className="text-xs text-slate-400 mb-6 max-w-xs">
                    {getUiString(language, 'getInsights')}
                  </p>

                  {scoreData && (
                    <button
                      onClick={explainScore}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-brand-accent text-[#0A0A0F] text-sm font-semibold hover:opacity-90 transition-opacity mb-4"
                    >
                      <Sparkles className="w-4 h-4" />
                      {getUiString(language, 'explainMyScore')}
                    </button>
                  )}

                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      { key: 'chipLow', fallback: 'Why is my score low?' },
                      { key: 'chipImprove', fallback: 'How can I improve?' },
                      { key: 'chipBorrow', fallback: 'How much can I borrow?' },
                      { key: 'chipBond', fallback: 'What bond do I need?' },
                      { key: 'chipLevel', fallback: 'How do I unlock next level?' },
                      { key: 'chipPartners', fallback: 'What partners help my score?' },
                    ].map(({ key, fallback }) => {
                      const label = getUiString(language, key);
                      return (
                        <button
                          key={key}
                          onClick={() => sendMessage(fallback)}
                          disabled={!scoreData}
                          className="px-3 py-1.5 rounded-lg bg-brand-card border border-brand-border text-xs text-slate-300 hover:text-white hover:border-brand-accent/30 transition-colors disabled:opacity-30"
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {messages.map((msg) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'system' ? (
                    <div className="w-full text-center">
                      <p className="text-[10px] text-yellow-400 bg-yellow-400/5 rounded-lg px-3 py-1.5 inline-block">
                        {msg.text}
                      </p>
                    </div>
                  ) : msg.role === 'user' ? (
                    <div className="max-w-[85%] bg-brand-accent/15 border border-brand-accent/20 rounded-2xl rounded-br-md px-3.5 py-2.5">
                      <p className="text-xs text-white">{msg.text}</p>
                    </div>
                  ) : (
                    <div className="max-w-[90%] bg-brand-card border border-brand-border rounded-2xl rounded-bl-md px-3.5 py-2.5">
                      <MarkdownText text={msg.text} />
                    </div>
                  )}
                </motion.div>
              ))}

              {isThinking && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex justify-start"
                >
                  <div className="bg-brand-card border border-brand-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Brain className="w-3.5 h-3.5 text-brand-accent animate-pulse" />
                      <span className="text-xs text-brand-muted">{getUiString(language, 'thinking')}</span>
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-brand-accent"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-brand-accent"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-brand-accent"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </motion.div>
              )}

              {isGenerating && messages[messages.length - 1]?.text === '' && !isThinking && (
                <div className="flex justify-start">
                  <div className="bg-brand-card border border-brand-border rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex items-center gap-2">
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-brand-accent"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-brand-accent"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                      />
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full bg-brand-accent"
                        animate={{ opacity: [0.3, 1, 0.3] }}
                        transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {followUps.length > 0 && !isBusy && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap gap-1.5 pt-1"
                >
                  {followUps.map((fu, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(fu)}
                      className="px-2.5 py-1 rounded-lg bg-brand-accent/10 border border-brand-accent/20 text-[11px] text-brand-accent hover:bg-brand-accent/20 transition-colors"
                    >
                      {fu}
                    </button>
                  ))}
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="border-t border-brand-border px-4 py-3">
              {/* Voice / Speaker Controls */}
              <div className="flex items-center gap-2 mb-2.5">
                <button
                  onClick={isListening ? stopListening : startListening}
                  disabled={isBusy || !scoreData}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    isListening
                      ? 'bg-red-500/15 text-red-400 border border-red-500/30'
                      : 'bg-brand-card border border-brand-border text-brand-muted hover:text-white hover:border-brand-accent/30'
                  } disabled:opacity-30 disabled:cursor-not-allowed`}
                >
                  {isListening ? (
                    <>
                      <MicOff className="w-3.5 h-3.5" />
                      <WaveAnimation />
                      <span>{getUiString(language, 'stop')}</span>
                    </>
                  ) : (
                    <>
                      <Mic className="w-3.5 h-3.5" />
                      <span>{getUiString(language, 'speak')}</span>
                    </>
                  )}
                </button>

                {messages.some((m) => m.role === 'ai') && (
                  <button
                    onClick={speakLastResponse}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      isSpeaking
                        ? 'bg-brand-accent/15 text-brand-accent border border-brand-accent/30'
                        : 'bg-brand-card border border-brand-border text-slate-300 hover:text-white hover:border-brand-accent/30'
                    }`}
                  >
                    {isSpeaking ? (
                      <>
                        <VolumeX className="w-3.5 h-3.5" />
                        <span>{getUiString(language, 'stop')}</span>
                      </>
                    ) : (
                      <>
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>{getUiString(language, 'listen')}</span>
                      </>
                    )}
                  </button>
                )}

                {language !== 'en' && (
                  <span className="text-[10px] text-brand-accent ml-auto flex items-center gap-1">
                    <Globe className="w-3 h-3" />
                    {getUiString(language, 'translatedLocally')}
                  </span>
                )}
              </div>

              {/* Text Input */}
              <div className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={scoreData ? getUiString(language, 'placeholder') : getUiString(language, 'placeholderNoWallet')}
                  disabled={!scoreData || isBusy}
                  className="flex-1 bg-brand-card border border-brand-border rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-brand-muted/50 focus:outline-none focus:border-brand-accent/40 transition-colors disabled:opacity-40"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isBusy || !scoreData}
                  className="w-9 h-9 rounded-xl bg-brand-accent flex items-center justify-center text-[#0A0A0F] hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>

              {/* Privacy Badge */}
              <div className="flex items-center justify-center gap-1.5 mt-2.5">
                <Lock className="w-3 h-3 text-green-500" />
                <span className="text-[10px] text-brand-muted">
                  {getUiString(language, 'privacyBadge')}
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
