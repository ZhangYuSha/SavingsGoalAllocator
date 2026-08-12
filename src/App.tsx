import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import HomeScreen from './pages/HomeScreen/HomeScreen'
import DataInput from './pages/DataInput/DataInput'
import Allocation from './pages/Allocation/Allocation'

function App() {

  return (
    <Routes>

      <Route
        path="/"
        element={
          <Navigate
            to="/HomeScreen"
            replace
          />
        }
      />

      <Route
        path="/HomeScreen"
        element={
          <HomeScreen />
        }
      />

      <Route
        path="/DataInput"
        element={
          <DataInput />
        }
      />

      <Route
        path="/allocation"
        element={
          <Allocation />
        }
      />

    </Routes>
  )
}

export default App