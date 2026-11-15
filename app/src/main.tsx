import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'

// safety net: a render error shows a message instead of an empty page
class Guard extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    if (!this.state.err) return this.props.children
    return <div className="crash"><div><h2>Arayüz bir hatayla karşılaştı</h2><p>{String(this.state.err.message)}</p><button className="btn primary" onClick={() => this.setState({ err: null })}>Devam et</button> <button className="btn" onClick={() => location.reload()}>Yeniden yükle</button></div></div>
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><Guard><App /></Guard></StrictMode>)
