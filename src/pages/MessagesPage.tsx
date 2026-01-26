import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function MessagesPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-8 flex-1">
        <h1 className="text-3xl font-bold mb-8">Mensagens</h1>

        <div className="text-center py-20 text-muted-foreground">
          <p>Sistema de mensagens em desenvolvimento</p>
          <p className="text-sm mt-2">Use WhatsApp para contactar vendedores</p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
