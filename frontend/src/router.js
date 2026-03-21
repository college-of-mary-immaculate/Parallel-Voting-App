import { LoginPage } from './pages/login.js';
import { VoterPage } from './pages/voterPage.js';
import { ElectionPage } from './pages/election.js';
import { DashboardPage } from './pages/dashboard.js';
import { ElectionAdminPage } from './pages/electionAdmin.js';
import { getToken } from './auth.js';

function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
        return null;
    }
}

// Track what's currently rendered so we never tear down a live page
// for the same route (which would destroy its socket connection)
let _currentPath = null;

// Safe redirect — replaces history entry instead of pushing, breaks recursion
function redirect(path) {
    history.replaceState({}, '', path);
    render(path);
}

export function navigate(path) {
    history.pushState({}, '', path);
    render(path);
}

function render(path) {
    const app = document.getElementById('app');
    const token = getToken();
    const user = getUser();

    // ── Auth redirects (before same-path guard so auth changes always apply) ──
    if (!token && path !== '/login') {
        redirect('/login');
        return;
    }
    if (token && path === '/login') {
        redirect(user?.role === 'Admin' ? '/dashboard' : '/voter');
        return;
    }

    // ── Same-path guard ───────────────────────────────────────────────────────
    // If we're already rendering this exact path, do nothing.
    // This is the key fix: prevents socket destruction on redundant renders
    // caused by Socket.io internals, popstate, or navigate() called with the
    // current path.
    if (path === _currentPath) return;
    _currentPath = path;

    // ── Tear down previous page ───────────────────────────────────────────────
    // Disconnect any socket the outgoing page registered on its container
    // before wiping the DOM, so we don't leak socket connections.
    const existing = app.firstElementChild;
    if (existing?._socket) {
        existing._socket.disconnect();
        existing._socket = null;
    }
    app.innerHTML = '';

    // ── Mount new page ────────────────────────────────────────────────────────
    if (path === '/login') {
        app.appendChild(LoginPage());

    } else if (path === '/dashboard') {
        if (user?.role === 'Admin') {
            app.appendChild(DashboardPage());
        } else {
            redirect(user?.role === 'Voter' ? '/voter' : '/login');
        }

    } else if (path === '/voter') {
        if (user?.role === 'Voter') {
            app.appendChild(VoterPage());
        } else {
            redirect(user?.role === 'Admin' ? '/dashboard' : '/login');
        }

    } else if (path.startsWith('/admin/elections/')) {
        const id = path.split('/admin/elections/')[1];
        if (user?.role === 'Admin') {
            app.appendChild(ElectionAdminPage(id));
        } else {
            redirect(user?.role === 'Voter' ? '/voter' : '/login');
        }

    } else if (path.startsWith('/election/')) {
        const id = path.split('/election/')[1];
        app.appendChild(ElectionPage(id));

    } else {
        if (user?.role === 'Admin') {
            redirect('/dashboard');
        } else if (user?.role === 'Voter') {
            redirect('/voter');
        } else {
            redirect('/login');
        }
    }
}

// Handle browser back/forward — reset current path so back nav always re-renders
window.addEventListener('popstate', () => {
    _currentPath = null;
    render(location.pathname);
});

// Initial load
render(location.pathname === '/'
    ? (getToken() ? (getUser()?.role === 'Admin' ? '/dashboard' : '/voter') : '/login')
    : location.pathname
);