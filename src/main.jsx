import React, { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import App from './App.jsx';
import './style.css';

class AppErrorBoundary extends Component {
  state = { error: null };
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error) { console.error('FORMA render error:', error); }
  render() {
    if (this.state.error) return <div className="auth-screen"><section className="auth-card"><span className="brand-mark">!</span><h1>FORMA<span className="brand-dot">.</span></h1><p>Si è verificato un problema nel caricamento dell’app.</p><p className="auth-error">{this.state.error.message || 'Errore inatteso'}</p><button className="button button-lime full" onClick={() => window.location.reload()}>Ricarica app</button></section></div>;
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(<React.StrictMode><AppErrorBoundary><BrowserRouter><App /></BrowserRouter></AppErrorBoundary></React.StrictMode>);
