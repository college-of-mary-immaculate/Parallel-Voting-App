// ===== File: voterPage.js =====
import { getToken, logout } from '../auth.js';
import { navigate } from '../router.js';

/**
 * Fetch active elections from voter API with token
 */
async function getElections() {
    const token = getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await fetch('/api/voter/elections', {  // <-- voter endpoint
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Failed to fetch elections');
    }

    return res.json();
}

export function VoterPage() {
    const container = document.createElement('div');
    container.className = 'dashboard';

    container.innerHTML = `
        <header class="dashboard-header">
            <div class="header-left">
                <span class="logo">🗳️ VoteSystem</span>
            </div>
            <div class="header-right">
                <span class="user-label" id="userLabel"></span>
                <button class="btn-logout" id="logoutBtn">Logout</button>
            </div>
        </header>

        <main class="dashboard-main">
            <div class="dashboard-title">
                <h1>Active Elections</h1>
                <p>Select an election to cast your vote</p>
            </div>
            <div class="elections-grid" id="electionsGrid">
                <div class="loading">Loading elections...</div>
            </div>
        </main>
    `;

    // Set user label
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    container.querySelector('#userLabel').textContent = `👤 ${user.name || user.email || ''}`;

    // Logout
    container.querySelector('#logoutBtn').addEventListener('click', () => {
        logout();
        navigate('/login');
    });

    // Load elections
    loadElections(container.querySelector('#electionsGrid'));

    return container;
}

async function loadElections(grid) {
    try {
        const elections = await getElections();

        if (!elections || elections.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">🗳️</div>
                    <h3>No Active Elections</h3>
                    <p>There are no active elections at the moment. Check back later.</p>
                </div>
            `;
            return;
        }

        grid.innerHTML = '';
        elections.forEach((election, i) => {
            const card = createElectionCard(election, i);
            grid.appendChild(card);
        });

    } catch (err) {
        grid.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>${err.message || 'Failed to load elections'}</p>
                <button class="btn-retry">Retry</button>
            </div>
        `;
        grid.querySelector('.btn-retry').addEventListener('click', () => loadElections(grid));
    }
}

function createElectionCard(election, index) {
    const card = document.createElement('div');
    card.className = 'election-card';
    card.style.animationDelay = `${index * 0.08}s`;

    const start = new Date(election.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const end = new Date(election.end_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    card.innerHTML = `
        <div class="card-badge">Active</div>
        <h2 class="card-title">${election.title}</h2>
        <p class="card-desc">${election.description || 'No description provided.'}</p>
        <div class="card-dates">
            <span>📅 ${start} — ${end}</span>
        </div>
        <button class="btn-vote">Vote Now →</button>
    `;

    card.querySelector('.btn-vote').addEventListener('click', () => {
        navigate(`/election/${election.id}`);
    });

    return card;
}