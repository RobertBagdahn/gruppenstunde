import { Link } from 'react-router-dom';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
  /** Optional action element rendered on the right (e.g. delete button) */
  action?: React.ReactNode;
}

export default function Breadcrumb({ items, action }: BreadcrumbProps) {
  return (
    <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <span key={i} className="flex items-center gap-2 min-w-0">
            {i > 0 && <span>/</span>}
            {isLast || !item.href ? (
              <span className="text-foreground font-semibold truncate">{item.label}</span>
            ) : (
              <Link to={item.href} className="hover:text-primary transition-colors whitespace-nowrap">
                {item.label}
              </Link>
            )}
          </span>
        );
      })}
      {action && <div className="ml-auto">{action}</div>}
    </nav>
  );
}
