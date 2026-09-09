export async function request(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (response.status === 204) return null

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(payload.error?.message || 'No se pudo completar la petición')
  }

  return payload.data
}