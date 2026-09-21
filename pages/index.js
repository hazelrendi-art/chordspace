import Link from 'next/link'
import Layout from '../components/layout'
import ChordCard from '../components/chord-card'
import { getAllChords } from '../lib/chordData'

export default function Home({ chords }) {
  const featured = chords.slice(0, 6)
  return (
    <Layout>
      {/* Hero ala komik */}
      <div className="comic-panel halftone text-center mb-10 -rotate-1 overflow-hidden">
        <h1 className="font-comic text-5xl sm:text-7xl leading-tight">
          Learn GUITAR<br />
          <span className="text-pop-red">the FUN</span> way!
        </h1>
        <p className="mt-3 max-w-lg mx-auto opacity-80 font-bold">
          Kumpulan chord gitar dengan diagram keren, fitur transpose, dan tema gelap/terang. ZAP!
        </p>
        <div className="mt-5">
          <Link href="/chords" className="btn-comic bg-pop-blue text-white text-xl px-6 py-3">🎸 Jelajahi Chord</Link>
        </div>
        <span className="absolute top-3 right-4 font-comic text-2xl rotate-12 text-pop-pink">POW!</span>
      </div>

      {/* Chord populer */}
      <h2 className="font-comic text-4xl mb-5">Popular CHORDS!</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {featured.map((chord, i) => (
          <ChordCard key={chord.id} chord={chord} index={i} />
        ))}
      </div>

      <div className="text-center mt-8">
        <Link href="/chords" className="btn-comic bg-pop-purple text-white text-lg px-8 py-3">
          Lihat Semua ({chords.length}) →
        </Link>
      </div>
    </Layout>
  )
}

export async function getStaticProps() {
  const chords = await getAllChords()
  return { props: { chords }, revalidate: 5 }
}