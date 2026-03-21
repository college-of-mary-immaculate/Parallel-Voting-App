import { logout } from '../auth.js';
import { navigate } from '../router.js';
import { getAdminElections, updateElectionStatus, deleteElection } from '../api.js';

export function DashboardPage() {
    const container = document.createElement('div');
    container.className = 'dashboard';

    container.innerHTML = `
        <header class="dashboard-header">
            <div class="header-left">
                <span class="logo">🛠️ Admin Panel</span>
            </div>
            <div class="header-right">
                <button class="btn-logout" id="logoutBtn">Logout</button>
            </div>
        </header>

        <main class="dashboard-main">
            <div class="dashboard-title">
                <h1>Election Management</h1>
                <p>Monitor and manage elections</p>
            </div>
            <div class="elections-grid" id="electionsGrid">
                <div class="loading">Loading elections...</div>
            </div>
        </main>
    `;

    container.querySelector('#logoutBtn').addEventListener('click', () => {
        logout();
        navigate('/login');
    });

    loadElections(container.querySelector('#electionsGrid'));

    return container;
}

async function loadElections(grid) {
    try {
        const elections = await getAdminElections();

        if (!elections || elections.length === 0) {
            grid.innerHTML = `<p>No elections available.</p>`;
            return;
        }

        grid.innerHTML = '';
        elections.forEach(election => {
            const card = createAdminCard(election);
            grid.appendChild(card);
        });

    } catch (err) {
        grid.innerHTML = `<p>${err.message}</p>`;
    }
}

function createAdminCard(election) {
    const card = document.createElement('div');
    card.className = 'election-card';

    let buttons = '';

    if (election.status === 'Pending') buttons += `<button class="btn-start">Start</button>`;
    if (election.status === 'Active')  buttons += `<button class="btn-end">End</button>`;
    if (election.status !== 'Active')  buttons += `<button class="btn-delete">Delete</button>`;

    card.innerHTML = `
        <div class="card-badge">${election.status}</div>
        <h2>${election.title}</h2>
        <p>${election.description || 'No description'}</p>
        <div class="admin-actions">
            <button class="btn-details">View Details</button>
            ${buttons}
        </div>
    `;

    // View details
    card.querySelector('.btn-details').addEventListener('click', () => {
        navigate(`/admin/elections/${election.id}`);
    });

    // Start election
    card.querySelector('.btn-start')?.addEventListener('click', async () => {
        await updateElectionStatus(election.id, 'Active');
        location.reload();
    });

    // End election
    card.querySelector('.btn-end')?.addEventListener('click', async () => {
        await updateElectionStatus(election.id, 'Ended');
        location.reload();
    });

    // Delete election
    card.querySelector('.btn-delete')?.addEventListener('click', async () => {
        if (confirm('Delete this election?')) {
            await deleteElection(election.id);
            location.reload();
        }
    });

    return card;
}