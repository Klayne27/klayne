export const BentoCard = ({ children, className }) => (
  <div
    className={`rounded-xl border border-accent bg-base-200 p-5 shadow-inner backdrop-blur-sm ${className}`}
  >
    {children}
  </div>
)
