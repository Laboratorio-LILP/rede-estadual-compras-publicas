import { Component } from 'react';
import { Link } from 'react-router-dom';

// Ultima linha de defesa do front. Sem isto, um erro em qualquer componente
// desmonta a arvore inteira e o usuario ve uma pagina em branco, sem mensagem
// e sem caminho de volta.
//
// Precisa ser classe: componentDidCatch e getDerivedStateFromError nao tem
// equivalente em hooks ate hoje.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { erro: null };
  }

  static getDerivedStateFromError(erro) {
    return { erro };
  }

  componentDidCatch(erro, info) {
    // Sem servico de telemetria na frente: o console e o registro disponivel.
    console.error('Erro nao tratado na interface:', erro, info?.componentStack);
  }

  render() {
    if (!this.state.erro) return this.props.children;

    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center px-4 text-center">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Algo deu errado nesta página</h1>
        <p className="text-gray-500 text-sm mb-6 max-w-md">
          O erro foi registrado. Você pode recarregar a página ou voltar ao início.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="bg-red-500 text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-red-600 transition"
          >
            Recarregar
          </button>
          <Link
            to="/"
            onClick={() => this.setState({ erro: null })}
            className="border border-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm font-semibold hover:bg-gray-50 transition"
          >
            Voltar ao Início
          </Link>
        </div>
      </div>
    );
  }
}
