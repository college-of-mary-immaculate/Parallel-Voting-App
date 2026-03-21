import { navigate } from '../router.js';
import { getAdminElectionDetails as getElectionDetails, getElectionResults } from '../api.js';
import { io } from 'https://cdn.socket.io/4.7.5/socket.io.esm.min.js';

export function ElectionAdminPage(electionId) {
    const container = document.createElement('div');
    container.className = 'election-admin-page';

    container.innerHTML = `
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');

            .election-admin-page {
                min-height: 100vh;
                background: #0a0a0f;
                color: #e8e8f0;
                font-family: 'Syne', sans-serif;
                padding: 0;
            }

            .ea-header {
                display: flex;
                align-items: center;
                gap: 16px;
                padding: 28px 40px;
                border-bottom: 1px solid rgba(255,255,255,0.06);
                background: rgba(255,255,255,0.02);
                backdrop-filter: blur(10px);
                position: sticky;
                top: 0;
                z-index: 100;
            }

            .ea-back-btn {
                background: none;
                border: 1px solid rgba(255,255,255,0.15);
                color: #a0a0b8;
                padding: 8px 16px;
                border-radius: 8px;
                cursor: pointer;
                font-family: 'DM Mono', monospace;
                font-size: 12px;
                letter-spacing: 0.05em;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                gap: 6px;
            }
            .ea-back-btn:hover {
                border-color: rgba(255,255,255,0.35);
                color: #e8e8f0;
                background: rgba(255,255,255,0.05);
            }

            .ea-header-info { flex: 1; }
            .ea-header-info h1 {
                font-size: 22px;
                font-weight: 800;
                margin: 0 0 2px;
                letter-spacing: -0.02em;
            }
            .ea-header-info p {
                margin: 0;
                font-size: 12px;
                font-family: 'DM Mono', monospace;
                color: #606078;
            }

            .ea-status-badge {
                padding: 6px 14px;
                border-radius: 20px;
                font-size: 11px;
                font-family: 'DM Mono', monospace;
                font-weight: 500;
                letter-spacing: 0.08em;
                text-transform: uppercase;
            }
            .ea-status-badge.Pending  { background: rgba(255,190,50,0.12); color: #ffbe32; border: 1px solid rgba(255,190,50,0.25); }
            .ea-status-badge.Active   { background: rgba(50,220,130,0.12); color: #32dc82; border: 1px solid rgba(50,220,130,0.25); }
            .ea-status-badge.Ended    { background: rgba(160,100,255,0.12); color: #c87eff; border: 1px solid rgba(160,100,255,0.25); }

            .ea-body { padding: 40px; max-width: 1200px; margin: 0 auto; }

            .ea-meta-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 16px;
                margin-bottom: 48px;
            }

            .ea-meta-card {
                background: rgba(255,255,255,0.03);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 12px;
                padding: 20px 24px;
            }
            .ea-meta-card .label {
                font-size: 10px;
                font-family: 'DM Mono', monospace;
                color: #606078;
                letter-spacing: 0.1em;
                text-transform: uppercase;
                margin-bottom: 8px;
            }
            .ea-meta-card .value {
                font-size: 18px;
                font-weight: 700;
                color: #e8e8f0;
            }

            .ea-section-title {
                font-size: 13px;
                font-family: 'DM Mono', monospace;
                color: #606078;
                letter-spacing: 0.12em;
                text-transform: uppercase;
                margin: 0 0 20px;
                display: flex;
                align-items: center;
                gap: 10px;
            }
            .ea-section-title::after {
                content: '';
                flex: 1;
                height: 1px;
                background: rgba(255,255,255,0.06);
            }

            .ea-positions-list { display: flex; flex-direction: column; gap: 32px; }

            .ea-position-block {
                background: rgba(255,255,255,0.02);
                border: 1px solid rgba(255,255,255,0.06);
                border-radius: 16px;
                overflow: hidden;
                animation: fadeUp 0.4s ease both;
            }
            @keyframes fadeUp {
                from { opacity: 0; transform: translateY(16px); }
                to { opacity: 1; transform: translateY(0); }
            }

            .ea-position-header {
                padding: 20px 28px;
                border-bottom: 1px solid rgba(255,255,255,0.05);
                display: flex;
                align-items: center;
                justify-content: space-between;
            }
            .ea-position-header h3 {
                font-size: 16px;
                font-weight: 700;
                margin: 0;
                letter-spacing: -0.01em;
            }
            .ea-vote-total {
                font-family: 'DM Mono', monospace;
                font-size: 12px;
                color: #606078;
            }
            .ea-vote-total span {
                color: #e8e8f0;
                font-weight: 500;
            }

            .ea-chart-area { padding: 28px; }

            .ea-bar-chart { display: flex; flex-direction: column; gap: 14px; }

            .ea-bar-row {
                display: grid;
                grid-template-columns: 180px 1fr 60px;
                align-items: center;
                gap: 16px;
            }

            .ea-bar-name {
                font-size: 13px;
                font-weight: 600;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                display: flex;
                align-items: center;
                gap: 8px;
            }
            .ea-rank-pill {
                width: 22px;
                height: 22px;
                border-radius: 50%;
                font-size: 10px;
                font-family: 'DM Mono', monospace;
                font-weight: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
            }
            .ea-rank-pill.rank-1 { background: rgba(255,210,60,0.2); color: #ffd23c; border: 1px solid rgba(255,210,60,0.4); }
            .ea-rank-pill.rank-2 { background: rgba(180,180,200,0.2); color: #c8c8d8; border: 1px solid rgba(180,180,200,0.35); }
            .ea-rank-pill.rank-3 { background: rgba(200,130,80,0.2); color: #c88250; border: 1px solid rgba(200,130,80,0.35); }
            .ea-rank-pill.rank-other { background: rgba(255,255,255,0.05); color: #606078; border: 1px solid rgba(255,255,255,0.1); }

            .ea-bar-track {
                height: 10px;
                background: rgba(255,255,255,0.05);
                border-radius: 99px;
                overflow: hidden;
            }
            .ea-bar-fill {
                height: 100%;
                border-radius: 99px;
                transition: width 0.8s cubic-bezier(0.16, 1, 0.3, 1);
                width: 0;
            }
            .ea-bar-fill.rank-1 { background: linear-gradient(90deg, #ffd23c, #ff9a3c); }
            .ea-bar-fill.rank-2 { background: linear-gradient(90deg, #a0a0c0, #c8c8d8); }
            .ea-bar-fill.rank-3 { background: linear-gradient(90deg, #c88250, #e0a070); }
            .ea-bar-fill.rank-other { background: linear-gradient(90deg, #4060a0, #6080c0); }

            .ea-bar-count {
                font-family: 'DM Mono', monospace;
                font-size: 13px;
                font-weight: 500;
                color: #a0a0b8;
                text-align: right;
            }

            .ea-winner-tag {
                font-size: 9px;
                font-family: 'DM Mono', monospace;
                letter-spacing: 0.1em;
                color: #32dc82;
                border: 1px solid rgba(50,220,130,0.3);
                background: rgba(50,220,130,0.08);
                padding: 2px 7px;
                border-radius: 4px;
                margin-left: 6px;
            }

            .ea-no-votes {
                font-family: 'DM Mono', monospace;
                font-size: 13px;
                color: #404058;
                text-align: center;
                padding: 16px 0;
            }

            .ea-donut-row {
                display: flex;
                align-items: center;
                gap: 32px;
                flex-wrap: wrap;
            }
            .ea-donut-wrap { position: relative; width: 140px; height: 140px; flex-shrink: 0; }
            .ea-donut-center {
                position: absolute;
                inset: 0;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                pointer-events: none;
            }
            .ea-donut-center .big { font-size: 26px; font-weight: 800; }
            .ea-donut-center .small { font-size: 10px; font-family: 'DM Mono', monospace; color: #606078; }

            .ea-legend { display: flex; flex-direction: column; gap: 10px; flex: 1; min-width: 160px; }
            .ea-legend-item { display: flex; align-items: center; gap: 10px; font-size: 13px; }
            .ea-legend-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
            .ea-legend-name { flex: 1; font-weight: 600; }
            .ea-legend-pct { font-family: 'DM Mono', monospace; font-size: 12px; color: #606078; }

            .ea-loading, .ea-error {
                text-align: center;
                padding: 80px 20px;
                font-family: 'DM Mono', monospace;
                color: #404058;
                font-size: 14px;
            }
            .ea-error { color: #ff6060; }

            .ea-spinner {
                width: 28px; height: 28px;
                border: 2px solid rgba(255,255,255,0.08);
                border-top-color: #a060ff;
                border-radius: 50%;
                animation: spin 0.8s linear infinite;
                margin: 0 auto 16px;
            }
            @keyframes spin { to { transform: rotate(360deg); } }

            .ea-socket-status {
                display: flex;
                align-items: center;
                gap: 6px;
                font-family: 'DM Mono', monospace;
                font-size: 11px;
                color: #606078;
            }
            .ea-socket-dot {
                width: 7px;
                height: 7px;
                border-radius: 50%;
                background: #404058;
                transition: background 0.3s;
            }
            .ea-socket-dot.connected { background: #32dc82; box-shadow: 0 0 6px rgba(50,220,130,0.5); }
            .ea-socket-dot.disconnected { background: #ff6060; }
        </style>

        <header class="ea-header">
            <button class="ea-back-btn" id="backBtn">← Back</button>
            <div class="ea-header-info">
                <h1 id="electionTitle">Loading...</h1>
                <p id="electionDates"></p>
            </div>
            <div class="ea-socket-status" id="socketStatus">
                <div class="ea-socket-dot" id="socketDot"></div>
                <span id="socketLabel">connecting...</span>
            </div>
            <span class="ea-status-badge" id="statusBadge"></span>
        </header>

        <div class="ea-body">
            <div id="pageContent">
                <div class="ea-loading">
                    <div class="ea-spinner"></div>
                    Loading election details...
                </div>
            </div>
        </div>
    `;

    container.querySelector('#backBtn').addEventListener('click', () => {
        if (container._socket) container._socket.disconnect();
        navigate('/dashboard');
    });

    loadElectionDetail(container, electionId);

    return container;
}

