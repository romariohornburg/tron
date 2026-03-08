import { Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { OrganizationProvider } from './contexts/OrganizationContext'
import { ProtectedRoute, Layout } from './shared/components'
import SetupGuard from './components/SetupGuard'
import Home from './pages/home'
import Login from './pages/Login'
import LoginCallback from './pages/LoginCallback'
import Setup from './pages/setup/Setup'
import Clusters from './pages/clusters/Clusters'
import Environments from './pages/environments/Environments'
import Applications from './pages/applications/Applications'
import CreateApplication from './pages/applications/CreateApplication'
import CreateInstance from './pages/applications/CreateInstance'
import InstanceDetail from './pages/applications/InstanceDetail'
import InstanceEvents from './pages/applications/InstanceEvents'
import WebappDetail from './pages/applications/WebappDetail'
import WorkerDetail from './pages/applications/WorkerDetail'
import CronDetail from './pages/applications/CronDetail'
import Templates from './pages/templates/Templates'
import Profile from './pages/Profile'
import Users from './pages/users/Users'
import IdentityProviders from './pages/identity-providers/IdentityProviders'
import Tokens from './pages/tokens/Tokens'
import Organizations from './pages/organizations/Organizations'
import OrganizationDetail from './pages/organizations/OrganizationDetail'
import Groups from './pages/groups/Groups'
import GroupDetail from './pages/groups/GroupDetail'

function App() {
  return (
    <AuthProvider>
      <OrganizationProvider>
        <Routes>
        <Route path="/setup" element={<Setup />} />
        <Route path="/login" element={<SetupGuard><Login /></SetupGuard>} />
        <Route path="/login/callback" element={<SetupGuard><LoginCallback /></SetupGuard>} />
        <Route path="/" element={<SetupGuard><Layout /></SetupGuard>}>
          <Route index element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="clusters" element={<ProtectedRoute><Clusters /></ProtectedRoute>} />
          <Route path="environments" element={<ProtectedRoute><Environments /></ProtectedRoute>} />
          <Route path="applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />
          <Route path="applications/new" element={<ProtectedRoute><CreateApplication /></ProtectedRoute>} />
          <Route path="applications/:uuid/instances/new" element={<ProtectedRoute><CreateInstance /></ProtectedRoute>} />
          <Route path="applications/:uuid/instances/:instanceUuid/components" element={<ProtectedRoute><InstanceDetail /></ProtectedRoute>} />
          <Route path="applications/:uuid/instances/:instanceUuid/events" element={<ProtectedRoute><InstanceEvents /></ProtectedRoute>} />
          <Route path="applications/:uuid/instances/:instanceUuid/components/:componentUuid" element={<ProtectedRoute><WebappDetail /></ProtectedRoute>} />
          <Route path="applications/:uuid/instances/:instanceUuid/components/:componentUuid/pods" element={<ProtectedRoute><WorkerDetail /></ProtectedRoute>} />
          <Route path="applications/:uuid/instances/:instanceUuid/components/:componentUuid/executions" element={<ProtectedRoute><CronDetail /></ProtectedRoute>} />
          <Route path="templates" element={<ProtectedRoute><Templates /></ProtectedRoute>} />
          <Route path="organizations" element={<ProtectedRoute><Organizations /></ProtectedRoute>} />
          <Route path="organizations/:uuid" element={<ProtectedRoute><OrganizationDetail /></ProtectedRoute>} />
          <Route path="groups" element={<ProtectedRoute><Groups /></ProtectedRoute>} />
          <Route path="groups/:uuid" element={<ProtectedRoute><GroupDetail /></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
          <Route path="identity-providers" element={<ProtectedRoute><IdentityProviders /></ProtectedRoute>} />
          <Route path="tokens" element={<ProtectedRoute><Tokens /></ProtectedRoute>} />
          <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        </Route>
      </Routes>
      </OrganizationProvider>
    </AuthProvider>
  )
}

export default App

