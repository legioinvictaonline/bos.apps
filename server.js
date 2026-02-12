#!/usr/bin/env node
/**
 * Servidor único de herramientas — sirve todo desde archivos/herramientas/
 * y proxea APIs especiales (taskwarrior, POS panadería).
 * 
 * Puerto: 8080
 * Acceso: http://192.168.100.52:8080
 * 
 * Rutas:
 *   /                    → índice de herramientas
 *   /timer               → timer.html
 *   /pos                 → pos-panaderia/index.html
 *   /taskwarrior         → taskwarrior web UI
 *   /api/tasks           → API de Taskwarrior (GET/POST/PUT/DELETE)
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { execSync, execFile } = require('child_process');

const PORT = 8080;
const DIR = path.join(__dirname);
const TASKRC = '/Users/discens/.taskrc';
const TASKDATA = '/Users/discens/vaults/SYSTEMA 02/SYSTEMA/taskwarrior';

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.csv': 'text/csv',
  '.ledger': 'text/plain',
  '.webmanifest': 'application/manifest+json',
};

// --- Taskwarrior helpers ---

function taskExec(args) {
  const env = { ...process.env, TASKRC, TASKDATA };
  const cmd = `task rc.confirmation=no rc.bulk=0 rc.json.depends.array=yes ${args}`;
  return execSync(cmd, { encoding: 'utf8', env, maxBuffer: 50 * 1024 * 1024 });
}

function getTasks(filter = '') {
  try {
    const raw = taskExec(`${filter} export`);
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
}

// --- Request handlers ---

function handleTaskAPI(req, res, urlPath) {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET') {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const filter = url.searchParams.get('filter') || 'status:pending';
    const tasks = getTasks(filter);
    res.end(JSON.stringify(tasks));
    return;
  }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        if (data.action === 'add') {
          taskExec(`add ${data.description}${data.project ? ` project:${data.project}` : ''}${data.due ? ` due:${data.due}` : ''}${data.tags ? ' ' + data.tags.map(t => `+${t}`).join(' ') : ''}`);
        } else if (data.action === 'done' && data.uuid) {
          taskExec(`${data.uuid} done`);
        } else if (data.action === 'modify' && data.uuid) {
          taskExec(`${data.uuid} modify ${data.modifications || ''}`);
        } else if (data.action === 'delete' && data.uuid) {
          taskExec(`${data.uuid} delete`);
        } else if (data.action === 'start' && data.uuid) {
          taskExec(`${data.uuid} start`);
        } else if (data.action === 'stop' && data.uuid) {
          taskExec(`${data.uuid} stop`);
        } else if (data.action === 'annotate' && data.uuid) {
          taskExec(`${data.uuid} annotate ${data.text || ''}`);
        }
        res.end(JSON.stringify({ ok: true }));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: e.message }));
      }
    });
    return;
  }

  res.writeHead(405);
  res.end(JSON.stringify({ error: 'Method not allowed' }));
}

function serveFile(res, filePath) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404);
    res.end('Not found');
    return;
  }
  const ext = path.extname(filePath);
  const contentType = mimeTypes[ext] || 'application/octet-stream';
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { 'Content-Type': contentType });
  res.end(data);
}

function serveIndex(res) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#1a1a2e">
  <link rel="manifest" href="/timer/manifest.json">
  <link rel="apple-touch-icon" href="/timer/icon-192.png">
  <title>Herramientas</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #1a1a2e; color: #eee; 
           display: flex; justify-content: center; align-items: center; min-height: 100vh; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 20px; 
            max-width: 600px; padding: 20px; }
    a { text-decoration: none; color: #eee; background: #16213e; border-radius: 16px; 
        padding: 32px 20px; text-align: center; font-size: 1.1em; font-weight: 500;
        transition: transform 0.15s, background 0.15s; }
    a:hover { transform: scale(1.05); background: #0f3460; }
    .emoji { font-size: 2.5em; display: block; margin-bottom: 12px; }
    h1 { text-align: center; margin-bottom: 24px; font-weight: 300; font-size: 1.4em; color: #888; }
  </style>
</head>
<body>
  <div>
    <h1>Herramientas</h1>
    <div class="grid">
      <a href="/timer"><span class="emoji">⏱</span>Timer</a>
      <a href="/pos"><span class="emoji">🥖</span>POS Panadería</a>
      <a href="/calendario"><span class="emoji">📅</span>Calendario</a>
      <a href="/taskwarrior"><span class="emoji">✅</span>Taskwarrior</a>
      <a href="http://192.168.100.52:4533"><span class="emoji">🎵</span>Navidrome</a>
    </div>
  </div>
  <script>if('serviceWorker' in navigator) navigator.serviceWorker.register('/timer/sw.js');</script>
</body>
</html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// --- Taskwarrior Web UI ---

function serveTaskwarriorUI(res) {
  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <title>Taskwarrior</title>
  <link rel="manifest" href="/taskwarrior/manifest.json">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    body { font-family: -apple-system, system-ui, sans-serif; background: #1a1a2e; color: #eee; }
    
    header { padding: 12px 16px; background: #16213e; display: flex; align-items: center; gap: 12px;
             position: sticky; top: 0; z-index: 10; }
    header h1 { font-size: 1.1em; font-weight: 500; flex: 1; }
    
    .filters { display: flex; gap: 8px; padding: 12px 16px; overflow-x: auto; }
    .filters button { background: #16213e; color: #aaa; border: none; padding: 8px 16px; 
                      border-radius: 20px; font-size: 0.85em; white-space: nowrap; cursor: pointer; }
    .filters button.active { background: #0f3460; color: #fff; }
    
    .task-list { padding: 8px 16px; }
    .task { background: #16213e; border-radius: 12px; padding: 14px 16px; margin-bottom: 8px;
            display: flex; align-items: flex-start; gap: 12px; transition: opacity 0.3s; }
    .task.completed { opacity: 0.4; }
    
    .task-check { width: 24px; height: 24px; border: 2px solid #555; border-radius: 50%;
                  cursor: pointer; flex-shrink: 0; margin-top: 1px; display: flex; 
                  align-items: center; justify-content: center; }
    .task-check:hover { border-color: #4ecca3; }
    .task-check.done { background: #4ecca3; border-color: #4ecca3; }
    .task-check.done::after { content: '✓'; color: #1a1a2e; font-size: 14px; font-weight: bold; }
    
    .task-body { flex: 1; min-width: 0; }
    .task-desc { font-size: 0.95em; word-wrap: break-word; }
    .task-meta { font-size: 0.75em; color: #888; margin-top: 4px; display: flex; gap: 8px; flex-wrap: wrap; }
    .task-meta .project { color: #4ecca3; }
    .task-meta .due { color: #e94560; }
    .task-meta .tag { color: #c89b3c; }
    .task-meta .annotation { color: #777; font-style: italic; display: block; margin-top: 2px; }
    
    .task-actions { display: flex; gap: 4px; }
    .task-actions button { background: none; border: none; color: #555; font-size: 1.1em; 
                           cursor: pointer; padding: 4px; }
    .task-actions button:hover { color: #eee; }
    
    .add-bar { position: fixed; bottom: 0; left: 0; right: 0; padding: 12px 16px;
               background: #16213e; border-top: 1px solid #0f3460; display: flex; gap: 8px; }
    .add-bar input { flex: 1; background: #1a1a2e; border: 1px solid #333; border-radius: 8px;
                     padding: 10px 14px; color: #eee; font-size: 0.95em; outline: none; }
    .add-bar input:focus { border-color: #4ecca3; }
    .add-bar button { background: #4ecca3; color: #1a1a2e; border: none; border-radius: 8px;
                      padding: 10px 16px; font-weight: 600; cursor: pointer; }
    
    .loading { text-align: center; padding: 40px; color: #555; }
    .empty { text-align: center; padding: 40px; color: #555; }
    
    .project-sidebar { display: none; position: fixed; top: 0; left: 0; bottom: 0; width: 280px;
                       background: #16213e; z-index: 20; padding: 60px 16px 16px; overflow-y: auto; }
    .project-sidebar.open { display: block; }
    .project-sidebar .project-item { padding: 10px 14px; border-radius: 8px; cursor: pointer;
                                      margin-bottom: 4px; font-size: 0.9em; }
    .project-sidebar .project-item:hover, .project-sidebar .project-item.active { background: #0f3460; }
    .project-sidebar .count { color: #555; float: right; }
    .overlay { display: none; position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 15; }
    .overlay.open { display: block; }
    
    .hamburger { background: none; border: none; color: #eee; font-size: 1.4em; cursor: pointer; padding: 4px; }
    
    .spacer { height: 70px; }
    
    @media (min-width: 768px) {
      .project-sidebar { display: block; position: fixed; }
      .overlay { display: none !important; }
      .hamburger { display: none; }
      header { padding-left: 296px; }
      .filters { padding-left: 296px; }
      .task-list { padding-left: 296px; }
      .add-bar { padding-left: 296px; }
    }
  </style>
</head>
<body>
  <div class="overlay" id="overlay" onclick="toggleSidebar()"></div>
  <div class="project-sidebar" id="sidebar">
    <div class="project-item active" onclick="filterProject('')">
      Todas <span class="count" id="countAll"></span>
    </div>
    <div id="projectList"></div>
  </div>
  
  <header>
    <button class="hamburger" onclick="toggleSidebar()">☰</button>
    <h1 id="headerTitle">Taskwarrior</h1>
    <button class="hamburger" onclick="refreshTasks()" style="font-size:1.1em">↻</button>
  </header>
  
  <div class="filters" id="filters">
    <button class="active" onclick="setFilter('status:pending', this)">Pending</button>
    <button onclick="setFilter('status:pending +next', this)">Next</button>
    <button onclick="setFilter('status:pending +now', this)">Now</button>
    <button onclick="setFilter('status:completed', this)">Done</button>
    <button onclick="setFilter('', this)">All</button>
  </div>
  
  <div class="task-list" id="taskList">
    <div class="loading">Cargando...</div>
  </div>
  <div class="spacer"></div>
  
  <div class="add-bar">
    <input type="text" id="addInput" placeholder="Nueva tarea..." 
           onkeydown="if(event.key==='Enter')addTask()">
    <button onclick="addTask()">+</button>
  </div>

<script>
let currentFilter = 'status:pending';
let currentProject = '';
let tasks = [];

async function api(method, body) {
  const opts = { method };
  if (body) { opts.headers = {'Content-Type':'application/json'}; opts.body = JSON.stringify(body); }
  const f = method === 'GET' 
    ? \`/api/tasks?filter=\${encodeURIComponent(currentFilter)}\`
    : '/api/tasks';
  const r = await fetch(f, opts);
  return r.json();
}

async function refreshTasks() {
  tasks = await api('GET');
  if (currentProject) tasks = tasks.filter(t => t.project === currentProject);
  tasks.sort((a,b) => (b.urgency||0) - (a.urgency||0));
  render();
  renderProjects();
}

function render() {
  const el = document.getElementById('taskList');
  if (!tasks.length) { el.innerHTML = '<div class="empty">Sin tareas</div>'; return; }
  el.innerHTML = tasks.map(t => {
    const done = t.status === 'completed';
    const meta = [];
    if (t.project) meta.push('<span class="project">' + esc(t.project) + '</span>');
    if (t.due) meta.push('<span class="due">' + formatDate(t.due) + '</span>');
    if (t.tags) t.tags.forEach(tag => meta.push('<span class="tag">+' + esc(tag) + '</span>'));
    let annots = '';
    if (t.annotations) annots = t.annotations.map(a => 
      '<span class="annotation">📎 ' + esc(a.description) + '</span>').join('');
    return \`<div class="task \${done?'completed':''}">
      <div class="task-check \${done?'done':''}" onclick="toggleDone('\${t.uuid}', \${done})"></div>
      <div class="task-body">
        <div class="task-desc">\${esc(t.description)}</div>
        <div class="task-meta">\${meta.join('')}\${annots}</div>
      </div>
    </div>\`;
  }).join('');
}

function renderProjects() {
  const counts = {};
  tasks.forEach(t => { if(t.project) counts[t.project] = (counts[t.project]||0)+1; });
  // Get all projects from full task list
  const el = document.getElementById('projectList');
  el.innerHTML = Object.keys(counts).sort().map(p => 
    \`<div class="project-item \${currentProject===p?'active':''}" onclick="filterProject('\${esc(p)}')">
      \${esc(p)} <span class="count">\${counts[p]}</span>
    </div>\`).join('');
}

async function toggleDone(uuid, isDone) {
  if (isDone) return;
  await api('POST', { action: 'done', uuid });
  refreshTasks();
}

async function addTask() {
  const input = document.getElementById('addInput');
  const desc = input.value.trim();
  if (!desc) return;
  const data = { action: 'add', description: desc };
  if (currentProject) data.project = currentProject;
  await api('POST', data);
  input.value = '';
  refreshTasks();
}

function setFilter(f, btn) {
  currentFilter = f || 'status:pending';
  document.querySelectorAll('.filters button').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  refreshTasks();
}

function filterProject(p) {
  currentProject = p;
  document.getElementById('headerTitle').textContent = p || 'Taskwarrior';
  document.querySelectorAll('.project-item').forEach(el => el.classList.remove('active'));
  event.target.classList.add('active');
  toggleSidebar(false);
  refreshTasks();
}

function toggleSidebar(force) {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('overlay');
  const open = force !== undefined ? force : !sb.classList.contains('open');
  sb.classList.toggle('open', open);
  ov.classList.toggle('open', open);
}

function formatDate(d) {
  if (!d) return '';
  const m = d.match(/(\\d{4})(\\d{2})(\\d{2})/);
  if (m) return m[2] + '/' + m[3];
  return d.slice(0,10);
}

function esc(s) { 
  const d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; 
}

refreshTasks();
</script>
</body>
</html>`;
  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(html);
}

// --- Main server ---

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const p = url.pathname;

  // CORS for local network
  res.setHeader('Access-Control-Allow-Origin', '*');

  // API routes
  if (p.startsWith('/api/tasks')) return handleTaskAPI(req, res, p);

  // App routes
  if (p === '/') return serveIndex(res);
  if (p === '/timer') return serveFile(res, path.join(DIR, 'timer/timer.html'));
  if (p === '/pos' || p === '/pos/') return serveFile(res, path.join(DIR, 'pos-panaderia/index.html'));
  if (p.startsWith('/pos/')) return serveFile(res, path.join(DIR, 'pos-panaderia', p.slice(5)));
  if (p === '/calendario' || p === '/calendario/') return serveFile(res, path.join(DIR, 'calendario-semana/index.html'));
  if (p === '/taskwarrior' || p === '/taskwarrior/') return serveTaskwarriorUI(res);

  // Static files
  serveFile(res, path.join(DIR, p));
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Herramientas server: http://0.0.0.0:${PORT}`);
});
