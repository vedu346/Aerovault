"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Message = {
  id: string;
  sender: "user" | "aiva";
  text: string;
  timestamp: Date;
};

export function AivaChatbot() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      sender: "aiva",
      text: "Hi, I am AIVA, your AeroVault AI assistant. How may I help you today?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    const newUserMsg: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: inputValue,
      timestamp: new Date()
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);
    setInputValue("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      if (!response.ok) {
        throw new Error("Network response was not ok");
      }

      const data = await response.json();
      
      const newAivaMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "aiva",
        text: data.reply || "I'm having trouble connecting to my systems right now. Please try again later.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, newAivaMsg]);

    } catch (error) {
      console.error("Chat error:", error);
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: "aiva",
        text: "Sorry, I encountered an error while processing your request.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSend();
    }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="mb-4 w-[350px] sm:w-[380px] h-[500px] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
            style={{
              background: "linear-gradient(135deg, rgba(15, 23, 42, 0.8), rgba(30, 58, 138, 0.7))",
              backdropFilter: "blur(16px)",
              WebkitBackdropFilter: "blur(16px)",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              boxShadow: "0 20px 40px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)"
            }}
          >
            {/* Header */}
            <div className="relative p-4 flex items-center justify-between border-b border-white/10 bg-slate-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-600 to-amber-400 p-[1px]">
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center relative overflow-hidden">
                    <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                    <div className="absolute inset-0 bg-blue-500/10 animate-[pulse_2s_ease-in-out_infinite]"></div>
                  </div>
                </div>
                <div>
                  <h3 className="font-semibold text-white bg-clip-text text-transparent bg-gradient-to-r from-blue-200 to-amber-200">AIVA Assistant</h3>
                  <p className="text-xs text-blue-200/70">AeroVault AI Support</p>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
                aria-label="Close Chat"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Chat Body */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
              {messages.map((msg) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  key={msg.id} 
                  className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div className={`max-w-[85%] p-3 text-sm shadow-md ${
                    msg.sender === "user" 
                      ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl rounded-tr-sm" 
                      : "bg-white/10 text-slate-100 rounded-2xl rounded-tl-sm border border-white/10 shadow-inner"
                  }`}>
                    {msg.sender === "user" ? (
                      msg.text
                    ) : (
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
                          ul: ({ children }) => <ul className="mb-2 list-disc pl-4 space-y-1">{children}</ul>,
                          ol: ({ children }) => <ol className="mb-2 list-decimal pl-4 space-y-1">{children}</ol>,
                          li: ({ children }) => <li>{children}</li>,
                          strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                          em: ({ children }) => <em className="italic">{children}</em>,
                          code: ({ children }) => (
                            <code className="rounded bg-slate-800/70 px-1.5 py-0.5 text-xs text-blue-100">{children}</code>
                          ),
                          a: ({ href, children }) => (
                            <a
                              href={href}
                              target="_blank"
                              rel="noreferrer"
                              className="text-blue-200 underline underline-offset-2"
                            >
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                    )}
                  </div>
                </motion.div>
              ))}
              {isTyping && (
                <motion.div 
                   initial={{ opacity: 0, y: 10 }}
                   animate={{ opacity: 1, y: 0 }}
                   className="flex justify-start"
                >
                  <div className="bg-white/10 border border-white/10 rounded-2xl rounded-tl-sm p-3 flex gap-1 items-center shadow-inner">
                    <span className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </motion.div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 border-t border-white/10 bg-slate-900/60 backdrop-blur-md">
              <div className="relative flex items-center">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-4 pr-12 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner"
                />
                <button 
                  onClick={handleSend}
                  disabled={!inputValue.trim()}
                  className="absolute right-1.5 p-2 rounded-full bg-gradient-to-r from-blue-600 to-sky-500 text-white hover:from-blue-500 hover:to-sky-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  aria-label="Send Message"
                >
                  <Send className="w-4 h-4 ml-0.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex items-center justify-center w-[60px] h-[60px] rounded-full shadow-2xl overflow-hidden group"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-tr from-slate-900 via-blue-800 to-sky-400 opacity-90 group-hover:opacity-100 transition-opacity"></div>
        {/* Border ring */}
        <div className="absolute inset-[1px] rounded-full bg-gradient-to-tr from-amber-400/60 via-blue-400/60 to-transparent"></div>
        {/* Inner background */}
        <div className="absolute inset-[2px] rounded-full bg-slate-900 flex items-center justify-center transition-colors shadow-inner">
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
                transition={{ duration: 0.2 }}
              >
                <X className="w-7 h-7 text-blue-100" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="relative"
              >
                <Sparkles className="w-7 h-7 text-amber-300 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {/* Subtle pulse animation when closed */}
        {!isOpen && (
          <div className="absolute inset-0 rounded-full border-2 border-blue-400/30 animate-ping"></div>
        )}
      </motion.button>
    </div>
  );
}
