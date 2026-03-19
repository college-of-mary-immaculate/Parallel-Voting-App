import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.localStorage = localStorageMock

// Mock sessionStorage
const sessionStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
global.sessionStorage = sessionStorageMock

// Mock navigator
Object.defineProperty(window, 'navigator', {
  value: {
    ...window.navigator,
    serviceWorker: {
      register: vi.fn(() => Promise.resolve()),
      ready: Promise.resolve({
        addEventListener: vi.fn(),
        showNotification: vi.fn(),
      }),
    },
    storage: {
      estimate: vi.fn(() => Promise.resolve({
        quota: 1000000000,
        usage: 100000,
      })),
    },
    connection: {
      effectiveType: '4g',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
  },
  writable: true,
})

// Mock window.matchMedia for dark mode
const mockMatchMedia = vi.fn().mockImplementation(query => ({
  matches: false,
  media: query,
  onchange: null,
  addListener: vi.fn(),
  removeListener: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
  dispatchEvent: vi.fn(),
}))

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: mockMatchMedia,
})

// Mock CSS variables
const mockComputedStyle = vi.fn().mockImplementation(() => ({
  getPropertyValue: vi.fn(() => '#000000'),
  setProperty: vi.fn(),
}))

Object.defineProperty(window, 'getComputedStyle', {
  writable: true,
  value: mockComputedStyle,
})

// Mock scrollTo
window.scrollTo = vi.fn()

// Mock location
Object.defineProperty(window, 'location', {
  value: {
    ...window.location,
    reload: vi.fn(),
  },
  writable: true,
})

// Mock console methods for cleaner test output
global.console = {
  ...console,
  warn: vi.fn(),
  error: vi.fn(),
}

// Fix React DOM issue by mocking createElement
const originalCreateElement = document.createElement
document.createElement = vi.fn((tagName, options) => {
  const element = originalCreateElement.call(document, tagName, options)
  
  // Mock specific element behaviors
  if (tagName === 'button') {
    element.type = 'button'
  }
  
  return element
})

// Setup cleanup
afterEach(() => {
  vi.clearAllMocks()
  localStorageMock.getItem.mockClear()
  localStorageMock.setItem.mockClear()
  localStorageMock.removeItem.mockClear()
  localStorageMock.clear.mockClear()
  sessionStorageMock.getItem.mockClear()
  sessionStorageMock.setItem.mockClear()
  sessionStorageMock.removeItem.mockClear()
  sessionStorageMock.clear.mockClear()
})
