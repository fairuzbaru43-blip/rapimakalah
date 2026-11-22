export async function apiRequest(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    credentials: 'same-origin',
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {})
    }
  });
  if (response.status === 204) return null;
  if (!response.headers.get('content-type')?.includes('application/json')) {
    throw new Error('Server RapiMakalah tidak tersedia atau mengirim respons yang tidak dikenali.');
  }
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.error || 'Permintaan ke server gagal.');
    error.status = response.status;
    throw error;
  }
  return result;
}

export async function getCurrentUser() {
  const result = await apiRequest('/api/auth/me');
  return result.user;
}

export async function getDocumentVersions(id) {
  return apiRequest('/api/documents/' + encodeURIComponent(id) + '/versions');
}
