"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, Bot, User, Loader2, Mic, MicOff, Volume2, VolumeX } from 'lucide-react';
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

// Función para renderizar una línea con formato markdown básico
function renderLine(line: string): React.ReactNode {
  // Si la línea es un separador
  if (line === '---') {
    return <hr className="my-2 border-slate-300 dark:border-slate-600" />;
  }

  // Procesar negritas **texto**
  const parts = line.split(/(\*\*[^*]+\*\*)/g);

  return (
    <span>
      {parts.map((part, idx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          // Es texto en negrita
          return <strong key={idx} className="font-semibold">{part.slice(2, -2)}</strong>;
        }
        return <span key={idx}>{part}</span>;
      })}
    </span>
  );
}

// Declaración para TypeScript del Web Speech API
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}

interface SpeechRecognitionResultList {
  length: number;
  item(index: number): SpeechRecognitionResult;
  [index: number]: SpeechRecognitionResult;
}

interface SpeechRecognitionResult {
  length: number;
  item(index: number): SpeechRecognitionAlternative;
  [index: number]: SpeechRecognitionAlternative;
  isFinal: boolean;
}

interface SpeechRecognitionAlternative {
  transcript: string;
  confidence: number;
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: Event) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognition;
    webkitSpeechRecognition: new () => SpeechRecognition;
  }
}

export default function ChatbotInterface() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: '¡Hola! Soy el asistente de comisiones de Win Telecom. Puedo ayudarte a consultar información sobre comisiones, ventas y agencias. ¿En qué puedo ayudarte hoy? 🎤 También puedes hablarme usando el micrófono.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [autoSpeak, setAutoSpeak] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
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

  // Inicializar reconocimiento de voz
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognitionAPI) {
        recognitionRef.current = new SpeechRecognitionAPI();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = true;
        recognitionRef.current.lang = 'es-ES';

        recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
          const transcript = Array.from(event.results)
            .map(result => result[0].transcript)
            .join('');

          setInput(transcript);

          // Si es resultado final, enviar automáticamente
          if (event.results[event.results.length - 1].isFinal) {
            setIsListening(false);
          }
        };

        recognitionRef.current.onerror = () => {
          setIsListening(false);
          toast({
            title: "Error de micrófono",
            description: "No se pudo acceder al micrófono. Verifica los permisos.",
            variant: "destructive",
          });
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [toast]);

  // Función para iniciar/detener reconocimiento de voz
  const toggleListening = useCallback(() => {
    if (!recognitionRef.current) {
      toast({
        title: "No disponible",
        description: "Tu navegador no soporta reconocimiento de voz.",
        variant: "destructive",
      });
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setInput('');
      recognitionRef.current.start();
      setIsListening(true);
    }
  }, [isListening, toast]);

  // Referencia al elemento de audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);

  // Función para leer texto en voz alta usando OpenAI TTS
  const speakText = useCallback(async (text: string) => {
    // Si ya está generando audio, no hacer nada
    if (isGeneratingAudio) return;

    try {
      setIsGeneratingAudio(true);
      setIsSpeaking(true);

      // Llamar al endpoint de TTS
      const response = await fetch('/api/chatbot/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        throw new Error('Error generando audio');
      }

      // Obtener el audio como blob
      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);

      // Crear o reutilizar el elemento de audio
      if (audioRef.current) {
        audioRef.current.pause();
        URL.revokeObjectURL(audioRef.current.src);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;

      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        toast({
          title: "Error de audio",
          description: "No se pudo reproducir el audio.",
          variant: "destructive",
        });
      };

      await audio.play();

    } catch (error) {
      console.error('Error en TTS:', error);
      setIsSpeaking(false);
      toast({
        title: "Error",
        description: "No se pudo generar el audio. Verifica tu conexión.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAudio(false);
    }
  }, [isGeneratingAudio, toast]);

  // Detener la reproducción de audio
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      URL.revokeObjectURL(audioRef.current.src);
      audioRef.current = null;
    }
    setIsSpeaking(false);
    setIsGeneratingAudio(false);
  }, []);

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

      // Si autoSpeak está activado, leer la respuesta
      if (autoSpeak) {
        setTimeout(() => speakText(data.response), 500);
      }

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
                className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'
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
                  className={`max-w-[75%] rounded-2xl px-4 py-3 ${message.role === 'user'
                    ? 'bg-gradient-to-br from-[#f53c00] to-[#ff8300] text-white'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100'
                    }`}
                >
                  <div className="text-sm whitespace-pre-wrap break-words">
                    {message.content.split('\n').map((line, i) => (
                      <React.Fragment key={i}>
                        {renderLine(line)}
                        {i < message.content.split('\n').length - 1 && <br />}
                      </React.Fragment>
                    ))}
                  </div>
                  {/* Botón para leer mensaje del asistente */}
                  {message.role === 'assistant' && (
                    <div className="mt-2 pt-2 border-t border-slate-200 dark:border-slate-600 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => speakText(message.content)}
                        disabled={isSpeaking || isGeneratingAudio}
                        className="text-xs text-slate-500 hover:text-[#f53c00]"
                      >
                        {isGeneratingAudio ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                            Generando...
                          </>
                        ) : isSpeaking ? (
                          <>
                            <Volume2 className="h-3 w-3 mr-1 animate-pulse" />
                            Reproduciendo...
                          </>
                        ) : (
                          <>
                            <Volume2 className="h-3 w-3 mr-1" />
                            🎧 Escuchar (IA)
                          </>
                        )}
                      </Button>
                    </div>
                  )}
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
          {/* Controles de voz */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAutoSpeak(!autoSpeak)}
                className={`text-xs ${autoSpeak ? 'bg-green-100 border-green-500 text-green-700' : ''}`}
              >
                {autoSpeak ? <Volume2 className="h-4 w-4 mr-1" /> : <VolumeX className="h-4 w-4 mr-1" />}
                {autoSpeak ? 'Voz ON' : 'Voz OFF'}
              </Button>
              {isSpeaking && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={stopSpeaking}
                  className="text-xs text-red-600 border-red-300"
                >
                  <VolumeX className="h-4 w-4 mr-1" />
                  Detener
                </Button>
              )}
            </div>
            {isListening && (
              <div className="flex items-center gap-2 text-sm text-red-600">
                <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                Escuchando...
              </div>
            )}
          </div>

          <div className="flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={isListening ? "Habla ahora..." : "Escribe tu pregunta o usa el micrófono 🎤"}
              disabled={loading || isListening}
              className={`flex-1 border-slate-300 dark:border-slate-600 focus-visible:ring-[#f53c00] ${isListening ? 'bg-red-50 border-red-300' : ''}`}
            />
            <Button
              onClick={toggleListening}
              disabled={loading}
              variant="outline"
              className={`px-3 ${isListening ? 'bg-red-100 border-red-500 text-red-600 animate-pulse' : 'border-[#ff8300] text-[#f53c00] hover:bg-orange-50'}`}
            >
              {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
            </Button>
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

