import React, { useEffect, useMemo, useRef, useState } from 'react';
import { formatDate, formatDuration } from '../lib/i18n';

function Heading({ eyebrow, title, text, action }) {
  return <section className="page-heading"><div className="page-heading-copy"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{text && <p>{text}</p>}</div>{action}</section>;
}

function PuzzleCard({ puzzle, status, t, master, onDelete }) {
  const gameType = puzzle.gameType || (puzzle.format === 'spl' ? 'spiral' : 'crossword');
  const size = gameType === 'spiral'
    ? (puzzle.cellCount || puzzle.width * puzzle.height)
    : `${puzzle.width}×${puzzle.height}`;
  const isCompleted = status?.status === 'completed';
  const isStarted = status?.status === 'started';
  const typeLabel = gameType === 'spiral' ? t('catalog.spiralType') : t('catalog.crosswordType');
  const errorSummary = status?.errorCount
    ? (status.errorCount === 1 ? t('catalog.oneError') : `${status.errorCount} ${t('catalog.errors')}`)
    : (!status?.usedVerify && !status?.usedHints ? t('catalog.perfect') : '');

  return <article className="puzzle-list-item">
    <div className="puzzle-list-dimension">{size}</div>
    <div className="puzzle-list-content">
      <h2><a href={`/jokoak/game/${puzzle._id}`}>{puzzle.name}</a></h2>
      <p className="puzzle-author">{puzzle.author || t('common.unknownAuthor')}</p>
      <div className="puzzle-list-details">
        <span className={`game-type-pill${gameType === 'spiral' ? ' game-type-pill--spiral' : ''}`}>{typeLabel}</span>
        {isCompleted
          ? <><span>✓ {formatDuration(status.elapsedSeconds)}</span><span>{errorSummary}</span></>
          : <span>{isStarted ? t('catalog.savedGame') : t('catalog.ready')}</span>}
        <span>{formatDate(puzzle.createdAt)}</span>
      </div>
    </div>
    <div className="puzzle-list-status">
      <span className={`status-pill${isCompleted ? ' status-pill--complete' : isStarted ? ' status-pill--progress' : ''}`}>
        {isCompleted ? t('catalog.completed') : isStarted ? t('catalog.inProgress') : t('catalog.notStarted')}
      </span>
    </div>
    <div className="puzzle-list-actions">
      <a className="btn btn-primary" href={`/jokoak/game/${puzzle._id}`}>
        {isStarted ? t('common.continue') : t('common.play')}
      </a>
      {master && <button className="btn btn-outline-danger" onClick={() => onDelete(puzzle)}>{t('common.delete')}</button>}
    </div>
  </article>;
}

export function PuzzlesPage({ puzzles = [], statusMap = {}, user, t }) {
  const [search, setSearch] = useState(''); const [type, setType] = useState('all'); const [status, setStatus] = useState('all');
  const [items, setItems] = useState(puzzles);
  const visible = useMemo(() => items.filter(puzzle => {
    const gameType = puzzle.gameType || (puzzle.format === 'spl' ? 'spiral' : 'crossword'); const gameStatus = statusMap[puzzle._id]?.status || 'notstarted';
    return `${puzzle.name} ${puzzle.author || ''}`.toLocaleLowerCase('eu').includes(search.toLocaleLowerCase('eu')) && (type === 'all' || type === gameType) && (status === 'all' || status === gameStatus);
  }), [items, search, type, status, statusMap]);
  const deletePuzzle = async puzzle => {
    if (!window.confirm(t('client.deleteConfirm', { name: puzzle.name }))) return;
    const response = await fetch(`/jokoak/game/${puzzle._id}`, { method: 'DELETE' });
    if (response.ok) setItems(current => current.filter(item => item._id !== puzzle._id)); else window.alert(t('client.deleteFailed'));
  };
  return <><Heading eyebrow={t('catalog.eyebrow')} title={t('catalog.title')} text={t('catalog.intro')} action={user?.master && <a className="btn btn-outline-primary" href="/jokoak/upload">{t('catalog.upload')}</a>} />{user?.master && <aside className="admin-note"><strong>{t('catalog.adminMode')}</strong> {t('catalog.adminText')}</aside>}{!items.length ? <div className="empty-state"><h2>{t('catalog.emptyTitle')}</h2><p>{user?.master ? t('catalog.emptyAdmin') : t('catalog.emptyPlayer')}</p>{user?.master && <a className="btn btn-primary" href="/jokoak/upload">{t('catalog.upload')}</a>}</div> : <><div className="catalog-controls"><label className="search-field"><span>{t('catalog.search')}</span><input className="form-control" type="search" value={search} placeholder={t('catalog.searchPlaceholder')} onChange={event => setSearch(event.target.value)} /></label><label className="filter-field"><span>{t('catalog.type')}</span><select className="form-control" value={type} onChange={event => setType(event.target.value)}><option value="all">{t('common.all')}</option><option value="crossword">{t('catalog.crosswordType')}</option><option value="spiral">{t('catalog.spiralType')}</option></select></label>{user && <label className="filter-field"><span>{t('catalog.status')}</span><select className="form-control" value={status} onChange={event => setStatus(event.target.value)}><option value="all">{t('common.all')}</option><option value="started">{t('catalog.inProgress')}</option><option value="completed">{t('catalog.completed')}</option><option value="notstarted">{t('catalog.notStarted')}</option></select></label>}<p className="catalog-count">{t('client.puzzleCount', { count: visible.length })}</p></div><div className="puzzle-list">{visible.map(puzzle => <PuzzleCard key={puzzle._id} puzzle={puzzle} status={statusMap[puzzle._id]} t={t} master={user?.master} onDelete={deletePuzzle} />)}</div></>}</>;
}