async function loadElectionDetail(container, electionId) {
    const content = container.querySelector('#pageContent');
    const socketDot = container.querySelector('#socketDot');
    const socketLabel = container.querySelector('#socketLabel');

    // ── 1. Set up socket FIRST — before any awaits ────────────────────────
    // This ensures the 'connect' event is never missed regardless of how
    // long the API calls take. window.location.origin goes through nginx
    // which proxies /socket.io/ to the backend cluster.
    const socket = io(window.location.origin, {
        path: '/socket.io/',
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 10,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000,
    });
    container._socket = socket;

    // Track whether the page has rendered so the results:update handler
    // knows if it can safely update the DOM.
    let pageRendered = false;
    // Buffer any results:update events that arrive before render completes.
    let pendingUpdate = null;

    socket.on('connect', () => {
        socket.emit('join:election', electionId);
        console.log(`[socket] connected ${socket.id} — joined election:${electionId}`);
        socketDot.className = 'ea-socket-dot connected';
        socketLabel.textContent = 'live';
    });

    socket.on('disconnect', (reason) => {
        console.warn('[socket] disconnected:', reason);
        socketDot.className = 'ea-socket-dot disconnected';
        socketLabel.textContent = 'disconnected';
    });

    socket.on('connect_error', (err) => {
        console.error('[socket] connect_error:', err.message);
        socketDot.className = 'ea-socket-dot disconnected';
        socketLabel.textContent = 'error';
    });

    socket.on('reconnect', (attempt) => {
        console.log(`[socket] reconnected after ${attempt} attempts`);
        // Re-join the room on reconnect — the server won't remember us
        socket.emit('join:election', electionId);
        socketDot.className = 'ea-socket-dot connected';
        socketLabel.textContent = 'live';
    });

    socket.on('results:update', ({ electionId: updatedId, results }) => {
        if (String(updatedId) !== String(electionId)) return;
        console.log('[socket] results:update received, pageRendered:', pageRendered, 'details:', !!details);

        if (!pageRendered || !details) {
            pendingUpdate = results;
            console.log('[socket] buffered — not ready yet');
            return;
        }

        try {
            applyResultsUpdate(content, details, results);
            console.log('[socket] DOM updated successfully');
        } catch (err) {
            console.error('[socket] applyResultsUpdate failed:', err);
        }
    });

    // ── 2. Now fetch data ─────────────────────────────────────────────────
    let details; // declared here so the socket handler closure can access it
    try {
        const [fetchedDetails, results] = await Promise.all([
            getElectionDetails(electionId),
            getElectionResults(electionId).catch(() => null),
        ]);
        details = fetchedDetails;

        // Update header
        container.querySelector('#electionTitle').textContent = details.title;
        container.querySelector('#electionDates').textContent =
            `${formatDate(details.start_date)} → ${formatDate(details.end_date)}`;
        const badge = container.querySelector('#statusBadge');
        badge.textContent = details.status;
        badge.className = `ea-status-badge ${details.status}`;

        // Build vote map: candidate_id -> vote count
        const voteMap = buildVoteMap(results);
        const totalVotes = Object.values(voteMap).reduce((s, v) => s + v, 0);

        // Render
        content.innerHTML = '';

        // Meta cards
        const meta = document.createElement('div');
        meta.className = 'ea-meta-grid';
        meta.innerHTML = `
            <div class="ea-meta-card">
                <div class="label">Total Votes Cast</div>
                <div class="value">${totalVotes.toLocaleString()}</div>
            </div>
            <div class="ea-meta-card">
                <div class="label">Positions</div>
                <div class="value">${details.positions?.length ?? 0}</div>
            </div>
            <div class="ea-meta-card">
                <div class="label">Total Candidates</div>
                <div class="value">${countCandidates(details.positions)}</div>
            </div>
            <div class="ea-meta-card">
                <div class="label">Status</div>
                <div class="value">${details.status}</div>
            </div>
        `;
        content.appendChild(meta);

        if (!details.positions || details.positions.length === 0) {
            const empty = document.createElement('p');
            empty.style.cssText = 'color:#606078;font-family:DM Mono,monospace;font-size:13px;';
            empty.textContent = 'No positions defined for this election.';
            content.appendChild(empty);
            pageRendered = true;
            return;
        }

        const sectionTitle = document.createElement('div');
        sectionTitle.className = 'ea-section-title';
        sectionTitle.textContent = 'Positions & Results';
        content.appendChild(sectionTitle);

        const positionsList = document.createElement('div');
        positionsList.className = 'ea-positions-list';
        details.positions.forEach((position, idx) => {
            positionsList.appendChild(buildPositionBlock(position, voteMap, idx));
        });
        content.appendChild(positionsList);

        // Animate bars
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                content.querySelectorAll('.ea-bar-fill[data-pct]').forEach(bar => {
                    bar.style.width = bar.dataset.pct + '%';
                });
                drawDonuts(content);

                // ── 3. Page is ready — flush any buffered update ──────────
                pageRendered = true;
                if (pendingUpdate) {
                    console.log('[socket] flushing buffered results:update');
                    applyResultsUpdate(content, details, pendingUpdate);
                    pendingUpdate = null;
                }
            });
        });

    } catch (err) {
        content.innerHTML = `<div class="ea-error">⚠ ${err.message}</div>`;
    }
}

