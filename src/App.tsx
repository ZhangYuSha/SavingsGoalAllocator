import {
  Routes,
  Route,
  Navigate,
} from 'react-router-dom'

import HomeScreen from './pages/HomeScreen/HomeScreen'
import DataInput from './pages/DataInput/DataInput'
import Allocation from './pages/Allocation/Allocation'

/**
 * Defines the application's routes and
 * determines which page is displayed for each URL.
 *
 * @returns The application's route configuration.
 */
function App() {

  return (
    <Routes>

      {/* Redirect the root URL to the home screen. */}
      <Route
        path="/"
        element={
          <Navigate
            to="/HomeScreen"
            replace
          />
        }
      />

      {/* Displays the application's home screen. */}
      <Route
        path="/HomeScreen"
        element={
          <HomeScreen />
        }
      />

      {/* Displays the page for entering
          monthly budgets and savings goals. */}
      <Route
        path="/DataInput"
        element={
          <DataInput />
        }
      />

      {/* Displays the generated savings allocation. */}
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