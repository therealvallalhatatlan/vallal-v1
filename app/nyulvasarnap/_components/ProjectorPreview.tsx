import Link from "next/link";
import styles from "./nyulvasarnap.module.css";

export default function ProjectorPreview() {
  return (
    <div className={styles.projectorBox}>
      <p>Projector route aktiv: /nyulvasarnap/projector</p>
      <Link href="/nyulvasarnap/projector" className={styles.projectorLink}>
        [ VETITES NEZET ]
      </Link>
    </div>
  );
}