// ── Applies a fresh results payload to the already-rendered DOM ─────────────
function applyResultsUpdate(content, details, results) {
    if (!details?.positions) {
        console.error('[apply] details.positions missing', details);
        return;
    }

    const freshVoteMap = buildVoteMap(results);
    const freshTotal = Object.values(freshVoteMap).reduce((s, v) => s + v, 0);

    console.log('[apply] freshVoteMap:', freshVoteMap, 'total:', freshTotal);

    // Update Total Votes Cast meta card
    const metaCards = content.querySelectorAll('.ea-meta-card .value');
    console.log('[apply] metaCards found:', metaCards.length);
    if (metaCards[0]) metaCards[0].textContent = freshTotal.toLocaleString();

    details.positions.forEach((position) => {
        const chartArea = content.querySelector(`#chart-${position.id}`);
        if (!chartArea) {
            console.warn('[apply] chartArea not found for position', position.id);
            return;
        }

        const candidates = position.candidates || [];
        const ranked = candidates
            .map(c => ({ ...c, votes: freshVoteMap[String(c.id)] ?? 0 }))
            .sort((a, b) => b.votes - a.votes);

        const positionTotal = ranked.reduce((s, c) => s + c.votes, 0);
        // Max votes among all candidates — used to scale bar widths
        const maxVotes = Math.max(...ranked.map(c => c.votes), 1);

        // Update position header vote count
        const voteSpan = chartArea.closest('.ea-position-block')?.querySelector('.ea-vote-total span');
        if (voteSpan) voteSpan.textContent = positionTotal.toLocaleString();

        // ── Update bars by candidate id, not index ────────────────────────
        // The DOM order was fixed at render time; rankings may have changed.
        // Each bar row has a data-candidate-id attribute we set at build time.
        const barRows = chartArea.querySelectorAll('.ea-bar-row');
        barRows.forEach(row => {
            const cId = row.dataset.candidateId;
            const votes = freshVoteMap[String(cId)] ?? 0;
            const pct = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
            const fill = row.querySelector('.ea-bar-fill');
            const count = row.querySelector('.ea-bar-count');
            if (fill) {
                // Remove transition temporarily, snap to 0, then re-enable and animate to new width.
                // This guarantees the browser sees a real change even if previous value was also 0.
                fill.style.transition = 'none';
                fill.style.width = '0%';
                void fill.offsetWidth; // flush — forces browser to commit the 0% before next paint
                fill.style.transition = '';
                fill.dataset.pct = pct.toFixed(1);
                fill.style.width = pct.toFixed(1) + '%';
                console.log(`[apply] bar cId=${cId} votes=${votes} → width=${pct.toFixed(1)}%`);
            }
            if (count) count.textContent = votes.toLocaleString();
        });

        // ── Update donut chart ────────────────────────────────────────────
        const canvas = chartArea.querySelector('canvas[data-candidates]');
        if (canvas) {
            canvas.dataset.candidates = JSON.stringify(ranked);
            drawDonuts(chartArea);
            const donutBig = canvas.closest('.ea-donut-wrap')?.querySelector('.ea-donut-center .big');
            if (donutBig) donutBig.textContent = positionTotal.toLocaleString();
        }

        // ── Update legend by candidate id ─────────────────────────────────
        const legendItems = chartArea.querySelectorAll('.ea-legend-item');
        legendItems.forEach(item => {
            const cId = item.dataset.candidateId;
            const votes = freshVoteMap[String(cId)] ?? 0;
            const pct = positionTotal > 0 ? Math.round((votes / positionTotal) * 100) : 0;
            const pctEl = item.querySelector('.ea-legend-pct');
            if (pctEl) pctEl.textContent = `${pct}% · ${votes}`;
        });
    });
}

