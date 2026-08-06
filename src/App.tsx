import { Routes, Route, Navigate } from 'react-router-dom'
import HomeScreen from './pages/HomeScreen/HomeScreen'
import DataInput from './pages/DataInput/DataInput'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/HomeScreen" />} />
      <Route path="/HomeScreen" element={<HomeScreen />} />
      <Route path="/DataInput" element={<DataInput />} />
    </Routes>
  )
}