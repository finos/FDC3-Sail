export const DA_PENDING_ICON = "/icons/app-state/pending.svg"

export const DaPendingPlaceholder = ({
  className,
  iconClassName,
  title = "Waiting for Desktop Agent",
}: {
  className: string
  iconClassName?: string
  title?: string
}) => {
  return (
    <div className={className} title={title} role="status" aria-label={title}>
      <img src={DA_PENDING_ICON} alt="" className={iconClassName} />
    </div>
  )
}