function AuthPage({ register, errors = [], t }) {
  const prefix = register ? 'register' : 'login';
  return <section className="auth-layout"><div className="auth-intro"><p className="eyebrow">{t(`auth.${prefix}Eyebrow`)}</p><h1>{t(`auth.${prefix}Title`)}</h1><p>{t(`auth.${prefix}Text`)}</p></div><div className="auth-card"><h2>{register ? t('nav.createAccount') : t('auth.login')}</h2>{errors.map(error => <div className="alert alert-danger" key={error.param}>{error.msg}</div>)}<form className="auth-form" method="POST" action={register ? '/users/register' : '/users/login'}>{register && <div className="form-group"><label htmlFor="email">{t('auth.email')}</label><input id="email" className="form-control" name="email" type="email" autoComplete="email" required /></div>}<div className="form-group"><label htmlFor="username">{t('auth.username')}</label><input id="username" className="form-control" name="username" type="text" autoComplete="username" minLength={register ? 3 : undefined} maxLength={register ? 40 : undefined} required autoFocus />{register && <small className="form-hint">{t('auth.usernameHint')}</small>}</div><div className="form-group"><label htmlFor="password">{t('auth.password')}</label><input id="password" className="form-control" name="password" type="password" autoComplete={register ? 'new-password' : 'current-password'} minLength={register ? 4 : undefined} required />{register && <small className="form-hint">{t('auth.passwordHint')}</small>}</div>{register && <div className="form-group"><label htmlFor="password2">{t('auth.repeatPassword')}</label><input id="password2" className="form-control" name="password2" type="password" autoComplete="new-password" required /></div>}<button className="btn btn-primary btn-block" type="submit">{register ? t('nav.createAccount') : t('auth.enter')}</button></form><p className="auth-footer">{register ? t('auth.haveAccount') : t('auth.noAccount')} <a href={register ? '/users/login' : '/users/register'}>{register ? t('nav.signIn') : t('nav.createAccount')}</a></p></div></section>;
}

export const LoginPage = props => <AuthPage {...props} />;
export const RegisterPage = props => <AuthPage {...props} register />;

export function DashboardPage({ stats, completed = [], inProgress = [], t }) { return <div className="dashboard"><Heading eyebrow={t('dashboard.eyebrow')} title={t('dashboard.title')} text={t('dashboard.intro')} action={<a className="btn btn-outline-primary" href="/jokoak">{t('home.browse')}</a>} /><div className="dashboard-stats-row">{[[stats.completed, t('dashboard.completed')], [stats.inProgress, t('dashboard.inProgress')], [stats.total, t('dashboard.all')]].map(([value, label]) => <div className="stat-card" key={label}><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>)}</div>{completed.length > 0 && <SessionTable title={`✓ ${t('dashboard.completed')}`} sessions={completed} completed t={t} />}{inProgress.length > 0 && <SessionTable title={`⏳ ${t('dashboard.inProgress')}`} sessions={inProgress} t={t} />}{!completed.length && !inProgress.length && <><p className="text-muted">{t('dashboard.empty')}</p><a className="btn btn-primary" href="/jokoak">{t('dashboard.viewPuzzles')}</a></>}</div>; }

