import { Navigate, Route, Routes } from 'react-router-dom'
import AppShell from './AppShell'
import Capture from './Capture'
import Export from './Export'
import ItemDetail from './ItemDetail'
import Landing from './Landing'
import Testimony from './Testimony'
import VaultList from './VaultList'
import VaultNew from './VaultNew'
import VaultUnlock from './VaultUnlock'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Landing />} />
        <Route path="vault/new" element={<VaultNew />} />
        <Route path="vault/unlock" element={<VaultUnlock />} />
        <Route path="vault" element={<VaultList />} />
        <Route path="capture" element={<Capture />} />
        <Route path="testimony" element={<Testimony />} />
        <Route path="item/:id" element={<ItemDetail />} />
        <Route path="export" element={<Export />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
