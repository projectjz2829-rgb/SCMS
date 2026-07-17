js_code = """
// ==========================================
// SYNC MANAGER & BROADCAST LOGIC
// ==========================================

class SyncManager {
    constructor() {
        this.interval = 30000;
        this.timer = null;
        this.isFetching = false;
        
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this.stop();
            } else {
                this.fetchData();
                this.start();
            }
        });
    }

    start() {
        if (!this.timer && !document.hidden) {
            this.timer = setInterval(() => this.fetchData(), this.interval);
        }
    }

    stop() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    async fetchData() {
        if (this.isFetching) return;
        this.isFetching = true;
        try {
            // Fetch Announcements
            const announcements = await apiRequest('GET', '/api/announcements/');
            this.renderAnnouncements(announcements);
        } catch (err) {
            console.error('Sync error:', err);
        } finally {
            this.isFetching = false;
        }
    }

    renderAnnouncements(data) {
        const container = document.getElementById('announcementsContainer');
        if (!container) return; // Might not exist on this dashboard

        if (!data || data.length === 0) {
            container.innerHTML = '<div class="text-muted">No announcements at this time.</div>';
            return;
        }

        container.innerHTML = data.map(ann => {
            const badge = ann.pinned ? '<span class="badge bg-danger me-2">Pinned</span>' : '';
            return `
                <div class="card mb-2 border-0 shadow-sm">
                    <div class="card-body">
                        <h6 class="card-title">${badge}${escapeHtml(ann.title)}</h6>
                        <p class="card-text small mb-1">${escapeHtml(ann.message)}</p>
                        <div class="text-muted" style="font-size: 0.75rem;">${new Date(ann.created_at).toLocaleString()}</div>
                    </div>
                </div>
            `;
        }).join('');
    }
}

const syncManager = new SyncManager();

document.addEventListener('DOMContentLoaded', () => {
    // Start syncing
    syncManager.fetchData();
    syncManager.start();

    // Broadcast Form Handler
    const broadcastForm = document.getElementById('broadcastForm');
    if (broadcastForm) {
        broadcastForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = broadcastForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Sending...';

            const payload = {
                title: document.getElementById('broadcastTitle').value,
                message: document.getElementById('broadcastMessage').value,
                priority: document.getElementById('broadcastPriority').value,
                expiry_date: document.getElementById('broadcastExpiry').value || null,
                pinned: document.getElementById('broadcastPinned').checked,
                active: document.getElementById('broadcastActive').checked
            };

            try {
                await apiRequest('POST', '/api/announcements/', payload);
                if (typeof showToast === 'function') showToast('Broadcast sent successfully!', 'success');
                
                const m = bootstrap.Modal.getInstance(document.getElementById('broadcastModal'));
                if (m) m.hide();
                broadcastForm.reset();
                
                syncManager.fetchData(); // Instantly refresh
            } catch (err) {
                if (typeof showToast === 'function') showToast(err.message || 'Failed to send broadcast.', 'danger');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        });
    }
});
"""

with open('frontend/static/js/dashboard.js', 'a', encoding='utf-8') as f:
    f.write(js_code)
print("done")