function buildPositionBlock(position, voteMap, idx) {
    const block = document.createElement('div');
    block.className = 'ea-position-block';
    block.style.animationDelay = `${idx * 0.07}s`;

    const candidates = position.candidates || [];
    const ranked = candidates
        .map(c => ({ ...c, votes: voteMap[String(c.id)] ?? 0 }))
        .sort((a, b) => b.votes - a.votes);

    const positionTotal = ranked.reduce((s, c) => s + c.votes, 0);
    const maxVotes = ranked[0]?.votes || 1;

    block.innerHTML = `
        <div class="ea-position-header">
            <h3>${position.title}</h3>
            <div class="ea-vote-total">Total votes: <span>${positionTotal.toLocaleString()}</span></div>
        </div>
        <div class="ea-chart-area" id="chart-${position.id}"></div>
    `;

    const chartArea = block.querySelector(`#chart-${position.id}`);

    if (candidates.length === 0) {
        chartArea.innerHTML = `<div class="ea-no-votes">No candidates assigned</div>`;
        return block;
    }

    if (ranked.length <= 5) {
        const wrapper = document.createElement('div');
        wrapper.className = 'ea-donut-row';

        const donutWrap = document.createElement('div');
        donutWrap.className = 'ea-donut-wrap';
        const colors = ['#ffd23c','#c8c8d8','#c88250','#6080c0','#32dc82'];
        donutWrap.innerHTML = `
            <canvas width="140" height="140" data-candidates='${JSON.stringify(ranked)}' data-colors='${JSON.stringify(colors)}'></canvas>
            <div class="ea-donut-center">
                <div class="big">${positionTotal}</div>
                <div class="small">votes</div>
            </div>
        `;

        const legend = document.createElement('div');
        legend.className = 'ea-legend';
        ranked.forEach((c, i) => {
            const pct = positionTotal > 0 ? Math.round((c.votes / positionTotal) * 100) : 0;
            const item = document.createElement('div');
            item.className = 'ea-legend-item';
            item.dataset.candidateId = String(c.id);  // ← key for applyResultsUpdate
            item.innerHTML = `
                <div class="ea-legend-dot" style="background:${colors[i] || '#6080c0'}"></div>
                <div class="ea-legend-name">${c.name}${i < position.max_winners ? '<span class="ea-winner-tag">winner</span>' : ''}</div>
                <div class="ea-legend-pct">${pct}% · ${c.votes}</div>
            `;
            legend.appendChild(item);
        });

        wrapper.appendChild(donutWrap);
        wrapper.appendChild(legend);
        chartArea.appendChild(wrapper);

        const sep = document.createElement('div');
        sep.style.cssText = 'height:24px';
        chartArea.appendChild(sep);
    }

    const barChart = document.createElement('div');
    barChart.className = 'ea-bar-chart';

    ranked.forEach((c, i) => {
        const rankClass = i === 0 ? 'rank-1' : i === 1 ? 'rank-2' : i === 2 ? 'rank-3' : 'rank-other';
        const pct = maxVotes > 0 ? (c.votes / maxVotes) * 100 : 0;
        const isWinner = i < position.max_winners && positionTotal > 0;

        const row = document.createElement('div');
        row.className = 'ea-bar-row';
        row.dataset.candidateId = String(c.id);  // ← key for applyResultsUpdate
        row.innerHTML = `
            <div class="ea-bar-name">
                <span class="ea-rank-pill ${rankClass}">${i + 1}</span>
                ${c.name}${isWinner ? '<span class="ea-winner-tag">✓</span>' : ''}
            </div>
            <div class="ea-bar-track">
                <div class="ea-bar-fill ${rankClass}" data-pct="${pct.toFixed(1)}" style="width:0"></div>
            </div>
            <div class="ea-bar-count">${c.votes.toLocaleString()}</div>
        `;
        barChart.appendChild(row);
    });

    chartArea.appendChild(barChart);
    return block;
}

