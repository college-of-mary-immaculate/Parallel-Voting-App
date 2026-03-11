import { createBrowserRouter, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Elections from './pages/Elections';
import Vote from './pages/Vote';
import Results from './pages/Results';
import RealTimeDashboard from './pages/RealTimeDashboard';
import Analytics from './pages/Analytics';
import DetailedAnalytics from './pages/DetailedAnalytics';
import AdminDashboard from './pages/AdminDashboard';
import ManageElections from './pages/ManageElections';
import ManageCandidates from './pages/ManageCandidates';
import ManageUsers from './pages/ManageUsers';
import AdminSettings from './pages/AdminSettings';

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  {
    path: '/login',
    element: (
      <Layout>
        <Login />
      </Layout>
    ),
  },
  {
    path: '/register',
    element: (
      <Layout>
        <Register />
      </Layout>
    ),
  },
  {
    path: '/dashboard',
    element: (
      <Layout>
        <Dashboard />
      </Layout>
    ),
  },
  {
    path: '/elections',
    element: (
      <Layout>
        <Elections />
      </Layout>
    ),
  },
  {
    path: '/vote/:id',
    element: (
      <Layout>
        <Vote />
      </Layout>
    ),
  },
  {
    path: '/results',
    element: (
      <Layout>
        <Results />
      </Layout>
    ),
  },
  {
    path: '/results/:id',
    element: (
      <Layout>
        <Results />
      </Layout>
    ),
  },
  {
    path: '/realtime',
    element: (
      <Layout>
        <RealTimeDashboard />
      </Layout>
    ),
  },
  {
    path: '/analytics',
    element: (
      <Layout>
        <Analytics />
      </Layout>
    ),
  },
  {
    path: '/detailed-analytics',
    element: (
      <Layout>
        <DetailedAnalytics />
      </Layout>
    ),
  },
  {
    path: '/admin',
    element: (
      <Layout>
        <AdminDashboard />
      </Layout>
    ),
  },
  {
    path: '/admin/elections',
    element: (
      <Layout>
        <ManageElections />
      </Layout>
    ),
  },
  {
    path: '/admin/candidates',
    element: (
      <Layout>
        <ManageCandidates />
      </Layout>
    ),
  },
  {
    path: '/admin/users',
    element: (
      <Layout>
        <ManageUsers />
      </Layout>
    ),
  },
  {
    path: '/admin/settings',
    element: (
      <Layout>
        <AdminSettings />
      </Layout>
    ),
  },
]);

export default router;
