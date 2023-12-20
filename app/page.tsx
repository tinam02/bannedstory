import Image from 'next/image'
import styles from './page.module.css'
import { loadItems } from '@/lib/fetch'
import Item, { getItems } from '@/components/Item'

export default async function Home() {
  const data= await loadItems()
  return (
    <main className={styles.main}>
     

      <div className={styles.center}>
        <Image
          className={styles.logo}
          src="/next.svg"
          alt="Next.js Logo"
          width={180}
          height={37}
          priority
        />
      </div>
     <Item i={data}/>
    </main>
  )
}

 