function SessionTable({ title, sessions, completed, t }) { return <><h2 className="dashboard-section-title">{title}</h2><table className="table table-sm table-hover"><thead><tr><th>{t('common.name')}</th><th>{t('common.size')}</th><th>{completed ? t('dashboard.completedAt') : t('dashboard.startedAt')}</th>{completed && <th>{t('dashboard.duration')}</th>}<th /></tr></thead><tbody>{sessions.map(session => <tr key={session._id}><td>{completed ? <a href={`/jokoak/game/${session.puzzleId}`}>{session.puzzle?.name || session.puzzleId}</a> : session.puzzle?.name || session.puzzleId}</td><td>{session.puzzle ? `${session.puzzle.width}×${session.puzzle.height}` : '—'}</td><td>{formatDate(completed ? session.completedAt : session.startedAt)}</td>{completed && <td>{session.durationSeconds == null ? '—' : formatDuration(session.durationSeconds)}</td>}<td>{!completed && <a className="btn btn-sm btn-outline-primary" href={`/jokoak/game/${session.puzzleId}`}>{t('common.continue')}</a>}</td></tr>)}</tbody></table></>; }

export function UploadPage({ user, t, maxUploadFiles = 25, maxUploadFileSize = 5242880 }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [batch, setBatch] = useState(null);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef(null);
  const busy = submitting || batch?.status === 'queued' || batch?.status === 'processing';
  const maxSizeMb = Math.ceil(maxUploadFileSize / (1024 * 1024));

  useEffect(() => {
    if (!batch || !['queued', 'processing'].includes(batch.status)) return undefined;
    let cancelled = false;
    let timeout;
    const poll = async () => {
      try {
        const response = await fetch(`/jokoak/upload/batches/${batch.id}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || t('upload.statusError'));
        if (cancelled) return;
        setBatch(result);
        if (['queued', 'processing'].includes(result.status)) timeout = window.setTimeout(poll, 1000);
      } catch (pollError) {
        if (!cancelled) setError(pollError.message || t('upload.statusError'));
      }
    };
    timeout = window.setTimeout(poll, 700);
    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [batch?.id, batch?.status, t]);

  const appendFiles = incoming => {
    if (!incoming.length) return;
    if (selectedFiles.length + incoming.length > maxUploadFiles) {
      setError(t('upload.tooManyFiles', { count: maxUploadFiles }));
      return;
    }
    setError('');
    setSelectedFiles(current => [...current, ...incoming]);
    setBatch(null);
  };

  const addFiles = event => {
    const incoming = Array.from(event.target.files || []);
    event.target.value = '';
    appendFiles(incoming);
  };

  const handleDrop = event => {
    event.preventDefault();
    setDragging(false);
    if (!busy) appendFiles(Array.from(event.dataTransfer.files || []));
  };

  const removeSelectedFile = index => {
    setSelectedFiles(current => current.filter((_, fileIndex) => fileIndex !== index));
  };

  const submitBatch = async event => {
    event.preventDefault();
    if (!selectedFiles.length || busy) return;
    setSubmitting(true);
    setError('');
    setBatch(null);
    const formData = new FormData();
    selectedFiles.forEach(file => formData.append('filename', file));
    try {
      const response = await fetch('/jokoak/upload/batches', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || t('upload.submitError'));
      setBatch(result);
      setSelectedFiles([]);
      if (fileInput.current) fileInput.current.value = '';
    } catch (submitError) {
      setError(submitError.message || t('upload.submitError'));
    } finally {
      setSubmitting(false);
    }
  };

  const batchProgress = batch?.total ? Math.round((batch.processed / batch.total) * 100) : 0;
  const statusLabel = status => t(`upload.status.${status}`);

  return <section className="form-page">
    <Heading eyebrow={t('upload.eyebrow')} title={t('upload.title')} text={t('upload.intro')} action={<div className="page-actions">{user?.master && <a className="btn btn-outline-secondary" href="/jokoak/spiral-builder">{t('upload.builder')}</a>}<a className="btn btn-outline-primary" href="/jokoak">{t('upload.backToCatalog')}</a></div>} />
    <div className="upload-card">
      <form className="auth-form" onSubmit={submitBatch}>
        <div className="form-group">
          <div className={`upload-dropzone${dragging ? ' upload-dropzone--active' : ''}${busy ? ' upload-dropzone--disabled' : ''}`}
            onDragEnter={event => { event.preventDefault(); if (!busy) setDragging(true); }}
            onDragOver={event => { event.preventDefault(); if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'; }}
            onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget)) setDragging(false); }}
            onDrop={handleDrop}>
            <input ref={fileInput} id="filenames" className="upload-file-input" type="file" accept=".ipuz,.puz,.spl" multiple onChange={addFiles} disabled={busy} aria-label={t('upload.file')} />
            <span className="upload-dropzone-icon" aria-hidden="true"><svg viewBox="0 0 48 48" fill="none"><path d="M24 31V8m0 0-8 8m8-8 8 8M9 27v10a4 4 0 0 0 4 4h22a4 4 0 0 0 4-4V27" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg></span>
            <div className="upload-dropzone-copy"><strong>{dragging ? t('upload.dropActive') : t('upload.dropTitle')}</strong><span>{t('upload.dropHint', { count: maxUploadFiles, size: maxSizeMb })}</span></div>
            <button className="btn btn-outline-primary upload-browse-button" type="button" onClick={() => fileInput.current?.click()} disabled={busy}>{t('upload.browseFiles')}</button>
          </div>
          <small id="upload-hint" className="form-hint">{t('upload.hint')}</small>
        </div>

        {selectedFiles.length > 0 && <div className="upload-selection">
          <div className="upload-section-heading"><strong>{t('upload.selectedFiles', { count: selectedFiles.length })}</strong><button className="btn btn-link btn-sm" type="button" onClick={() => setSelectedFiles([])} disabled={busy}>{t('upload.clearSelection')}</button></div>
          <ul className="upload-file-list">{selectedFiles.map((file, index) => <li className="upload-file-row" key={`${file.name}-${file.lastModified}-${index}`}><span className="upload-file-type">{file.name.split('.').pop().slice(0, 5).toUpperCase()}</span><span className="upload-file-name">{file.name}<small>{(file.size / (1024 * 1024)).toFixed(2)} MB</small></span><button className="upload-remove-button" type="button" onClick={() => removeSelectedFile(index)} disabled={busy} aria-label={t('upload.removeFile', { name: file.name })} title={t('upload.remove')}>×</button></li>)}</ul>
        </div>}

        {error && <div className="alert alert-danger" role="alert">{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={!selectedFiles.length || busy}>{submitting ? t('upload.sending') : t('upload.submit', { count: selectedFiles.length })}</button>
      </form>

      {batch && <section className="upload-progress" aria-live="polite">
        <div className="upload-progress-heading"><h2>{t('upload.progressTitle')}</h2><span>{statusLabel(batch.status)}</span></div>
        <p className="form-hint">{t('upload.progressCount', { processed: batch.processed, total: batch.total, succeeded: batch.succeeded, failed: batch.failed })}</p>
        <progress className="upload-progress-bar" max="100" value={batchProgress} aria-label={t('upload.progressTitle')} />
        {['completed', 'completed_with_errors'].includes(batch.status) && <p className={`upload-summary${batch.failed ? ' upload-summary--warning' : ''}`}>{batch.failed ? t('upload.finishedWithErrors') : t('upload.finished')}</p>}
        <ul className="upload-file-list upload-results-list">{batch.files.map(file => <li className="upload-file-row" key={file.id}><span className="upload-file-type">{file.filename.split('.').pop().slice(0, 5).toUpperCase()}</span><span className="upload-file-name">{file.filename}{file.puzzleName && <small>{file.puzzleName}</small>}{file.message && <small className="upload-file-error">{file.message}</small>}</span><span className={`upload-status upload-status--${file.status}`}>{statusLabel(file.status)}</span></li>)}</ul>
      </section>}
    </div>
  </section>;
}

export function MasterPage({ stats, puzzles = [], users = [], completionMap = {}, userStats = {}, recentCompletions = [], downloadsFiles = [], t }) { return <div className="dashboard"><Heading eyebrow={t('upload.eyebrow')} title={t('master.title')} text={t('master.intro')} /><div className="dashboard-stats-row">{[[stats.puzzles, t('master.puzzleCount')], [stats.users, t('master.userCount')], [stats.completions, t('master.completionCount')], [stats.activeSessions, t('common.active')]].map(([value, label]) => <div className="stat-card" key={label}><div className="stat-value">{value}</div><div className="stat-label">{label}</div></div>)}</div><div className="dashboard-actions"><a className="btn btn-primary" href="/jokoak/upload">{t('master.upload')}</a></div><h2 className="dashboard-section-title">{t('master.externalApi')}</h2><div className="card mb-4"><div className="card-body"><p className="mb-2">{t('master.apiDescription')}</p><p className="mb-0 text-muted">{t('master.apiSecret')}</p></div></div><h2 className="dashboard-section-title">{t('master.downloads')}</h2>{downloadsFiles.length ? <table className="table table-sm"><thead><tr><th>{t('common.name')}</th><th>{t('common.size')}</th><th>{t('common.date')}</th></tr></thead><tbody>{downloadsFiles.map(file => <tr key={file.name}><td><a href={`/master/download/${encodeURIComponent(file.name)}`}>{file.name}</a></td><td>{file.sizeDisplay}</td><td>{file.mtimeDisplay}</td></tr>)}</tbody></table> : <p className="text-muted">{t('master.downloadsEmpty')}</p>}<MasterTables puzzles={puzzles} users={users} completionMap={completionMap} userStats={userStats} recentCompletions={recentCompletions} t={t} /></div>; }

function MasterTables({ puzzles, users, completionMap, userStats, recentCompletions, t }) { return <><h2 className="dashboard-section-title">{t('nav.puzzles')}</h2><table className="table table-sm table-hover"><thead><tr><th>{t('common.name')}</th><th>{t('common.size')}</th><th>{t('common.author')}</th><th>{t('master.completionCountShort')}</th><th>{t('master.published')}</th><th /></tr></thead><tbody>{puzzles.map(puzzle => <tr key={puzzle._id}><td>{puzzle.name}</td><td>{puzzle.width}×{puzzle.height}</td><td>{puzzle.author || '—'}</td><td>{completionMap[puzzle._id] || 0}</td><td>{formatDate(puzzle.createdAt)}</td><td><a className="btn btn-sm btn-outline-secondary" href={`/jokoak/game/${puzzle._id}`}>{t('common.play')}</a></td></tr>)}</tbody></table><h2 className="dashboard-section-title">{t('master.users')}</h2><table className="table table-sm table-hover"><thead><tr><th>{t('auth.username')}</th><th>{t('common.authorEmail')}</th><th>{t('common.manager')}</th><th>{t('dashboard.completed')}</th><th>{t('common.active')}</th></tr></thead><tbody>{users.map(user => <tr key={user._id}><td>{user.username}</td><td>{user.email}</td><td>{user.master && <span className="badge badge-warning">{t('common.authorized')}</span>}</td><td>{userStats[user._id]?.completed || 0}</td><td>{userStats[user._id]?.inProgress || 0}</td></tr>)}</tbody></table><h2 className="dashboard-section-title">{t('master.recentCompletions', { count: recentCompletions.length })}</h2><table className="table table-sm"><thead><tr><th>{t('auth.username')}</th><th>{t('nav.puzzles')}</th><th>{t('common.date')}</th></tr></thead><tbody>{recentCompletions.map(session => <tr key={session._id}><td>{session.username || session.userId}</td><td>{session.puzzleName || session.puzzleId}</td><td>{formatDate(session.completedAt)}</td></tr>)}</tbody></table></>; }

export function MessagePage({ message, type }) { return <div className={`alert alert-${type}`}>{message}</div>; }
export function NotFoundPage({ url, t }) { return <section className="empty-state error-state"><p className="eyebrow">{t('notFound.eyebrow')}</p><h1>{t('notFound.title')}</h1><p>{t('notFound.text', { url })}</p><a className="btn btn-primary" href="/jokoak">{t('dashboard.viewPuzzles')}</a></section>; }
