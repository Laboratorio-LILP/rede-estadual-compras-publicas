import { Link } from 'react-router-dom';

const SECTIONS = [
  {
    title: '1. Sobre a plataforma',
    body: `O Fórum RECPSP é um ambiente colaborativo da Rede Estadual de Compras Públicas de São
    Paulo, voltado a servidores, agentes públicos e demais interessados em contratações públicas.
    O uso da plataforma pressupõe a aceitação integral destes Termos de Uso e da Política de
    Privacidade descritos a seguir.`,
  },
  {
    title: '2. Cadastro e responsabilidade pela conta',
    body: `Ao se cadastrar, você declara que as informações fornecidas são verdadeiras e se
    compromete a mantê-las atualizadas. Você é responsável por todas as atividades realizadas com
    sua conta e deve manter sua senha em sigilo. Contas podem ser suspensas em caso de uso
    indevido, informações falsas ou violação destes Termos.`,
  },
  {
    title: '3. Conduta esperada',
    body: `Ao publicar tópicos, respostas ou qualquer conteúdo no fórum, você se compromete a:
    manter um diálogo respeitoso e profissional; não publicar conteúdo ofensivo, discriminatório,
    difamatório ou ilegal; não divulgar dados pessoais de terceiros sem consentimento; e não
    utilizar a plataforma para fins comerciais ou publicitários não autorizados. Conteúdos que
    violem estas regras podem ser removidos por moderadores ou administradores.`,
  },
  {
    title: '4. Conteúdo publicado',
    body: `Você mantém os direitos sobre o conteúdo que publica, mas concede à RECPSP uma licença
    não exclusiva para exibi-lo, distribuí-lo e moderá-lo dentro da plataforma. Tópicos com imagem
    ou vídeo enviados por usuários passam por análise de moderação antes da publicação.`,
  },
  {
    title: '5. Especialistas e respostas verificadas',
    body: `Usuários podem solicitar reconhecimento como especialista em um tema específico. A
    concessão é feita a critério da administração, mediante análise da justificativa apresentada, e
    pode ser revogada a qualquer momento em caso de uso inadequado do selo de resposta verificada.`,
  },
  {
    title: '6. Privacidade e uso de dados',
    body: `Coletamos apenas os dados necessários para o funcionamento do fórum: nome de usuário,
    e-mail, órgão/instituição, localização e, opcionalmente, biografia e categorias de interesse.
    Esses dados são utilizados para autenticação, personalização da experiência (como notificações
    e recomendações de tópicos) e comunicação institucional. Não compartilhamos seus dados com
    terceiros para fins comerciais.`,
  },
  {
    title: '7. Cookies e sessão',
    body: `A plataforma utiliza armazenamento local do navegador para manter sua sessão autenticada
    e lembrar preferências de exibição. Nenhum dado de navegação é utilizado para rastreamento
    publicitário.`,
  },
  {
    title: '8. Alterações nestes termos',
    body: `Estes Termos podem ser atualizados para refletir mudanças na plataforma ou na
    legislação aplicável. Alterações relevantes serão comunicadas aos usuários cadastrados.`,
  },
  {
    title: '9. Contato',
    body: `Dúvidas sobre estes Termos ou sobre o tratamento de dados pessoais podem ser
    encaminhadas pelos canais de Ouvidoria ou Serviço de Informação ao Cidadão do Governo do
    Estado de São Paulo, disponíveis no rodapé desta página.`,
  },
];

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <div className="text-sm text-gray-500 mb-4">
        <Link to="/" className="hover:text-[#034EA2]">Início</Link>
        <span className="mx-2 text-gray-300">/</span>
        <span className="font-medium text-gray-700">Termos de Uso</span>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-card px-6 sm:px-10 py-8 sm:py-10">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#034EA2' }}>
          Rede Estadual de Compras Públicas · SP
        </span>
        <h1 className="font-montserrat text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2 mb-3">
          Termos de Uso e Política de Privacidade
        </h1>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          Estas condições regulam o uso do Fórum RECPSP. Ao criar uma conta, você declara ter lido
          e concordado com o conteúdo abaixo.
        </p>

        <div className="space-y-6">
          {SECTIONS.map(s => (
            <div key={s.title}>
              <h2 className="font-montserrat text-base font-bold text-gray-900 mb-1.5">{s.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{s.body}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs text-gray-400">Última atualização: julho de 2026.</p>
          <Link
            to="/register"
            className="text-sm font-semibold px-4 py-2 rounded text-white transition hover:opacity-90"
            style={{ backgroundColor: '#FF161F' }}
          >
            Voltar ao cadastro
          </Link>
        </div>
      </div>
    </div>
  );
}
