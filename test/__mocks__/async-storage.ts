const storage: Record<string, string> = {};

export default {
  setItem: jest.fn((k, v) => { storage[k] = v; return Promise.resolve(); }),
  getItem: jest.fn((k) => Promise.resolve(storage[k] || null)),
  removeItem: jest.fn((k) => { delete storage[k]; return Promise.resolve(); }),
};