function drawDonuts(root) {
    root.querySelectorAll('canvas[data-candidates]').forEach(canvas => {
        const candidates = JSON.parse(canvas.dataset.candidates);
        const colors = JSON.parse(canvas.dataset.colors);
        const total = candidates.reduce((s, c) => s + c.votes, 0);

        const ctx = canvas.getContext('2d');
        const cx = 70, cy = 70, r = 56, innerR = 38;
        ctx.clearRect(0, 0, 140, 140);

        if (total === 0) {
            ctx.beginPath();
            ctx.arc(cx, cy, r, 0, Math.PI * 2);
            ctx.arc(cx, cy, innerR, 0, Math.PI * 2, true);
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
            ctx.fill();
            return;
        }

        let startAngle = -Math.PI / 2;
        candidates.forEach((c, i) => {
            const slice = (c.votes / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, startAngle, startAngle + slice);
            ctx.arc(cx, cy, innerR, startAngle + slice, startAngle, true);
            ctx.closePath();
            ctx.fillStyle = colors[i] || '#6080c0';
            ctx.globalAlpha = 0.85;
            ctx.fill();
            ctx.globalAlpha = 1;
            startAngle += slice + 0.02;
        });
    });
}

function buildVoteMap(results) {
    const map = {};
    if (!results) return map;
    const arr = Array.isArray(results) ? results : (results.votes || results.results || []);
    arr.forEach(r => {
        if (r.candidate_id != null) {
            const key = String(r.candidate_id);
            map[key] = (map[key] || 0) + Number(r.vote_count ?? r.count ?? 1);
        }
    });
    return map;
}

function countCandidates(positions) {
    if (!positions) return 0;
    return positions.reduce((s, p) => s + (p.candidates?.length || 0), 0);
}

function formatDate(dt) {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}