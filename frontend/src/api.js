const API_URL = 'http://localhost:5173/api'; // main API for auth

function authHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
}

async function handleResponse(res) {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.message || 'Request failed');
    return data;
}

// ── Main API ─────────────────────────────────────────
// Auth / login
export async function loginRequest(email, password) {
    const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return handleResponse(res);
}

// ── Admin API ────────────────────────────────────────
const ADMIN_API = `${API_URL}`;

export async function getAdminElections() {
    const res = await fetch(`${ADMIN_API}/elections`, { headers: authHeaders() });
    return handleResponse(res);
}

export async function getAdminElectionDetails(id) {
    const res = await fetch(`${ADMIN_API}/elections/${id}`, { headers: authHeaders() });
    return handleResponse(res);
}

export async function getElectionResults(id) {
    const res = await fetch(`${ADMIN_API}/elections/${id}/results`, { headers: authHeaders() });
    return handleResponse(res);
}

export async function updateElectionStatus(id, status) {
    const res = await fetch(`${ADMIN_API}/elections/${id}/status`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ status })
    });
    return handleResponse(res);
}

export async function deleteElection(id) {
    const res = await fetch(`${ADMIN_API}/elections/${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    return handleResponse(res);
}

// ── Voter API ───────────────────────────────────────
const VOTER_API = `${API_URL}/voter`;

export async function getVoterElections() {
    const res = await fetch(`${VOTER_API}/elections`, { headers: authHeaders() });
    return handleResponse(res);
}

export async function getVoterElectionDetails(id) {
    const res = await fetch(`${VOTER_API}/elections/${id}`, { headers: authHeaders() });
    return handleResponse(res);
}

export async function castVote(electionId, votes) {
    const res = await fetch(`${VOTER_API}/vote/${electionId}`, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ votes })
    });
    return handleResponse(res);
}

export async function getMyVotes() {
    const res = await fetch(`${VOTER_API}/myvotes`, { headers: authHeaders() });
    return handleResponse(res);
}