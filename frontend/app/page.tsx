import BriefForm from '@/components/BriefForm';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50 px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <div className="mb-10">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 rounded-full bg-black flex items-center justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/suno-logo.svg" alt="Suno" className="w-9 h-auto" />
            </div>
            <span className="text-sm text-gray-500">Suno Investimentos</span>
          </div>
          <h1 className="text-3xl font-bold mb-3">Gerador de Carrossel</h1>
          <p className="text-gray-600">
            Cole um tema e uma notícia. O gerador transforma em carrossel pronto pra Instagram, no tom de voz da
            Suno. Você edita texto, cores e imagens antes de exportar.
          </p>
        </div>

        <BriefForm />
      </div>
    </main>
  );
}
