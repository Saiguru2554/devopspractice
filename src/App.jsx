import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowDownToLine,
  Check,
  CheckCircle2,
  Circle,
  Cloud,
  Database,
  ExternalLink,
  LoaderCircle,
  Plus,
  RefreshCw,
  Server,
  Settings2,
  Trash2,
  Wifi,
  X,
} from 'lucide-react';

const STORAGE_KEY = 'taskflow-api-base-v1';

function normalizeApiBase(value) {
  let result = value.trim().replace(/\/+$/, '');
  // Accept either the invoke base URL or a URL ending in /todos.
  result = result.replace(/\/todos$/i, '');
  return result;
}

function friendlyError(error) {
  const message = String(error?.message || error || 'Unknown error');
  if (message === 'Failed to fetch' || /networkerror|load failed/i.test(message)) {
    return 'The browser could not read the API response. Check that the Invoke URL is correct and that API Gateway CORS allows origin *, methods GET/POST/DELETE, and header content-type. PowerShell can work even when browser CORS is misconfigured.';
  }
  if (/Unexpected token|JSON/i.test(message)) {
    return 'The API returned a response that was not valid JSON. Check the Invoke URL and the API Gateway route integration.';
  }
  return message;
}

export default function App() {
  const [apiDraft, setApiDraft] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [apiBase, setApiBase] = useState(() => localStorage.getItem(STORAGE_KEY) || '');
  const [taskText, setTaskText] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [notice, setNotice] = useState(null);
  const [showSettings, setShowSettings] = useState(() => !localStorage.getItem(STORAGE_KEY));
  const [lastUpdated, setLastUpdated] = useState(null);

  const endpoint = useMemo(() => apiBase ? `${normalizeApiBase(apiBase)}/todos` : '', [apiBase]);

  const loadTasks = useCallback(async (base = apiBase, quiet = false) => {
    const cleaned = normalizeApiBase(base || '');
    if (!cleaned) {
      setShowSettings(true);
      setNotice({ type: 'info', text: 'Add your API Gateway Invoke URL to connect this app to AWS.' });
      return false;
    }
    if (!/^https:\/\//i.test(cleaned)) {
      setNotice({ type: 'error', text: 'The API URL must start with https://. Copy the Invoke URL from API Gateway → Stages → $default.' });
      setShowSettings(true);
      return false;
    }

    setLoading(true);
    if (!quiet) setNotice(null);
    try {
      const response = await fetch(`${cleaned}/todos`, { method: 'GET' });
      const text = await response.text();
      let data;
      try { data = text ? JSON.parse(text) : null; }
      catch { throw new Error(`API returned non-JSON content (HTTP ${response.status}). Check the Invoke URL.`); }
      if (!response.ok) throw new Error(data?.message || `GET failed with HTTP ${response.status}`);
      if (!Array.isArray(data)) throw new Error('Expected a JSON array from GET /todos. Check that the route is connected to the correct Lambda.');
      setTasks(data.map((item) => ({ id: String(item.id ?? ''), task: String(item.task ?? '') })).filter((item) => item.id));
      setApiBase(cleaned);
      setApiDraft(cleaned);
      localStorage.setItem(STORAGE_KEY, cleaned);
      setLastUpdated(new Date());
      setNotice({ type: 'success', text: 'Connected to AWS. Tasks are synced with DynamoDB.' });
      setShowSettings(false);
      return true;
    } catch (error) {
      setNotice({ type: 'error', text: friendlyError(error) });
      return false;
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  useEffect(() => {
    if (apiBase) loadTasks(apiBase, true);
    // On initial mount, validate the saved URL once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveConnection = async (event) => {
    event.preventDefault();
    const cleaned = normalizeApiBase(apiDraft);
    if (!cleaned) {
      setNotice({ type: 'error', text: 'Paste the API Gateway Invoke URL first.' });
      return;
    }
    setApiBase(cleaned);
    await loadTasks(cleaned);
  };

  const createTask = async (event) => {
    event.preventDefault();
    const task = taskText.trim();
    if (!task) return;
    if (!apiBase) {
      setShowSettings(true);
      setNotice({ type: 'error', text: 'Connect your API Gateway URL before adding tasks.' });
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      const response = await fetch(`${normalizeApiBase(apiBase)}/todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ task }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(data?.message || `POST failed with HTTP ${response.status}`);
      setTaskText('');
      const ok = await loadTasks(apiBase, true);
      if (ok) setNotice({ type: 'success', text: 'Task added and saved to DynamoDB.' });
    } catch (error) {
      setNotice({ type: 'error', text: friendlyError(error) });
    } finally {
      setSaving(false);
    }
  };

  const deleteTask = async (id) => {
    if (!apiBase || !id) return;
    setDeletingId(id);
    setNotice(null);
    try {
      const response = await fetch(`${normalizeApiBase(apiBase)}/todos`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const text = await response.text();
      const data = text ? JSON.parse(text) : null;
      if (!response.ok) throw new Error(data?.message || `DELETE failed with HTTP ${response.status}`);
      const ok = await loadTasks(apiBase, true);
      if (ok) setNotice({ type: 'success', text: 'Task deleted from DynamoDB.' });
    } catch (error) {
      setNotice({ type: 'error', text: friendlyError(error) });
    } finally {
      setDeletingId('');
    }
  };

  const connectionLabel = notice?.type === 'success' && apiBase ? 'Connected' : apiBase ? 'Configured' : 'Not connected';

  return (
    <div className="app-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <header className="topbar">
        <a className="brand" href="#top" aria-label="TaskFlow home">
          <span className="brand-mark"><Check size={22} strokeWidth={3} /></span>
          <span>taskflow<span className="brand-dot">.</span></span>
        </a>
        <div className={`connection-pill ${apiBase && notice?.type !== 'error' ? 'online' : 'offline'}`}>
          <span className="status-dot" />
          {connectionLabel}
        </div>
      </header>

      <main id="top" className="main-content">
        <section className="hero">
          <div className="eyebrow"><span className="eyebrow-line" /> SERVERLESS TASK MANAGER</div>
          <h1>Make room for<br /><span>what matters.</span></h1>
          <p className="hero-copy">A simple task space, powered by AWS. Your tasks persist in DynamoDB, with Lambda handling every action.</p>
          <div className="architecture" aria-label="Application architecture">
            <div className="arch-item"><span className="arch-icon"><Cloud size={17} /></span><span>API Gateway</span></div>
            <span className="arch-connector" />
            <div className="arch-item"><span className="arch-icon"><Server size={17} /></span><span>Lambda</span></div>
            <span className="arch-connector" />
            <div className="arch-item"><span className="arch-icon"><Database size={17} /></span><span>DynamoDB</span></div>
          </div>
        </section>

        <section className="workspace">
          <div className="workspace-head">
            <div>
              <div className="section-kicker">YOUR WORKSPACE</div>
              <h2>Today's focus</h2>
            </div>
            <button className="icon-button" type="button" onClick={() => loadTasks()} disabled={loading} aria-label="Refresh tasks" title="Refresh tasks">
              {loading ? <LoaderCircle size={18} className="spin" /> : <RefreshCw size={18} />}
            </button>
          </div>

          <div className="stats-row">
            <div className="stat-card"><span className="stat-label">TOTAL TASKS</span><strong>{tasks.length.toString().padStart(2, '0')}</strong><span className="stat-foot">saved in DynamoDB</span></div>
            <div className="stat-card"><span className="stat-label">API METHODS</span><strong>03</strong><span className="stat-foot">GET · POST · DELETE</span></div>
            <div className="stat-card status-card"><span className="stat-label">BACKEND STATUS</span><strong className="backend-state"><span className={`status-dot ${apiBase && notice?.type !== 'error' ? 'green' : 'gray'}`} />{apiBase && notice?.type !== 'error' ? 'Ready' : 'Setup needed'}</strong><span className="stat-foot">AWS serverless stack</span></div>
          </div>

          <form className="add-task-form" onSubmit={createTask}>
            <span className="input-plus"><Plus size={20} /></span>
            <input value={taskText} onChange={(event) => setTaskText(event.target.value)} placeholder="What needs to get done?" aria-label="Task description" maxLength={500} />
            <button className="primary-button" type="submit" disabled={saving || !taskText.trim()}>{saving ? <LoaderCircle size={17} className="spin" /> : <Plus size={17} />} Add task</button>
          </form>

          {notice && (
            <div className={`notice ${notice.type}`} role="status">
              {notice.type === 'success' ? <CheckCircle2 size={18} /> : notice.type === 'error' ? <AlertCircle size={18} /> : <Activity size={18} />}
              <span>{notice.text}</span>
              {notice.type === 'error' && <button type="button" className="notice-close" onClick={() => setNotice(null)} aria-label="Dismiss message"><X size={16} /></button>}
            </div>
          )}

          <div className="list-heading"><span>YOUR TASKS</span><span>{tasks.length} {tasks.length === 1 ? 'ITEM' : 'ITEMS'}</span></div>
          {loading && tasks.length === 0 ? (
            <div className="empty-state"><LoaderCircle className="spin" size={28} /><h3>Connecting to your backend…</h3><p>Fetching saved tasks from DynamoDB.</p></div>
          ) : tasks.length ? (
            <div className="task-list">
              {tasks.map((task) => (
                <article className="task-row" key={task.id}>
                  <span className="task-check"><Circle size={21} /></span>
                  <span className="task-title">{task.task}</span>
                  <span className="task-id" title={task.id}>ID · {task.id.slice(0, 8)}</span>
                  <button className="delete-button" type="button" onClick={() => deleteTask(task.id)} disabled={deletingId === task.id} aria-label={`Delete ${task.task}`} title="Delete task">
                    {deletingId === task.id ? <LoaderCircle size={17} className="spin" /> : <Trash2 size={17} />}
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <div className="empty-illustration"><ArrowDownToLine size={27} /></div>
              <h3>{apiBase && !loading ? 'A clean slate.' : 'Connect your AWS backend'}</h3>
              <p>{apiBase && !loading ? 'No tasks yet. Add your first task above and it will be saved in DynamoDB.' : 'Paste your API Gateway Invoke URL below to load tasks from your DynamoDB table.'}</p>
              {!apiBase && <button type="button" className="secondary-button" onClick={() => setShowSettings(true)}><Settings2 size={16} /> Configure connection</button>}
            </div>
          )}

          <footer className="workspace-footer">
            <span><Wifi size={14} /> {lastUpdated ? `Last synced ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : 'Waiting for connection'}</span>
            <button type="button" className="text-button" onClick={() => setShowSettings((shown) => !shown)}><Settings2 size={15} /> API settings</button>
          </footer>

          {showSettings && (
            <section className="settings-panel" aria-label="API connection settings">
              <div className="settings-heading"><div><span className="section-kicker">CONNECTION</span><h3>Connect your AWS API</h3></div><button type="button" className="icon-button subtle" onClick={() => setShowSettings(false)} aria-label="Close settings"><X size={17} /></button></div>
              <p className="settings-help">In AWS, open <strong>API Gateway → DevopsCBP → Stages → $default</strong> and copy its <strong>Invoke URL</strong>. Paste the base URL here; the app adds <code>/todos</code> automatically. You can also paste a URL that already ends in <code>/todos</code>.</p>
              <form className="connect-form" onSubmit={saveConnection}>
                <label htmlFor="api-url">API Gateway Invoke URL</label>
                <input id="api-url" value={apiDraft} onChange={(event) => setApiDraft(event.target.value)} placeholder="https://your-api-id.execute-api.ap-south-1.amazonaws.com" autoComplete="url" />
                <button type="submit" className="primary-button" disabled={loading}>{loading ? <LoaderCircle size={17} className="spin" /> : <ExternalLink size={16} />} Connect and test</button>
              </form>
              <div className="cors-hint"><AlertCircle size={16} /><span>If the URL works in PowerShell but this page says “Failed to fetch”, configure HTTP API CORS in AWS: origin <code>*</code>, methods <code>GET</code>, <code>POST</code>, <code>DELETE</code>, allowed header <code>content-type</code>, then save/deploy. Browser CORS cannot be fixed by React code alone.</span></div>
            </section>
          )}
        </section>
        <div className="page-note">Built with React · AWS Lambda · API Gateway · DynamoDB</div>
      </main>
    </div>
  );
}
