// Page header component for consistent page layouts
interface PageHeaderProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  breadcrumbs?: Array<{
    name: string;
    href?: string;
  }>;
}

export default function PageHeader({ title, description, action, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="bg-white shadow-sm border-b border-gray-200">
      <div className="px-4 sm:px-6 lg:px-8 py-6">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-2">
              {breadcrumbs.map((crumb, index) => (
                <li key={crumb.name} className="flex items-center">
                  {index > 0 && (
                    <span className="text-gray-400 mx-2">/</span>
                  )}
                  {crumb.href ? (
                    <a
                      href={crumb.href}
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      {crumb.name}
                    </a>
                  ) : (
                    <span className="text-sm text-gray-500">{crumb.name}</span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {description && (
              <p className="mt-1 text-sm text-gray-600">{description}</p>
            )}
          </div>
          {action && (
            <div className="flex-shrink-0">
              {action}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}