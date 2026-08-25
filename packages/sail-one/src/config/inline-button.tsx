export const InlineButton = ({
  text,
  url,
  onClick,
  className,
}: {
  text: string
  url: string
  onClick: () => void
  className: string
}) => {
  return <img src={url} className={className} title={text} onClick={onClick} />
}
