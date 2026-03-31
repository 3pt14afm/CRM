import React, { useEffect, useRef, useState } from 'react';
import { router, usePage } from '@inertiajs/react';
import { Bot, Minus, RefreshCw, SendHorizonal, Sparkles, X } from 'lucide-react';

export default function FloatingRoiChatbot() {
  const { roiChat = {} } = usePage().props;

  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);

  const bodyRef = useRef(null);

  const messages = roiChat.messages || [];
  const sessionId = roiChat.sessionId || null;
  const printerOptions = roiChat.printerOptions || [];

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      setShowSuggestions(true);
    }
  }, [isOpen, messages.length]);

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages, printerOptions, isOpen]);

  const openChat = () => {
    setIsOpen(true);
    setIsAnimating(true);

    window.setTimeout(() => {
      setIsAnimating(false);
    }, 220);
  };

  const closeChat = () => {
    setIsOpen(false);
  };

  const sendMessage = (prefilled = null) => {
    const message = (prefilled ?? input).trim();
    if (!message || sending) return;

    setSending(true);
    setInput('');
    setShowSuggestions(false);

    router.post(
      route('roi.chat.message'),
      {
        session_id: sessionId,
        message,
      },
      {
        preserveScroll: true,
        preserveState: true,
        only: ['roiChat', 'flash'],
        onFinish: () => setSending(false),
      }
    );
  };

  const handlePrinterSelect = (printerId) => {
    if (sending) return;

    setSending(true);
    setShowSuggestions(false);

    router.post(
      route('roi.chat.message'),
      {
        session_id: sessionId,
        printer_model_id: printerId,
      },
      {
        preserveScroll: true,
        preserveState: true,
        only: ['roiChat', 'flash'],
        onFinish: () => setSending(false),
      }
    );
  };

  const resetChat = () => {
    router.post(
      route('roi.chat.reset'),
      {
        session_id: sessionId,
      },
      {
        preserveScroll: true,
        preserveState: true,
        only: ['roiChat', 'flash'],
      }
    );

    setShowSuggestions(true);
    setInput('');
  };

  const suggestions = [
    'Create draft for ABC Corp',
    'Show my draft summary',
  ];

  return (
    <div className="fixed bottom-14 right-10 z-50">
      {!isOpen ? (
        <button
          type="button"
          onClick={openChat}
          className="group flex h-14 w-14 items-center justify-center rounded-full border border-green-200 bg-white text-[#289800] shadow-2xl backdrop-blur-xl transition-all duration-200 hover:scale-[1.04] hover:bg-green-50 active:scale-[0.98]"
          aria-label="Open CRM Chatbot"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100/80">
            <Bot size={30} />
          </div>
        </button>
      ) : (
        <div
          className={`relative flex h-[580px] w-[390px] flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white text-slate-900 shadow-[0_24px_80px_rgba(15,23,42,0.16)] transition-all duration-200 ${
            isAnimating
              ? 'translate-y-2 scale-[0.97] opacity-0'
              : 'translate-y-0 scale-100 opacity-100'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 text-[#289800] ring-1 ring-inset ring-green-200">
                <Sparkles className="h-4.5 w-4.5" />
              </div>

              <div>
                <h3 className="text-sm font-semibold tracking-wide text-slate-900">
                  CRM Chatbot
                </h3>
                <p className="text-[11px] text-slate-500">
                  Proposal draft assistant
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={resetChat}
                className="rounded-full px-3 py-1.5 text-[11px] text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
              >
                Reset
              </button>

              <button
                type="button"
                onClick={closeChat}
                className="flex h-8 w-8 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Minimize CRM Chatbot"
              >
                <Minus className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div
            ref={bodyRef}
            className="flex-1 overflow-y-auto bg-slate-50/70 px-4 py-4"
          >
            <div className="space-y-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={`transition-all duration-200 ${
                    m.role === 'user' ? 'flex justify-end' : 'flex justify-start'
                  }`}
                >
                  <div
                    className={`max-w-[82%] whitespace-pre-wrap rounded-3xl px-4 py-3 text-[13px] leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-[#289800] text-white shadow-[0_8px_20px_rgba(34,197,94,0.20)]'
                        : 'border border-green-100 bg-green-50 text-slate-800 shadow-sm'
                    }`}
                  >
                    {m.content}
                  </div>
                </div>
              ))}

              {printerOptions.length > 0 && (
                <div className="flex justify-start">
                  <div className="max-w-[82%] rounded-3xl border border-green-100 bg-white px-3 py-3 shadow-sm">
                    <div className="mb-2 text-[11px] font-medium text-slate-500">
                      Select a printer from the database
                    </div>

                    <div className="flex flex-col gap-2">
                      {printerOptions.map((printer) => (
                        <button
                          key={printer.id}
                          type="button"
                          onClick={() => handlePrinterSelect(printer.id)}
                          className="rounded-xl border border-green-200 bg-green-50 px-3 py-2 text-left text-[12px] text-slate-800 transition hover:bg-green-100"
                        >
                          {printer.printer_name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="relative border-t border-slate-200 bg-white px-4 pb-4 pt-3">
            {messages.length === 0 && showSuggestions && (
              <div className="pointer-events-none absolute bottom-[78px] left-4 right-4 z-20">
                <div className="pointer-events-auto rounded-3xl p-3 animate-[fadeInUp_.22s_ease-out]">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-[11px] font-medium text-slate-500">
                      Suggestions
                    </span>

                    <button
                      type="button"
                      onClick={() => setShowSuggestions(false)}
                      className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
                      aria-label="Close suggestions"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
                    {suggestions.map((suggestion) => (
                      <button
                        key={suggestion}
                        type="button"
                        onClick={() => sendMessage(suggestion)}
                        className="shrink-0 rounded-full border border-green-200 bg-transparent px-3 py-2 text-xs text-[#289800] transition hover:bg-green-50"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-end gap-2 rounded-[24px] border border-slate-200 bg-white px-3 py-1 shadow-sm transition focus-within:border-green-300">
              <input
                type="text"
                value={input}
                disabled={sending}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') sendMessage();
                }}
                className="flex-1 border-none bg-transparent px-1 py-2 text-sm text-slate-800 outline-none placeholder:text-slate-400 focus:ring-0"
                placeholder="Ask CRM Chatbot to create a draft..."
              />

              <button
                type="button"
                onClick={() => sendMessage()}
                disabled={sending}
                className="flex h-10 w-10 items-center justify-center rounded-full bg-[#289800] text-white shadow-[0_8px_20px_rgba(34,197,94,0.22)] transition hover:bg-[#237f00] disabled:opacity-50"
                aria-label="Send message"
              >
                {sending ? (
                  <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                ) : (
                  <SendHorizonal className="h-4.5 w-4.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}