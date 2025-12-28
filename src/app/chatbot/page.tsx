import ChatbotInterface from '@/components/commissions/chatbot-interface';

export default function ChatbotPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-[#f53c00] to-[#ffa700] bg-clip-text text-transparent">
          Asistente IA de Comisiones
        </h1>
        <p className="text-muted-foreground mt-2">
          Pregunta sobre comisiones, ventas y agencias. El chatbot puede ayudarte a consultar datos históricos guardados.
        </p>
      </div>
      
      <ChatbotInterface />
    </div>
  );
}

