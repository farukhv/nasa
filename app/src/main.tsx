import { Component, StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { DICTIONARIES, initialLanguage } from './i18n'

/** Safety net: a render error shows a message instead of an empty page. */
class Guard extends Component<{ children: ReactNode }, { err: Error | null }> {
  state = { err: null as Error | null }
  static getDerivedStateFromError(err: Error) { return { err } }
  render() {
    if (!this.state.err) return this.props.children
    const t = DICTIONARIES[initialLanguage()].crash
    return <div className="crash"><div><h2>{t.title}</h2><p>{String(this.state.err.message)}</p><button className="btn primary" onClick={() => this.setState({ err: null })}>{t.resume}</button> <button className="btn" onClick={() => location.reload()}>{t.reload}</button></div></div>
  }
}

createRoot(document.getElementById('root')!).render(<StrictMode><Guard><App /></Guard></StrictMode>)
