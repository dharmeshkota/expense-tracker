import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Sparkles, Send, X, Bot, User, Loader2, MinusCircle, Maximize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';
import { format } from 'date-fns';
import { GoogleGenAI } from "@google/genai";
import { useStore } from '@/store/useStore';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistant() {
  const { expenses, settings, user } = useStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Hi! I am your AI Financial Assistant. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const ai = useRef(new GoogleGenAI({ apiKey: (process as any).env.GEMINI_API_KEY || '' }));

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const today = new Date();
      const currentMonth = format(today, 'MMMM yyyy');

      // Fetch fresh expenses directly from server to ensure data accuracy and privacy
      const expensesRes = await fetch('/api/expenses?limit=100&page=1');
      let contextExpenses = expenses; // Fallback to store if fetch fails
      if (expensesRes.ok) {
        const data = await expensesRes.json();
        contextExpenses = data.expenses;
      }

      const systemInstruction = `
        You are an AI Financial Advisor for ExpensePro. 
        Current System Time: ${format(today, 'EEEE, MMMM dd, yyyy HH:mm')}
        Current Context Month: ${currentMonth}

        Current User Identity:
        - Name: ${user?.name || 'User'}
        - Email: ${user?.email || 'N/A'}
        - User ID: ${user?.id || 'N/A'}

        User Data Context:
        - Recent Expenses (Top 100): ${JSON.stringify(contextExpenses.slice(0, 100).map(e => ({ desc: e.description, amount: e.amount, category: e.category, date: e.date, type: e.type })))}
        - Monthly Budget Goal: ${settings.monthlyBudget} ${settings.currency}
        - Preferred Currency: ${settings.currency}
        
        Strict Rules for Data Grounding:
        1. GROUNDING: You MUST only use the 'Recent Expenses' list provided above. Do NOT invent, assume, or retrieve any other transaction data.
        2. NO HALLUCINATION: If the list provided is empty or doesn't contain data for a specific period, say so. Do NOT provide generic summaries or summaries for other hypothetical users.
        3. IDENTITY: You are talking to ${user?.name}. Never refer to data that doesn't belong to them.
        4. SUMMARY LOGIC: When asked to summarize "this month" (${currentMonth}), only look at expenses where the date is in ${format(today, 'yyyy-MM')}.
        5. TONE: Be concise, helpful, and professional.
        6. NO DATA: If the expense list is empty, politely inform the user to add some transactions first.
      `;

      const chatHistory = messages.map(m => ({
        role: m.role === 'assistant' ? 'model' as const : 'user' as const,
        parts: [{ text: m.content }]
      }));

      const response = await ai.current.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [...chatHistory, { role: 'user', parts: [{ text: userMessage }] }],
        config: {
          systemInstruction
        }
      });

      if (response && response.text) {
        setMessages(prev => [...prev, { role: 'assistant', content: response.text }]);
      } else {
        throw new Error('No response text generated');
      }
    } catch (error) {
      console.error('AI error:', error);
      toast.error('AI Assistant encountered an error');
      setMessages(prev => [...prev, { role: 'assistant', content: "I'm sorry, I encountered an error. It might be due to API limits or configuration. Please try again later." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Button
        onClick={() => {
          setIsOpen(true);
          setIsMinimized(false);
        }}
        className={cn(
          "fixed bottom-20 right-4 md:bottom-6 md:right-6 h-14 w-14 rounded-full shadow-2xl shadow-primary/30 z-50 transition-all hover:scale-110 active:scale-95 group bg-primary text-primary-foreground",
          isOpen && "scale-0 opacity-0 pointer-events-none"
        )}
      >
        <Sparkles className="h-6 w-6 group-hover:rotate-12 transition-transform" />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ 
              opacity: 1, 
              y: 0, 
              scale: 1,
              height: isMinimized ? 'auto' : '500px'
            }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className={cn(
              "fixed bottom-20 right-4 md:bottom-6 md:right-6 w-[calc(100vw-32px)] md:w-96 z-50 overflow-hidden shadow-2xl rounded-3xl border border-primary/20",
              isMinimized && "md:w-64"
            )}
          >
            <Card className="border-none h-full bg-background/95 backdrop-blur-xl">
              <CardHeader className="p-4 border-b bg-primary text-primary-foreground flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-xl bg-white/20 flex items-center justify-center">
                    <Bot className="h-5 w-5" />
                  </div>
                  <div>
                    <CardTitle className="text-sm font-black">AI Assistant</CardTitle>
                    <div className="flex items-center gap-1">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      <span className="text-[10px] opacity-70">Online</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg hover:bg-white/20 text-white"
                    onClick={() => setIsMinimized(!isMinimized)}
                  >
                    {isMinimized ? <Maximize2 className="h-4 w-4" /> : <MinusCircle className="h-4 w-4" />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-lg hover:bg-white/20 text-white"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>

              {!isMinimized && (
                <>
                  <CardContent className="p-0 overflow-hidden h-[360px]">
                    <div 
                      ref={scrollRef}
                      className="h-full overflow-y-auto p-4 space-y-4 scroll-smooth"
                    >
                      {messages.map((m, i) => (
                        <div
                          key={i}
                          className={cn(
                            "flex gap-3",
                            m.role === 'user' ? "flex-row-reverse" : "flex-row"
                          )}
                        >
                          <div className={cn(
                            "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-1",
                            m.role === 'assistant' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                          )}>
                            {m.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                          </div>
                          <div className={cn(
                            "p-3 rounded-2xl max-w-[85%] text-sm",
                            m.role === 'assistant' 
                              ? "bg-muted/50 rounded-tl-none prose prose-slate prose-sm dark:prose-invert" 
                              : "bg-primary text-primary-foreground rounded-tr-none ml-auto"
                          )}>
                            <Markdown>{m.content}</Markdown>
                          </div>
                        </div>
                      ))}
                      {isLoading && (
                        <div className="flex gap-3">
                          <div className="h-7 w-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0 mt-1">
                            <Bot className="h-4 w-4" />
                          </div>
                          <div className="bg-muted/50 p-3 rounded-2xl rounded-tl-none">
                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter className="p-3 border-t bg-muted/30">
                    <form 
                      onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                      className="flex w-full gap-2"
                    >
                      <Input
                        placeholder="Ask anything about your expenses..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="rounded-xl border-none bg-background shadow-sm h-10"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSend();
                          }
                        }}
                      />
                      <Button 
                        type="submit"
                        size="icon" 
                        className="rounded-xl shrink-0 h-10 w-10 shadow-lg shadow-primary/20"
                        disabled={!input.trim() || isLoading}
                        onClick={(e) => {
                          e.preventDefault();
                          handleSend();
                        }}
                      >
                        <Send className="h-4 w-4" />
                      </Button>
                    </form>
                  </CardFooter>
                </>
              )}
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
