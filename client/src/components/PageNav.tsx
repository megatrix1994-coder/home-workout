import { Link, useLocation, useNavigate } from 'react-router-dom';

type NavTarget = {
  to: string;
  label: string;
  name?: string;
};

export function PageNav({
  fallbackTo,
  previous,
  next,
  links = [],
}: {
  fallbackTo: string;
  previous?: NavTarget | null;
  next?: NavTarget | null;
  links?: NavTarget[];
}) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <nav aria-label="Page" className="mb-8 flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <button
          type="button"
          onClick={() => {
            if (location.key === 'default') {
              navigate(fallbackTo);
            } else {
              navigate(-1);
            }
          }}
          className="text-sm font-semibold hover:underline"
        >
          <span aria-hidden="true">← </span>
          Back
        </button>
        {previous || next ? (
          <div className="ml-auto flex flex-wrap items-center justify-end gap-x-5 gap-y-1">
            {previous ? (
              <Link
                to={previous.to}
                aria-label={previous.name ?? previous.label}
                className="text-sm font-semibold hover:underline"
              >
                <span aria-hidden="true">← </span>
                {previous.label}
              </Link>
            ) : null}
            {next ? (
              <Link
                to={next.to}
                aria-label={next.name ?? next.label}
                className="text-sm font-semibold text-accent hover:underline"
              >
                {next.label}
                <span aria-hidden="true"> →</span>
              </Link>
            ) : null}
          </div>
        ) : null}
      </div>
      {links.length > 0 ? (
        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted">
          {links.map((link, index) => (
            <span key={link.to} className="inline-flex items-center gap-3">
              {index > 0 ? (
                <span aria-hidden="true" className="text-line">
                  ·
                </span>
              ) : null}
              <Link to={link.to} className="hover:text-ink hover:underline">
                {link.label}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
    </nav>
  );
}
