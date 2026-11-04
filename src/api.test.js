import { describe, it, expect, beforeEach, vi } from 'vitest';
import { normalizeApiBase, listTodos, createTodo, deleteTodo } from './api.js';

describe('normalizeApiBase', () => {
  it('trims whitespace and trailing slashes', () => {
    expect(normalizeApiBase('  https://api.example.com/  ')).toBe('https://api.example.com');
  });

  it('strips a /todos suffix', () => {
    expect(normalizeApiBase('https://api.example.com/todos')).toBe('https://api.example.com');
  });

  it('strips a /todos suffix with trailing slash', () => {
    expect(normalizeApiBase('https://api.example.com/todos/')).toBe('https://api.example.com');
  });

  it('keeps the bare base URL unchanged', () => {
    expect(normalizeApiBase('https://api.example.com')).toBe('https://api.example.com');
  });
});

describe('listTodos', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('performs GET {base}/todos and returns the parsed array', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '[{"id":"1","task":"Hello"}]',
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await listTodos('https://api.example.com');

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/todos', { method: 'GET' });
    expect(result).toEqual([{ id: '1', task: 'Hello' }]);
  });

  it('passes the abort signal through to fetch when provided', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '[]',
    });
    vi.stubGlobal('fetch', fetchMock);
    const controller = new AbortController();

    await listTodos('https://api.example.com', { signal: controller.signal });

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/todos', {
      method: 'GET',
      signal: controller.signal,
    });
  });

  it('throws the backend message for a failed response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => JSON.stringify({ message: 'Table error' }),
    }));

    await expect(listTodos('https://api.example.com')).rejects.toThrow('Table error');
  });

  it('throws a generic message for a failed response without a message body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: async () => '',
    }));

    await expect(listTodos('https://api.example.com')).rejects.toThrow('GET failed with HTTP 404');
  });

  it('throws when the response is not valid JSON', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '<html>not json</html>',
    }));

    await expect(listTodos('https://api.example.com')).rejects.toThrow('non-JSON content (HTTP 200)');
  });

  it('throws when the response JSON is not an array', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ id: '1', task: 'Hello' }),
    }));

    await expect(listTodos('https://api.example.com')).rejects.toThrow('Expected a JSON array from GET /todos');
  });
});

describe('createTodo', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('performs POST {base}/todos with a JSON body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    await createTodo('https://api.example.com', 'Buy milk');

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task: 'Buy milk' }),
    });
  });

  it('throws the backend message for a failed response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => JSON.stringify({ message: 'Task required' }),
    }));

    await expect(createTodo('https://api.example.com', '')).rejects.toThrow('Task required');
  });

  it('throws a generic message for a failed response without a message body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '',
    }));

    await expect(createTodo('https://api.example.com', 'x')).rejects.toThrow('POST failed with HTTP 500');
  });
});

describe('deleteTodo', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('performs DELETE {base}/todos with an id body', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => '',
    });
    vi.stubGlobal('fetch', fetchMock);

    await deleteTodo('https://api.example.com', 'abc-123');

    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/todos', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: 'abc-123' }),
    });
  });

  it('throws a generic message for a failed response without a message body', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: async () => '',
    }));

    await expect(deleteTodo('https://api.example.com', 'abc-123')).rejects.toThrow('DELETE failed with HTTP 500');
  });
});
