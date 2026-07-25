import { useEffect, useMemo, useState } from 'react'
import LiquidGlass from 'liquid-glass-react'

const choices = [
  { minutes: 1, label: '1min' },
  { minutes: 5, label: '5min' },
  { minutes: 60, label: '1H' },
]

export default function App() {
  const [settings, setSettings] = useState(null)
  const [pending, setPending] = useState(null)
  const [announcement, setAnnouncement] = useState('正在读取系统设置')

  const selected = useMemo(() => settings?.minutes ?? null, [settings])

  useEffect(() => {
    window.screenTimeout
      .get()
      .then((next) => {
        setSettings(next)
        setAnnouncement(`当前选择 ${next.minutes} 分钟`)
      })
      .catch(() => setAnnouncement('读取系统设置失败'))
  }, [])

  async function chooseTimeout(minutes) {
    if (pending !== null) return

    setPending(minutes)
    try {
      const next = await window.screenTimeout.set(minutes)
      setSettings(next)
      setAnnouncement(`已切换为 ${minutes} 分钟`)
    } catch {
      setAnnouncement('设置失败，请确认系统允许修改电源计划')
    } finally {
      setPending(null)
    }
  }

  return (
    <main className="widget-shell" aria-label="屏幕关闭时间快捷设置">
      <LiquidGlass
        className="glass-strip"
        padding="8px"
        style={{ position: 'absolute', top: '50%', left: '50%' }}
      >
        <div className="choice-grid" role="group" aria-label="关闭屏幕时间">
          {choices.map((choice) => {
            const isSelected = selected === choice.minutes
            return (
              <button
                className={`choice ${isSelected ? 'is-selected' : ''}`}
                type="button"
                key={choice.minutes}
                aria-pressed={isSelected}
                aria-label={`将屏幕关闭时间设为${choice.label}`}
                disabled={pending !== null}
                onClick={() => chooseTimeout(choice.minutes)}
              >
                <LiquidGlass
                  className="choice-glass"
                  padding="0px"
                  style={{ position: 'absolute', top: '50%', left: '50%' }}
                >
                  <span className="choice-value">{choice.label}</span>
                </LiquidGlass>
              </button>
            )
          })}
        </div>
      </LiquidGlass>

      <span className="sr-only" aria-live="polite">
        {announcement}
      </span>
    </main>
  )
}
