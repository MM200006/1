import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
  SelectHTMLAttributes,
  TextareaHTMLAttributes,
} from 'react'

const joinClassNames = (...tokens: Array<string | undefined | false>) =>
  tokens.filter(Boolean).join(' ')

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
}

export const Button = ({ variant = 'primary', className, type, ...props }: ButtonProps) => (
  <button
    className={joinClassNames('btn', `btn-${variant}`, className)}
    type={type ?? 'button'}
    {...props}
  />
)

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  subtitle?: string
  rightSlot?: ReactNode
}

export const Card = ({ title, subtitle, rightSlot, className, children, ...props }: CardProps) => (
  <div className={joinClassNames('card', className)} {...props}>
    {(title || subtitle || rightSlot) && (
      <div className="card-header">
        <div>
          {title && <h3 className="card-title">{title}</h3>}
          {subtitle && <p className="card-subtitle">{subtitle}</p>}
        </div>
        {rightSlot}
      </div>
    )}
    {children}
  </div>
)

export const Badge = ({ children }: { children: ReactNode }) => (
  <span className="badge">{children}</span>
)

export const SectionHeader = ({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) => (
  <div className="section-header">
    <div>
      <h2>{title}</h2>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {actions}
  </div>
)

export const ProgressBar = ({ label, value }: { label: string; value: number }) => (
  <div className="progress-block" aria-label={label}>
    <div className="progress-label-row">
      <span>{label}</span>
      <strong>{value}%</strong>
    </div>
    <div className="progress-track">
      <div className="progress-fill" style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  </div>
)

export const Metric = ({
  label,
  value,
  helper,
}: {
  label: string
  value: string | number
  helper?: string
}) => (
  <div className="metric-card">
    <p>{label}</p>
    <h3>{value}</h3>
    {helper && <span>{helper}</span>}
  </div>
)

export const EmptyState = ({ title, description }: { title: string; description: string }) => (
  <div className="empty-state">
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
)

export const Field = ({
  label,
  children,
  hint,
}: {
  label: string
  children: ReactNode
  hint?: string
}) => (
  <label className="field">
    <span>{label}</span>
    {children}
    {hint && <small>{hint}</small>}
  </label>
)

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => <input className="input" {...props} />

export const TextArea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => <textarea className="textarea" {...props} />

export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => <select className="select" {...props} />

