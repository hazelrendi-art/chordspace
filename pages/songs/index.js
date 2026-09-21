import Link from 'next/link'
import Layout from '../../components/layout'
import { getAllSongs } from '../../lib/store'

const COLORS = ['bg-pop-yellow', 'bg-pop-pink', 'bg-pop-blue', 'bg-pop-green']

export default function SongsPage({ songs }) {
  return (
    <Layout title="Kumpulan Chord Lagu | ChordSpace"
            description="Kumpulan chord gitar lengkap dengan lirik. Dilengkapi fitur transpose real-time.">
      <div className="comic-panel bg-white dark:bg-[#232332] mb-8 rotate-1">
        <h1 className="font-comic text-4xl sm:text-5xl">🎵 Chord LAGU!</h1>
        <p className="mt-1 opacity-70">{songs.length} lagu dengan lirik + chord. Transpose langsung di halaman lagu.</p>
      </div>

      {songs.length === 0 ? (
        <div className="comic-panel text-center">
          <p>Belum ada lagu. Silakan cek kembali nanti!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {songs.map((song, i) => (
            <Link key={song.id} href={`/songs/${song.id}`}
                  className={`comic-card p-5 ${i % 2 ? 'rotate-1' : '-rotate-1'}`}>
              <div className={`inline-block px-2 py-0.5 border-2 border-black rounded-md text-xs font-bold ${COLORS[i % COLORS.length]}`}>
                {song.difficulty || 'Beginner'}
              </div>
              <h2 className="font-comic text-3xl mt-2">🎶 {song.title}</h2>
              <p className="opacity-60 font-bold">oleh {song.artist}</p>
              {song.description && <p className="text-sm opacity-50 mt-1">{song.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </Layout>
  )
}

export async function getStaticProps() {
  const songs = await getAllSongs()
  return { props: { songs }, revalidate: 5 }
}