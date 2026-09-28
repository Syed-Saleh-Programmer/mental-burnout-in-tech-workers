const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`
    try {
      const body = await response.json()
      message = body.detail || message
    } catch {
      // Keep the HTTP error when the server does not return JSON.
    }
    throw new Error(message)
  }

  return response.json()
}

export function getHealth() {
  return request('/health')
}

export function predictRisk(payload) {
  return request('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}
