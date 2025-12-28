"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatbotInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy el asistente de comisiones de Win Telecom. Puedo ayudarte a consultar información sobre comisiones, ventas y agencias. ¿En qué puedo ayudarte hoy?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  // Auto-scroll al último mensaje
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollElement = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollElement) {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chatbot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: input,
          conversationHistory: messages,
        }),
      });

      if (!response.ok) {
        throw new Error('Error en la respuesta del servidor');
      }

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.response,
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: "Error",
        description: "No pude procesar tu mensaje. Por favor, intenta de nuevo.",
        variant: "destructive",
      });

      const errorMessage: Message = {
        role: 'assistant',
        content: 'Lo siento, hubo un error al procesar tu mensaje. Por favor, intenta de nuevo.',
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <Card className="h-[calc(100vh-12rem)] flex flex-col border-0 shadow-xl bg-gradient-to-br from-white to-orange-50/20 dark:from-slate-900 dark:to-slate-800">
      <CardHeader className="pb-4 border-b bg-gradient-to-r from-[#f53c00] to-[#ffa700] text-white rounded-t-lg">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-white/20 rounded-lg">
            <Bot className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-xl font-bold">Chatbot IA - Comisiones</CardTitle>
            <CardDescription className="text-orange-100">
              Consulta información sobre comisiones, ventas y agencias
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Área de mensajes */}
        <ScrollArea ref={scrollAreaRef} className="flex-1 p-4">
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {message.role === 'assistant' && (
                  <Avatar className="h-8 w-8 border-2 border-orange-200">
                    <AvatarFallback className="bg-gradient-to-br from-[#f53c00] to-[#ff8300] text-white">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}

                <div
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-br from-[#f53c00] to-[#ff8300] text-white'
                      : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                  }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {/* Procesar markdown básico */}
                        {line.startsWith('**') && line.endsWith('**') ? (
                          <strong>{line.replace(/\*\*/g, '')}</strong>
                        ) : line.startsWith('• ') ? (
                          <div className="ml-2">• {line.substring(2)}</div>
                        ) : line.startsWith('📊') ? (
                          <div className="font-semibold text-base mb-2">{line}</div>
                        ) : (
                          line
                        )}
                        {i < message.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                {message.role === 'user' && (
                  <Avatar className="h-8 w-8 border-2 border-blue-200">
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 justify-start">
                <Avatar className="h-8 w-8 border-2 border-orange-200">
                  <AvatarFallback className="bg-gradient-to-br from-[#f53c00] to-[#ff8300] text-white">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="max-w-[75%] rounded-2xl px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                  <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="text-sm">Pensando...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Área de input */}
        <div className="border-t bg-white dark:bg-slate-900 p-4">
          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Escribe tu pregunta... (ej: ¿Cuánto comisionó ALIV en agosto?)"
              disabled={loading}
              className="flex-1 border-slate-300 dark:border-slate-600 focus-visible:ring-[#f53c00]"
            />
            <Button
              onClick={handleSendMessage}
              disabled={loading || !input.trim()}
              className="bg-gradient-to-r from-[#f53c00] to-[#ff8300] hover:from-[#d43300] hover:to-[#e07600] text-white px-6"
            >
              {loading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                <Send className="h-5 w-5" />
              )}
            </Button>
          </div>

          {/* Sugerencias */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('¿Cuánto comisionó ALIV TELECOM en abril corte 1?')}
              disabled={loading}
              className="text-xs border-[#ff8300] text-[#f53c00] hover:bg-orange-50"
            >
              Ejemplo 1
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('¿Cuántas altas tuvo EXPORTEL en abril?')}
              disabled={loading}
              className="text-xs border-[#ff8300] text-[#f53c00] hover:bg-orange-50"
            >
              Ejemplo 2
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setInput('¿Qué agencias son GOLD?')}
              disabled={loading}
              className="text-xs border-[#ff8300] text-[#f53c00] hover:bg-orange-50"
            >
              Ejemplo 3
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

