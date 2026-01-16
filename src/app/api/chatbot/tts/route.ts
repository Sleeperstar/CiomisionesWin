import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json(
        { error: 'Texto requerido' },
        { status: 400 }
      );
    }

    // Limpiar texto para mejor síntesis de voz
    const cleanText = text
      .replace(/[📊📅📈💵💰⚠️🔄🏷️🎤🏆🥇🥈🥉🆕🎁💳❌✅🏢🎯📞💻]/g, '') // Remover emojis
      .replace(/━+/g, '') // Remover líneas decorativas
      .replace(/S\//g, 'soles ') // Reemplazar símbolo de soles
      .replace(/x(\d)/g, 'por $1') // "x2" -> "por 2"
      .replace(/%/g, ' por ciento') // "%" -> "por ciento"
      .replace(/\n{3,}/g, '\n\n') // Reducir saltos de línea múltiples
      .trim();

    // Limitar longitud para evitar costos excesivos (máx ~4000 caracteres)
    const truncatedText = cleanText.length > 4000 
      ? cleanText.substring(0, 4000) + '... El mensaje fue truncado por ser muy largo.'
      : cleanText;

    // Llamar a OpenAI TTS API
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1-hd',
      voice: 'nova',
      input: truncatedText,
      response_format: 'mp3',
      speed: 1.0,
    });

    // Obtener el audio como ArrayBuffer
    const audioBuffer = await mp3Response.arrayBuffer();

    // Retornar el audio como respuesta
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    });

  } catch (error: unknown) {
    console.error('Error en TTS API:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    
    return NextResponse.json(
      { error: 'Error generando audio', details: errorMessage },
      { status: 500 }
    );
  }
}
