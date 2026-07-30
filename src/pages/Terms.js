import { Link } from 'react-router-dom';
import Breadcrumbs from '../components/Breadcrumbs';

const SECTIONS = [
  {
    title: '1. Finalidade da Plataforma',
    content: [
      {
        type: 'paragraph',
        text: 'O Fórum RECPSP é um ambiente colaborativo destinado ao compartilhamento de informações, experiências, boas práticas e discussões relacionadas às contratações públicas.',
      },
      {
        type: 'paragraph',
        text: 'A plataforma tem como objetivo promover a integração, a troca de conhecimentos e o fortalecimento das redes de colaboração entre servidores públicos, agentes públicos e demais participantes vinculados à temática de compras e contratações governamentais.',
      },
    ],
  },
  {
    title: '2. Cadastro e Responsabilidade do Usuário',
    content: [
      {
        type: 'paragraph',
        text: 'Ao realizar o cadastro, o usuário declara que as informações fornecidas são verdadeiras e atualizadas.',
      },
      {
        type: 'paragraph',
        text: 'O usuário é responsável pela utilização de sua conta e pela guarda de suas credenciais de acesso, comprometendo-se a não compartilhar sua senha com terceiros.',
      },
      {
        type: 'paragraph',
        text: 'A administração da plataforma poderá suspender ou cancelar contas que apresentem informações incorretas, utilização indevida ou descumprimento destes Termos.',
      },
    ],
  },
  {
    title: '3. Conduta dos Participantes',
    content: [
      {
        type: 'paragraph',
        text: 'Ao utilizar o Fórum RECPSP, o usuário compromete-se a:',
      },
      {
        type: 'list',
        items: [
          'Manter um ambiente respeitoso, colaborativo e profissional;',
          'Utilizar linguagem adequada e compatível com o ambiente institucional;',
          'Não publicar conteúdo ofensivo, discriminatório, difamatório, ilegal ou que viole direitos de terceiros;',
          'Não divulgar informações sigilosas ou dados pessoais de terceiros sem autorização;',
          'Não utilizar a plataforma para fins comerciais, publicitários ou políticos não autorizados;',
          'Respeitar a legislação vigente e as normas aplicáveis à Administração Pública.',
        ],
      },
      {
        type: 'paragraph',
        text: 'A administração poderá remover conteúdos que violem estas diretrizes, sem prejuízo da adoção de outras medidas administrativas cabíveis.',
      },
    ],
  },
  {
    title: '4. Conteúdo Compartilhado',
    content: [
      {
        type: 'paragraph',
        text: 'Os conteúdos publicados pelos usuários permanecem sob sua responsabilidade.',
      },
      {
        type: 'paragraph',
        text: 'Ao publicar informações na plataforma, o usuário autoriza sua exibição, armazenamento, organização e moderação dentro do Fórum RECPSP.',
      },
      {
        type: 'paragraph',
        text: 'Publicações que contenham imagens, vídeos ou arquivos anexos poderão ser submetidas à análise prévia dos administradores antes de sua disponibilização.',
      },
    ],
  },
  {
    title: '5. Especialistas e Respostas Destacadas',
    content: [
      {
        type: 'paragraph',
        text: 'A administração do Fórum poderá atribuir identificações específicas a determinados usuários para fins de organização, moderação e destaque de conteúdos.',
      },
      {
        type: 'paragraph',
        text: 'A definição, manutenção e eventual remoção dessas identificações são de competência exclusiva da administração da plataforma.',
      },
    ],
  },
  {
    title: '6. Limitação de Responsabilidade e Aplicabilidade das Informações',
    content: [
      {
        type: 'paragraph',
        text: 'O Fórum RECPSP possui caráter colaborativo e informativo, destinando-se ao compartilhamento de conhecimentos, experiências e boas práticas entre seus participantes.',
      },
      {
        type: 'paragraph',
        text: 'As manifestações, opiniões, respostas, comentários e materiais publicados pelos usuários não representam, necessariamente, posicionamento oficial da Rede Estadual de Compras Públicas de São Paulo (RECPSP), da Secretaria de Gestão e Governo Digital (SGGD) ou dos órgãos aos quais os participantes estejam vinculados.',
      },
      {
        type: 'paragraph',
        text: 'Considerando que a plataforma reúne participantes de diferentes órgãos e instituições públicas, os procedimentos, interpretações, entendimentos e práticas compartilhados podem não ser aplicáveis a todos os contextos administrativos.',
      },
      {
        type: 'paragraph',
        text: 'Dessa forma, as informações disponibilizadas no Fórum RECPSP não substituem:',
      },
      {
        type: 'list',
        items: [
          'Legislação vigente;',
          'Regulamentos internos;',
          'Orientações institucionais;',
          'Pareceres jurídicos;',
          'Manifestações dos órgãos de controle;',
          'Decisões dos gestores competentes.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Cabe a cada órgão ou entidade avaliar a adequação das informações compartilhadas à sua realidade institucional e às normas aplicáveis ao caso concreto.',
      },
    ],
  },
  {
    title: '7. Privacidade e Proteção de Dados',
    content: [
      {
        type: 'paragraph',
        text: 'A plataforma coleta apenas os dados necessários para seu funcionamento e para a identificação dos usuários.',
      },
      {
        type: 'paragraph',
        text: 'Poderão ser coletadas as seguintes informações:',
      },
      {
        type: 'list',
        items: [
          'Nome;',
          'Endereço de e-mail;',
          'Órgão ou instituição de vínculo;',
          'Município ou localidade;',
          'Informações de perfil fornecidas voluntariamente pelo usuário.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Esses dados serão utilizados exclusivamente para:',
      },
      {
        type: 'list',
        items: [
          'Controle de acesso;',
          'Funcionamento da plataforma;',
          'Comunicação institucional;',
          'Personalização da experiência do usuário;',
          'Organização de conteúdos e notificações.',
        ],
      },
      {
        type: 'paragraph',
        text: 'Os dados não serão comercializados nem compartilhados com terceiros para fins comerciais.',
      },
    ],
  },
  {
    title: '8. Cookies e Sessão',
    content: [
      {
        type: 'paragraph',
        text: 'A plataforma utiliza recursos necessários para autenticação, manutenção da sessão do usuário e armazenamento de preferências de navegação.',
      },
      {
        type: 'paragraph',
        text: 'Esses recursos não são utilizados para publicidade ou rastreamento comercial.',
      },
    ],
  },
  {
    title: '9. Alterações dos Termos',
    content: [
      {
        type: 'paragraph',
        text: 'Os presentes Termos de Uso e Política de Privacidade poderão ser alterados a qualquer momento para adequação à legislação vigente, às necessidades da plataforma ou a melhorias de seus serviços.',
      },
      {
        type: 'paragraph',
        text: 'Alterações relevantes poderão ser comunicadas aos usuários cadastrados.',
      },
    ],
  },
  {
    title: '10. Contato',
    content: [
      {
        type: 'paragraph',
        text: 'Dúvidas, sugestões ou solicitações relacionadas à plataforma poderão ser encaminhadas aos administradores do Fórum RECPSP ou pelos canais oficiais do Governo do Estado de São Paulo.',
      },
    ],
  },
];

export default function Terms() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <Breadcrumbs
        className="mb-4"
        items={[
          { label: 'Início', to: '/' },
          { label: 'Termos de Uso e Política de Privacidade' },
        ]}
      />

      <div className="bg-white border border-gray-200 rounded-xl shadow-card px-6 sm:px-10 py-8 sm:py-10">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#034EA2' }}>
          Rede Estadual de Compras Públicas · SP
        </span>
        <h1 className="font-montserrat text-2xl sm:text-3xl font-extrabold text-gray-900 mt-2 mb-3">
          Termos de Uso e Política de Privacidade
        </h1>
        <p className="font-montserrat text-base font-semibold text-gray-700 mb-3">
          Fórum da Rede Estadual de Compras Públicas de São Paulo (RECPSP)
        </p>
        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          Estas condições regulam o uso do Fórum da Rede Estadual de Compras Públicas de São Paulo
          (RECPSP). Ao criar uma conta ou utilizar a plataforma, o usuário declara ter lido e
          concordado com os presentes Termos de Uso e Política de Privacidade.
        </p>

        <div className="space-y-6">
          {SECTIONS.map(section => (
            <div key={section.title}>
              <h2 className="font-montserrat text-base font-bold text-gray-900 mb-2">
                {section.title}
              </h2>
              <div className="space-y-2 text-sm text-gray-600 leading-relaxed">
                {section.content.map((item, index) => (
                  item.type === 'list' ? (
                    <ul key={index} className="list-disc space-y-1 pl-5">
                      {item.items.map(listItem => <li key={listItem}>{listItem}</li>)}
                    </ul>
                  ) : (
                    <p key={index}>{item.text}</p>
                  )
                ))}
              </div>
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
