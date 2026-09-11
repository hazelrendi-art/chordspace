import { useMemo, useState } from 'react'
import { transposeChord } from '../lib/transpose'
import { computeFingering } from '../lib/fingering'

/* ---------- Diagram fretboard SVG ---------- */
function FretboardDiagram({ fingering }) {
  const strings = String(fingering || '').split('')
  const W = 140, H = 210, padX = 25, padY = 30
  const stringGap = (W - padX * 2) / 5
  const fretGap = (H - padY * 2) / 4

  // Parse setiap senar (mendukung 'x' / '0' / '1'-'9' / '10'-'12')
  const parsed = strings.map(s => {
    if (s === 'x' || s === 'X') return { kind: 'mute' }
    if (s === '0') return { kind: 'open' }
    const n = parseInt(s, 10)
    if (Number.isFinite(n) && n > 0) return { kind: 'fret', fret: n }
    return { kind: 'unknown' }
  })

  // Window fret: dari fret terkecil yg dipakai sampai +3
  const usedFrets = parsed.filter(p => p.kind === 'fret').map(p => p.fret)
  let startFret = 1
  if (usedFrets.length) {
    const minF = Math.min(...usedFrets)
    const maxF = Math.max(...usedFrets)
    // jika rentang > 3, geser ke minF; jika rentang <=3 tapi ada fret >3, tetap di minF
    if (maxF > 4) {
      startFret = Math.max(1, minF)
    } else {
      startFret = 1
    }
  }
  const endFret = startFret + 3
  const showPosLabel = startFret > 1

  return (
    <svg viewBox="0 0 160 230" className="comic-card bg-white dark:bg-[#232332] shrink-0 w-36 sm:w-44 md:w-[180px]" style={{ transform: 'rotate(2deg)' }}>
      {/* nut (senar 0) */}
      <line x1={padX - 4} y1={padY} x2={W - padX + 4} y2={padY} stroke="black" strokeWidth={startFret === 1 ? "7" : "3"} />
      {/* fret wires */}
      {[1, 2, 3, 4].map(f => (
        <line key={f} x1={padX} y1={padY + f * fretGap} x2={W - padX} y2={padY + f * fretGap} stroke="#888" strokeWidth="2" />
      ))}

      {/* label posisi (fr X) di sisi kanan kalau posisi tinggi */}
      {showPosLabel && (
        <text x={padX - 8} y={padY + fretGap / 2 + 5} textAnchor="end" fontSize="13" fontWeight="bold" fill="#555">
          {startFret}fr
        </text>
      )}

      {parsed.map((p, i) => {
        const x = padX + i * stringGap
        // garis senar
        const stringLine = (
          <line key={`s${i}`} x1={x} y1={padY} x2={x} y2={padY + 4 * fretGap} stroke={p.kind === 'mute' ? '#999' : '#333'} strokeWidth="2.5" />
        )
        if (p.kind === 'mute') {
          return (
            <g key={i}>
              {stringLine}
              <text x={x} y={padY - 12} textAnchor="middle" fontSize="16" fontWeight="bold" fill="#FF4E4E">×</text>
            </g>
          )
        }
        if (p.kind === 'open') {
          return (
            <g key={i}>
              {stringLine}
              <circle cx={x} cy={padY - 14} r="7" fill="none" stroke="#333" strokeWidth="3" />
            </g>
          )
        }
        if (p.kind === 'fret') {
          const rel = p.fret - startFret
          if (rel >= 0 && rel <= 3) {
            // di dalam window — gambar titik
            const yPos = padY + (rel + 0.5) * fretGap
            return (
              <g key={i}>
                {stringLine}
                <circle cx={x} cy={yPos} r="11" fill="#FFD93D" stroke="black" strokeWidth="3" />
                {rel === 0 && showPosLabel === false ? null : null}
                <text x={x} y={yPos + 5} textAnchor="middle" fontSize="12" fontWeight="bold">{p.fret}</text>
              </g>
            )
          }
          // di luar window (jauh di atas atau jauh di bawah): tampilkan label di luar fretboard
          const above = p.fret < startFret
          const labelY = above ? padY - 6 : padY + 4 * fretGap + 14
          return (
            <g key={i}>
              {stringLine}
              <rect x={x - 11} y={labelY - 12} width="22" height="16" rx="3" fill="#FFE066" stroke="black" strokeWidth="1.5" />
              <text x={x} y={labelY} textAnchor="middle" fontSize="11" fontWeight="bold">{p.fret}</text>
            </g>
          )
        }
        return <g key={i}>{stringLine}</g>
      })}
    </svg>
  )
}

