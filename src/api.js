export function normalizeApiBase(value) {
  let result = value.trim().replace(/\/+$/, '');
  result = result.replace(/\/todos$/i, '');
  return result;
}

export async function listTodos(base, options = {}) {
  const response = await fetch(`${base}/todos`, { method: 'GET', ...options });
  const text = await response.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`API returned non-JSON content (HTTP ${response.status}). Check the Invoke URL.`);
  }
  if (!response.ok) {
    throw new Error(data?.message || `GET failed with HTTP ${response.status}`);
  }
  if (!Array.isArray(data)) {
    throw new Error('Expected a JSON array from GET /todos. Check that the route is connected to the correct Lambda.');
  }
  return data;
}

export async function createTodo(base, task) {
  const response = await fetch(`${base}/todos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ task }),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || `POST failed with HTTP ${response.status}`);
  }
}

export async function deleteTodo(base, id) {
  const response = await fetch(`${base}/todos`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || `DELETE failed with HTTP ${response.status}`);
  }
}
