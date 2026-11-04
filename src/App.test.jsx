
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App.jsx';

const STORAGE_KEY = 'taskflow-api-base-v1';

function jsonResponse(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => JSON.stringify(data),
  };
}

function emptyResponse(status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => '',
  };
}

function stubMethodAwareFetch(getData, handlers = {}) {
  const fetchMock = vi.fn((url, init = {}) => {
    const method = init.method || 'GET';
    if (handlers[method]) return Promise.resolve(handlers[method](url, init));
    return Promise.resolve(jsonResponse(typeof getData === 'function' ? getData() : getData));
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

describe('TaskFlow Application', () => {
  beforeEach(() => {
    localStorage.clear();

    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        text: async () => '[]'
      })
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('renders the TaskFlow homepage', () => {
    render(<App />);

    expect(
      screen.getByRole('heading', {
        name: /make room for/i
      })
    ).toBeInTheDocument();
  });

  it('displays AWS connection settings', () => {
    render(<App />);

    expect(
      screen.getByText(/connect your aws api/i)
    ).toBeInTheDocument();
  });

  it('loads tasks from a saved API URL on startup', async () => {
    localStorage.setItem(STORAGE_KEY, 'https://api.example.com');
    stubMethodAwareFetch([{ id: 'abc12345', task: 'Loaded task' }]);

    render(<App />);

    expect(await screen.findByText('Loaded task')).toBeInTheDocument();
    expect(await screen.findByText(/Connected to AWS/i)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('https://api.example.com');
  });

  it('normalizes a saved URL that ends in /todos', async () => {
    localStorage.setItem(STORAGE_KEY, 'https://api.example.com/todos/');
    const fetchMock = stubMethodAwareFetch([]);

    render(<App />);

    expect(await screen.findByText(/Connected to AWS/i)).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/todos', expect.anything());
    expect(localStorage.getItem(STORAGE_KEY)).toBe('https://api.example.com');
  });

  it('connects via the settings panel', async () => {
    stubMethodAwareFetch([{ id: 'abc12345', task: 'First task' }]);

    render(<App />);

    const input = screen.getByLabelText('API Gateway Invoke URL');
    fireEvent.change(input, { target: { value: 'https://api.example.com/' } });
    fireEvent.click(screen.getByRole('button', { name: /connect and test/i }));

    expect(await screen.findByText('First task')).toBeInTheDocument();
    expect(await screen.findByText(/Connected to AWS/i)).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBe('https://api.example.com');
  });

  it('rejects a non-https API URL', async () => {
    render(<App />);

    const input = screen.getByLabelText('API Gateway Invoke URL');
    fireEvent.change(input, { target: { value: 'http://api.example.com' } });
    fireEvent.click(screen.getByRole('button', { name: /connect and test/i }));

    expect(
      await screen.findByText(/must start with https:\/\//i)
    ).toBeInTheDocument();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('adds a task through POST /todos', async () => {
    localStorage.setItem(STORAGE_KEY, 'https://api.example.com');
    let list = [];
    const fetchMock = stubMethodAwareFetch(() => list, {
      POST: () => {
        list = [{ id: 'abc12345', task: 'Buy milk' }];
        return emptyResponse();
      },
    });

    render(<App />);
    await screen.findByText(/Connected to AWS/i);

    fireEvent.change(screen.getByLabelText('Task description'), { target: { value: 'Buy milk' } });
    fireEvent.click(screen.getByRole('button', { name: /add task/i }));

    expect(await screen.findByText('Buy milk')).toBeInTheDocument();
    expect(await screen.findByText(/Task added and saved to DynamoDB/i)).toBeInTheDocument();
    const postCall = fetchMock.mock.calls.find(([, init]) => init.method === 'POST');
    expect(postCall[0]).toBe('https://api.example.com/todos');
    expect(JSON.parse(postCall[1].body)).toEqual({ task: 'Buy milk' });
    expect(postCall[1].headers).toEqual({ 'Content-Type': 'application/json' });
  });

  it('shows an error notice when the backend rejects a new task', async () => {
    localStorage.setItem(STORAGE_KEY, 'https://api.example.com');
    stubMethodAwareFetch([], {
      POST: () => jsonResponse({ message: 'Task required' }, 400),
    });

    render(<App />);
    await screen.findByText(/Connected to AWS/i);

    fireEvent.change(screen.getByLabelText('Task description'), { target: { value: 'Something' } });
    fireEvent.click(screen.getByRole('button', { name: /add task/i }));

    expect(await screen.findByText('Task required')).toBeInTheDocument();
    expect(screen.queryByText(/Task added and saved to DynamoDB/i)).not.toBeInTheDocument();
  });

  it('deletes a task through DELETE /todos', async () => {
    localStorage.setItem(STORAGE_KEY, 'https://api.example.com');
    let list = [{ id: 'abc12345', task: 'Old task' }];
    const fetchMock = stubMethodAwareFetch(() => list, {
      DELETE: () => {
        list = [];
        return emptyResponse();
      },
    });

    render(<App />);
    await screen.findByText('Old task');

    fireEvent.click(screen.getByRole('button', { name: /delete old task/i }));

    expect(await screen.findByText(/Task deleted from DynamoDB/i)).toBeInTheDocument();
    expect(screen.queryByText('Old task')).not.toBeInTheDocument();
    const deleteCall = fetchMock.mock.calls.find(([, init]) => init.method === 'DELETE');
    expect(deleteCall[0]).toBe('https://api.example.com/todos');
    expect(JSON.parse(deleteCall[1].body)).toEqual({ id: 'abc12345' });
  });

  it('shows an error notice when loading fails', async () => {
    localStorage.setItem(STORAGE_KEY, 'https://api.example.com');
    stubMethodAwareFetch([], {
      GET: () => jsonResponse({ message: 'Backend down' }, 500),
    });

    render(<App />);

    expect(await screen.findByText('Backend down')).toBeInTheDocument();
  });
});
