import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer style={{ backgroundColor: '#1a1a1a' }}>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-10">

          {/* Brand */}
          <div>
            <div className="flex items-center gap-4 mb-5">
              <img
                src="/brasao-sp.svg"
                alt="Governo do Estado de São Paulo"
                className="h-10"
                style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }}
              />
              <div className="w-px h-5 flex-shrink-0" style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
              <img
                src="/logo-recpsp.svg"
                alt="RECPSP"
                className="h-7"
                style={{ filter: 'brightness(0) invert(1)', opacity: 0.85 }}
              />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: '#9aa8c4' }}>
              Rede Estadual de Compras Públicas de São Paulo.<br />
              Promovendo boas práticas em licitações e contratos administrativos do Estado.
            </p>
          </div>

          {/* Institutional */}
          <div>
            <h4 className="font-montserrat text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: '#e2e8f0' }}>
              Transparência e Controle
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Ouvidoria', href: 'https://www.ouvidoria.sp.gov.br' },
                { label: 'Portal da Transparência', href: 'https://www.transparencia.sp.gov.br' },
                { label: 'Serviço de Informação ao Cidadão', href: 'https://www.sic.sp.gov.br' },
                { label: 'Acesso à Informação', href: 'https://www.transparencia.sp.gov.br/acesso-a-informacao' },
                { label: 'Termos de Uso e Privacidade', to: '/termos' },
              ].map(link => (
                <li key={link.label}>
                  {link.to ? (
                    <Link
                      to={link.to}
                      className="text-xs transition-colors"
                      style={{ color: '#9aa8c4' }}
                      onMouseEnter={e => e.target.style.color = '#ffffff'}
                      onMouseLeave={e => e.target.style.color = '#9aa8c4'}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs transition-colors"
                      style={{ color: '#9aa8c4' }}
                      onMouseEnter={e => e.target.style.color = '#ffffff'}
                      onMouseLeave={e => e.target.style.color = '#9aa8c4'}
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Useful links */}
          <div>
            <h4 className="font-montserrat text-xs font-semibold uppercase tracking-wider mb-5" style={{ color: '#e2e8f0' }}>
              Links Úteis
            </h4>
            <ul className="space-y-3">
              {[
                { label: 'Portal do Governo SP', href: 'https://www.sp.gov.br' },
                { label: 'Compras SP', href: 'https://compras.sp.gov.br' },
                { label: 'Modelos de Documentos', href: 'https://compras.sp.gov.br/agente-publico/toolkits-documentos-padronizados/' },
                { label: 'Vade Mecum Licitações', href: 'https://vademecum.lablogsp.org' },
                { label: 'Capacitação', to: '/capacitacao' },
              ].map(link => (
                <li key={link.label}>
                  {link.to ? (
                    <Link
                      to={link.to}
                      className="text-xs transition-colors"
                      style={{ color: '#9aa8c4' }}
                      onMouseEnter={e => e.target.style.color = '#ffffff'}
                      onMouseLeave={e => e.target.style.color = '#9aa8c4'}
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      href={link.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs transition-colors"
                      style={{ color: '#9aa8c4' }}
                      onMouseEnter={e => e.target.style.color = '#ffffff'}
                      onMouseLeave={e => e.target.style.color = '#9aa8c4'}
                    >
                      {link.label}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t pt-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
          <p className="text-xs" style={{ color: '#6b7a99' }}>
            © {new Date().getFullYear()} RECPSP — Governo do Estado de São Paulo. Todos os direitos reservados.
          </p>
          <div className="flex items-center gap-2">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: '#FF161F' }} />
            <p className="text-xs" style={{ color: '#6b7a99' }}>
              Rede Estadual de Compras Públicas de São Paulo
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