/**
 * Viewer chord lengkap: diagram + posisi jari + kontrol transpose.
 * Semua ikut berubah secara real-time saat ditranspose.
 */
export default function ChordViewer({ name, fingering }) {
  const [shift, setShift] = useState(0)

  const currentName = shift === 0 ? name : transposeChord(name, shift)
  const currentFingering = useMemo(
    () => (shift === 0 ? fingering : (computeFingering(currentName) || fingering)),
    [shift, name, fingering, currentName]
  )

  return (
    <>
      {/* Panel utama: diagram + info */}
      <div className="comic-panel">
        <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start justify-center">
          <div key={currentFingering}>
            <FretboardDiagram fingering={currentFingering} />
          </div>
          <div className="text-center sm:text-left flex-1 min-w-[200px]">
            <h1 className="font-comic text-6xl mt-2">{currentName}</h1>
            <p className="mt-3">
              <span className="font-bold">Posisi jari:</span>{' '}
              <code key={currentFingering} className="font-mono text-xl bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded border-2 border-black">
                {currentFingering}
              </code>
            </p>
            <p className="text-xs opacity-50 mt-2">
              {shift !== 0 ? '⚡ Bentuk barre otomatis dihitung dari transpose' : '\u00A0'}
            </p>
          </div>
        </div>
      </div>

      {/* Kontrol transpose */}
      <div className="comic-panel mt-6">
        <h2 className="font-comic text-3xl mb-1">Transpose! 🎵</h2>
        <p className="text-sm opacity-70 mb-4">Diagram &amp; posisi jari ikut berubah.</p>

        <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
          <button onClick={() => setShift(s => Math.max(s - 1, -11))}
                  className="btn-comic bg-pop-red text-white text-xl sm:text-2xl px-3 sm:px-5" aria-label="Turunkan setengah nada">−</button>

          <div className="comic-card bg-pop-yellow dark:bg-pop-yellow px-8 py-3 text-center">
            <div className="font-comic text-5xl text-ink">{currentName}</div>
            <div className="text-xs font-bold text-ink/60">
              {shift === 0 ? 'ORIGINAL' : `${shift > 0 ? '+' : ''}${shift} semitone`}
            </div>
          </div>

          <button onClick={() => setShift(s => Math.min(s + 1, 11))}
                  className="btn-comic bg-pop-green text-ink text-xl sm:text-2xl px-3 sm:px-5" aria-label="Naikkan setengah nada">+</button>
        </div>

        <div className="flex justify-center mt-4">
          {shift !== 0 && (
            <button onClick={() => setShift(0)} className="btn-comic bg-white dark:bg-[#16161e] text-xs sm:text-sm">↺ Reset ke {name}</button>
          )}
        </div>

        <details className="mt-4">
          <summary className="cursor-pointer font-bold text-pop-blue dark:text-[#7EB6FF]">Lihat semua 12 kunci</summary>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3">
            {Array.from({ length: 12 }, (_, i) => i).map(i => {
              const n = i === 0 ? name : transposeChord(name, i)
              const f = i === 0 ? fingering : computeFingering(n)
              return (
                <button key={i} onClick={() => setShift(i)}
                        title={`Fingering: ${f || '?'}`}
                        className={`btn-comic text-xs sm:text-sm px-2 py-1 ${i === 0 ? 'bg-pop-purple text-white' : 'bg-white dark:bg-[#16161e]'} ${i === shift ? 'ring-4 ring-pop-yellow' : ''}`}>
                  {n}
                </button>
              )
            })}
          </div>
        </details>
      </div>
    </>
  )
}