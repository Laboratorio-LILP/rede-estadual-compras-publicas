import { Link } from 'react-router-dom';

export default function Breadcrumbs({ items, className = '' }) {
  return (
    <nav
      aria-label="Navegação estrutural"
      className={`text-sm text-gray-500 ${className}`}
    >
      <ol className="flex flex-wrap items-center gap-y-1">
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 items-center">
              {index > 0 && (
                <svg
                  className="mx-2 h-3.5 w-3.5 flex-shrink-0 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              )}
              {item.to && !isCurrent ? (
                <Link to={item.to} className="transition hover:text-[#034EA2]">
                  {item.label}
                </Link>
              ) : (
                <span
                  className="font-medium text-gray-700"
                  aria-current={isCurrent ? 'page' : undefined}
                  style={item.color ? { color: item.color } : undefined}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
