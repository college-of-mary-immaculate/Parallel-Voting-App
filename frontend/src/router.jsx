import { createBrowserRouter, Navigate } from 'react-router-dom';
import { Suspense, lazy } from 'react';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';
import ErrorBoundary from './components/ErrorBoundary';

// Lazy loading components
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Elections = lazy(() => import('./pages/Elections'));
const Vote = lazy(() => import('./pages/Vote'));
const Results = lazy(() => import('./pages/Results'));
const RealTimeDashboard = lazy(() => import('./pages/RealTimeDashboard'));
const Analytics = lazy(() => import('./pages/Analytics'));
const DetailedAnalytics = lazy(() => import('./pages/DetailedAnalytics'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ManageElections = lazy(() => import('./pages/ManageElections'));
const ManageCandidates = lazy(() => import('./pages/ManageCandidates'));
const ManageUsers = lazy(() => import('./pages/ManageUsers'));
const AdminSettings = lazy(() => import('./pages/AdminSettings'));
const VoteConfirmation = lazy(() => import('./pages/VoteConfirmation'));
const UserProfile = lazy(() => import('./pages/UserProfile'));

// Loading fallback component
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="text-center">
      <LoadingSpinner size="lg" message="Loading page..." />
    </div>
  </div>
);

// Wrapper for lazy loaded components with error boundary
const LazyWrapper = ({ children }) => (
  <ErrorBoundary>
    <Suspense fallback={<LoadingFallback />}>
      {children}
    </Suspense>
  </ErrorBoundary>
);

// Preload critical routes after initial load
const preloadRoutes = () => {
  setTimeout(() => {
    // Preload commonly accessed routes
    import('./pages/Elections');
    import('./pages/Vote');
    import('./pages/Results');
    import('./pages/Dashboard');
  }, 2000);
  
  setTimeout(() => {
    // Preload admin routes for admin users
    import('./pages/AdminDashboard');
    import('./pages/Analytics');
  }, 5000);
};

// Initialize preloading
if (typeof window !== 'undefined') {
  preloadRoutes();
}

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: (
      <Layout>
        <LazyWrapper>
          <Login />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/register',
    element: (
      <Layout>
        <LazyWrapper>
          <Register />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <Layout>
        <LazyWrapper>
          <Dashboard />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/elections',
    element: (
      <Layout>
        <LazyWrapper>
          <Elections />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/vote/:id',
    element: (
      <Layout>
        <LazyWrapper>
          <Vote />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/vote-confirmation',
    element: (
      <Layout>
        <LazyWrapper>
          <VoteConfirmation />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/profile',
    element: (
      <Layout>
        <LazyWrapper>
          <UserProfile />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/results',
    element: (
      <Layout>
        <LazyWrapper>
          <Results />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/results/:id',
    element: (
      <Layout>
        <LazyWrapper>
          <Results />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/realtime',
    element: (
      <Layout>
        <LazyWrapper>
          <RealTimeDashboard />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/analytics',
    element: (
      <Layout>
        <LazyWrapper>
          <Analytics />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/detailed-analytics',
    element: (
      <Layout>
        <LazyWrapper>
          <DetailedAnalytics />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/admin',
    element: (
      <Layout>
        <LazyWrapper>
          <AdminDashboard />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/admin/elections',
    element: (
      <Layout>
        <LazyWrapper>
          <ManageElections />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/admin/candidates',
    element: (
      <Layout>
        <LazyWrapper>
          <ManageCandidates />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <Layout>
        <LazyWrapper>
          <ManageUsers />
        </LazyWrapper>
      </Layout>
    ),
  },
  {
    path: '/admin/settings',
    element: (
      <Layout>
        <LazyWrapper>
          <AdminSettings />
        </LazyWrapper>
      </Layout>
    ),
  },
]);

export default router;
