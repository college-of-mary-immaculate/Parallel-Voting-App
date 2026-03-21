import { navigate } from '../router.js';
import { getVoterElectionDetails, castVote } from '../api.js';

export function ElectionPage(electionId) {
    const container = document.createElement('div');
    container.className = 'election-page';

    container.innerHTML = `
        <header class="dashboard-header">
            <div class="header-left">
                <button class="btn-back" id="backBtn">← Back</button>
                <span class="logo">🗳️ VoteSystem</span>
            </div>
        </header>

        <main class="election-main" id="electionMain">
            <div class="loading">Loading election...</div>
        </main>
    `;

    container.querySelector('#backBtn').addEventListener('click', () => navigate('/voter'));

    loadElection(container.querySelector('#electionMain'), electionId);

    return container;
}

async function loadElection(main, electionId) {
    try {
        const election = await getVoterElectionDetails(electionId);

        if (election.status !== 'Active') {
            main.innerHTML = `<div class="error-state"><p>This election is not active.</p></div>`;
            return;
        }

        main.innerHTML = `
            <div class="election-header">
                <h1>${election.title}</h1>
                <p class="election-desc">${election.description || ''}</p>
            </div>
            <form class="positions-form" id="voteForm">
                <div class="positions-list" id="positionsList"></div>
                <div class="vote-actions">
                    <div class="vote-status" id="voteStatus"></div>
                    <button type="submit" class="btn-submit" id="submitBtn">Submit Votes</button>
                </div>
            </form>
        `;

        const positionsList = main.querySelector('#positionsList');

        if (!election.positions || election.positions.length === 0) {
            positionsList.innerHTML = '<p class="empty-msg">No positions available for this election.</p>';
        } else {
            election.positions.forEach((position, i) => {
                positionsList.appendChild(createPositionBlock(position, i));
            });
        }

        main.querySelector('#voteForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await handleSubmit(main, election, electionId);
        });

    } catch (err) {
        main.innerHTML = `
            <div class="error-state">
                <div class="error-icon">⚠️</div>
                <p>${err.message || 'Failed to load election'}</p>
                <button class="btn-retry" onclick="history.back()">Go Back</button>
            </div>
        `;
    }
}

function createPositionBlock(position, index) {
    const block = document.createElement('div');
    block.className = 'position-block';
    block.style.animationDelay = `${index * 0.1}s`;

    const candidates = position.candidates || [];

    block.innerHTML = `
        <h3 class="position-title">${position.title || position.name}</h3>
        <p class="position-hint">Select one candidate</p>
        <div class="candidates-list">
            ${candidates.length === 0
                ? `<p class="empty-msg">No candidates for this position.</p>`
                : candidates.map(c => `
                <label class="candidate-option">
                    <input type="radio" name="position_${position.id}" value="${c.id}" required />
                    <div class="candidate-card">
                        <div class="candidate-avatar">${(c.name || 'C')[0].toUpperCase()}</div>
                        <div class="candidate-info">
                            <span class="candidate-name">${c.name}</span>
                            ${c.description ? `<span class="candidate-desc">${c.description}</span>` : ''}
                        </div>
                        <div class="candidate-check">✓</div>
                    </div>
                </label>
            `).join('')}
        </div>
    `;

    return block;
}

async function handleSubmit(main, election, electionId) {
    const form = main.querySelector('#voteForm');
    const submitBtn = main.querySelector('#submitBtn');
    const voteStatus = main.querySelector('#voteStatus');

    const votes = [];
    const positions = election.positions || [];

    // Validate all positions have a selection
    for (const position of positions) {
        const selected = form.querySelector(`input[name="position_${position.id}"]:checked`);
        if (!selected) {
            voteStatus.textContent = `⚠️ Please select a candidate for: ${position.title || position.name}`;
            voteStatus.className = 'vote-status error';
            voteStatus.style.display = 'block';
            return;
        }
        votes.push({
            position_id: Number(position.id),
            candidate_id: Number(selected.value)
        });
    }

    // Lock UI
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
    voteStatus.textContent = '';
    voteStatus.style.display = 'none';

    try {
        const result = await castVote(electionId, votes);

        main.innerHTML = `
            <div class="success-state">
                <div class="success-icon">✅</div>
                <h2>Vote Cast Successfully!</h2>
                <p>${result.message || 'Your votes have been recorded. Thank you for participating.'}</p>
                <button class="btn-back-dash" id="backDashboard">Back to Dashboard</button>
            </div>
        `;
        main.querySelector('#backDashboard').addEventListener('click', () => navigate('/voter'));

    } catch (err) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit Votes';
        voteStatus.textContent = `❌ ${err.message || 'Failed to submit votes'}`;
        voteStatus.className = 'vote-status error';
        voteStatus.style.display = 'block';
        console.error('Vote submission error:', err);
    }
}