import styles from "./styles.module.css"

export const Icon = ({ image, text }: { image: string; text: string }) => {
  return <img src={image} className={styles.iconImage} title={text} />
}
