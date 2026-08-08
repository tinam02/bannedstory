import { GITHUB_URL } from '@/lib/site';
import styles from './SiteCopy.module.scss';

const SiteCopy = () => (
  <>
    <h1 className={styles.srOnly}>
      Henehoe, a MapleStory character creator and dress up simulator
    </h1>
    <p className={styles.srOnly}>
      Build an animated MapleStory character in your browser. Try on hats, hair, faces,
      eye accessories, earrings, tops, bottoms, overalls, shoes, gloves, capes
      and weapons, choose a pose and an expression, add a chat balloon or a name
      tag, and put your character on a map. Latest released items included
    </p>

    <footer className={styles.footer}>
      A free MapleStory character creator and dress up simulator. MapleStory and
      all related assets are © NEXON Korea Corp. Henehoe is an unofficial,
      non-commercial fan project, not affiliated with Nexon.{' '}
      <a
        href={GITHUB_URL}
        target='_blank'
        rel='noopener noreferrer'
        className={styles.link}
      >
        Source on GitHub
      </a>
    </footer>
  </>
);

export default SiteCopy;
