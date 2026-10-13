import { DEFAULT_ICON } from "../appd/appd"
import styles from "./styles.module.css"

export const Icon = ({
  image,
  text,
  dark,
}: {
  image: string
  text: string
  dark: boolean
}) => {
  return (
    <div className={styles.icon} data-dark={dark}>
      <img
        src={image}
        className={styles.iconImage}
        onError={(x) => ((x.target as HTMLImageElement).src = DEFAULT_ICON)}
      />
      <div className={styles.iconName}>
        <span className={styles.iconNameText}>{text}</span>
      </div>
    </div>
  )
}
