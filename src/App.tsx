import { Routes, Route } from 'react-router-dom'
import HomeScreen from "./pages/HomeScreen/HomeScreen.tsx"
import DataInput from "./pages/DataInput/DataInput.tsx"

export default function App(){
    <Routes>
        <Route path="/HomeScreen" element={< HomeScreen />}></Route>
        <Route path="/DataInput" element={< DataInput />}></Route>
    </Routes>
}