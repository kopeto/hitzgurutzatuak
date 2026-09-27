import React, { useState } from 'react';
import { translate as getText } from '../lib/i18n';
import { HomePage, PuzzlesPage, LoginPage, RegisterPage, DashboardPage, UploadPage, MasterPage, MessagePage, NotFoundPage } from './ContentPages';
import { CrosswordGame, SpiralGame } from './GamePages';
import { SpiralBuilder } from './SpiralBuilder';

function Layout({ state, children }) {
  const [open, setOpen] = useState(false);
  const t = (key, parameters) => getText(state.messages, key, parameters);
  const { user, flash } = state;
  const flashEntries = Object.entries(flash).flatMap(([type, items]) => (items || []).map(message => ({ type, message })));

  return <>
    <header className="site-header">
      <div className="site-shell site-header-inner">
        <a className="brand" href="/" aria-label={t('site.homeLinkLabel')}><span className="brand-mark">HG</span><span className="brand-name">{t('site.name')}</span></a>
        <button className="nav-toggle" type="button" aria-expanded={open} aria-controls="site-navigation" onClick={() => setOpen(!open)}><span className="sr-only">{t('nav.open')}</span><span className="nav-toggle-line" /><span className="nav-toggle-line" /><span className="nav-toggle-line" /></button>
        <nav id="site-navigation" className={`site-navigation${open ? ' is-open' : ''}`}>
          <a href="/">{t('nav.home')}</a><a href="/jokoak">{t('nav.puzzles')}</a>
          {user?.master && <a href="/master">{t('nav.management')}</a>}
          <div className="navigation-account">
            {user ? <><span className="navigation-user">{user.username}</span><a className="nav-login" href="/users/dashboard">{t('nav.profile')}</a><a className="nav-login" href="/users/logout">{t('nav.signOut')}</a></> : <><a className="nav-login" href="/users/login">{t('nav.signIn')}</a><a className="nav-login" href="/users/register">{t('nav.createAccount')}</a></>}
          </div>
        </nav>
      </div>
    </header>
    <main className="site-main"><div className="site-shell">{flashEntries.map(({ type, message }, index) => <div className={`alert alert-${type}`} key={`${type}-${index}`}>{message}</div>)}{children}</div></main>
    <footer className="site-footer"><div className="site-shell site-footer-inner"><div><a className="brand brand--footer" href="/"><span className="brand-mark">HG</span><span className="brand-name">{t('site.name')}</span></a><p>{t('site.footer')}</p></div><nav className="footer-links" aria-label={t('site.footerNavigation')}><a href="/jokoak">{t('nav.puzzles')}</a><a href={user ? '/users/dashboard' : '/users/register'}>{user ? t('nav.profile') : t('nav.createAccount')}</a></nav></div></footer>
  </>;
}

const pages = {
  home: HomePage, puzzles: PuzzlesPage, login: LoginPage, register: RegisterPage, dashboard: DashboardPage,
  upload: UploadPage, master: MasterPage, message: MessagePage, notFound: NotFoundPage, game: CrosswordGame,
  spiralGame: SpiralGame, spiralBuilder: SpiralBuilder
};

export function App({ state }) {
  if (!state) return null;
  const Page = pages[state.page] || NotFoundPage;
  return <Layout state={state}><Page {...state.data} user={state.user} t={(key, parameters) => getText(state.messages, key, parameters)} /></Layout>;
}
