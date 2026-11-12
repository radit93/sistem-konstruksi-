// API Client Helper untuk PCM Piping Dashboard
const API_BASE = '/api';
const DEPT_KEY = 'pcm_department_filter';

export const api = {
    getToken() {
        return localStorage.getItem('pcm_token') || '';
    },
    setToken(token) {
        if (token) localStorage.setItem('pcm_token', token);
        else localStorage.removeItem('pcm_token');
    },
    getUser() {
        try {
            const raw = localStorage.getItem('pcm_user');
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    },
    setUser(user) {
        if (user) localStorage.setItem('pcm_user', JSON.stringify(user));
        else localStorage.removeItem('pcm_user');
        // Hanya superadmin yang boleh menyaring per departemen; role lain
        // sudah dibatasi server berdasarkan departemennya sendiri.
        if (!user || !user.is_superadmin) this.setDepartmentFilter(null);
    },
    getDepartmentFilter() {
        const raw = localStorage.getItem(DEPT_KEY);
        const id = raw ? Number(raw) : null;
        return Number.isFinite(id) && id > 0 ? id : null;
    },
    setDepartmentFilter(id) {
        if (id) localStorage.setItem(DEPT_KEY, String(id));
        else localStorage.removeItem(DEPT_KEY);
    },
    async fetchWithRetry(url, options, maxRetries = 2) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fetch(url, options);
            } catch (err) {
                if (attempt === maxRetries) throw err;
                // Jeda progresif 200ms, 500ms saat server / network transient drop
                await new Promise((r) => setTimeout(r, 200 * (attempt + 1)));
            }
        }
    },
    async request(endpoint, options = {}) {
        const { skipAuthRedirect = false, ...init } = options;
        const token = this.getToken();
        const department = this.getDepartmentFilter();
        const isFormData = typeof FormData !== 'undefined' && init.body instanceof FormData;
        const headers = {
            'Accept': 'application/json',
            ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
            ...(department ? { 'X-Department-Id': String(department) } : {}),
            ...(init.headers || {})
        };
        const res = await this.fetchWithRetry(`${API_BASE}${endpoint}`, {
            ...init,
            headers
        });
        // A 401 normally means the stored token died. On the login call it just
        // means the credential pair was wrong, and the caller wants that message.
        if (res.status === 401 && !skipAuthRedirect) {
            this.setToken('');
            this.setUser(null);
            window.dispatchEvent(new Event('pcm-auth-changed'));
            throw new Error('Sesi berakhir, silakan login kembali');
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
            throw new Error(data.message || `Error HTTP ${res.status}`);
        }
        return data;
    },
    get(endpoint) {
        // ponytail: unwrap paginator Laravel {data:[...]} -> array; hapus bila API full-REST.
        return this.request(endpoint, { method: 'GET' }).then(d =>
            (d && Array.isArray(d.data) && typeof d.current_page === 'number') ? d.data : d);
    },
    post(endpoint, body) {
        return this.request(endpoint, {
            method: 'POST',
            body: JSON.stringify(body)
        });
    },
    put(endpoint, body) {
        return this.request(endpoint, {
            method: 'PUT',
            body: JSON.stringify(body)
        });
    },
    patch(endpoint, body) {
        return this.request(endpoint, {
            method: 'PATCH',
            body: JSON.stringify(body)
        });
    },
    del(endpoint) {
        return this.request(endpoint, { method: 'DELETE' });
    },
    delete(endpoint) {
        return this.del(endpoint);
    },
    upload(endpoint, formData) {
        return this.request(endpoint, { method: 'POST', body: formData });
    },
    async download(endpoint, fallbackName = 'dokumen') {
        const token = this.getToken();
        const department = this.getDepartmentFilter();
        const res = await fetch(`${API_BASE}${endpoint}`, {
            headers: {
                'Accept': 'application/octet-stream',
                ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
                ...(department ? { 'X-Department-Id': String(department) } : {})
            }
        });

        if (res.status === 401) {
            this.setToken('');
            this.setUser(null);
            window.dispatchEvent(new Event('pcm-auth-changed'));
            throw new Error('Sesi berakhir, silakan login kembali');
        }

        if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data.message || `Gagal mengunduh dokumen (HTTP ${res.status})`);
        }

        const disposition = res.headers.get('Content-Disposition') || '';
        let filename = fallbackName;
        const utf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
        const plain = disposition.match(/filename="?([^";]+)"?/i);

        if (utf8?.[1]) {
            try {
                filename = decodeURIComponent(utf8[1]);
            } catch (e) {
                filename = utf8[1];
            }
        } else if (plain?.[1]) {
            filename = plain[1];
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    },
    async login(email, password) {
        const res = await this.request('/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
            skipAuthRedirect: true
        });
        if (res.token && res.user) {
            this.setToken(res.token);
            this.setUser(res.user);
            window.dispatchEvent(new Event('pcm-auth-changed'));
        }
        return res;
    },
    async logout() {
        try {
            await this.post('/logout', {});
        } catch (e) {
            // ignore
        }
        this.setToken('');
        this.setUser(null);
        window.dispatchEvent(new Event('pcm-auth-changed'));
    }
};
