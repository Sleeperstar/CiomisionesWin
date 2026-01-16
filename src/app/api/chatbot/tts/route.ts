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

    // Función para convertir monto a texto legible
    const formatMontoParaVoz = (match: string, monto: string): string => {
      // Remover comas de miles y convertir punto decimal
      // "695,489.79" -> "695489 con 79"
      const sinComas = monto.replace(/,/g, '');
      const partes = sinComas.split('.');
      if (partes.length === 2) {
        return `${partes[0]} soles con ${partes[1]} céntimos`;
      }
      return `${sinComas} soles`;
    };

    // Limpiar texto para mejor síntesis de voz
    const cleanText = text
      .replace(/[📊📅📈💵💰⚠️🔄🏷️🎤🏆🥇🥈🥉🆕🎁💳❌✅🏢🎯📞💻🎧]/g, '') // Remover emojis
      .replace(/━+/g, '') // Remover líneas decorativas
      // Convertir montos: "S/ 695,489.79" -> "695489 soles con 79 céntimos"
      .replace(/S\/\s*([\d,]+\.?\d*)/g, formatMontoParaVoz)
      .replace(/x(\d)/g, 'por $1') // "x2" -> "por 2"
      .replace(/%/g, ' por ciento') // "%" -> "por ciento"
      .replace(/\n{3,}/g, '\n\n') // Reducir saltos de línea múltiples
      .replace(/\n/g, '. ') // Convertir saltos de línea en pausas
      .replace(/\s{2,}/g, ' ') // Reducir espacios múltiples
      .trim();

    // Limitar longitud para evitar costos excesivos (máx ~4000 caracteres)
    const truncatedText = cleanText.length > 4000
      ? cleanText.substring(0, 4000) + '... El mensaje fue truncado por ser muy largo.'
      : cleanText;

    // Llamar a OpenAI TTS API
    // Usamos tts-1 en lugar de tts-1-hd para mayor velocidad
    // Usamos voz 'alloy' que pronuncia mejor el español
    const mp3Response = await openai.audio.speech.create({
      model: 'tts-1',  // Más rápido que tts-1-hd
      voice: 'alloy',  // Mejor pronunciación en español que nova
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
