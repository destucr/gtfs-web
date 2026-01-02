import React from 'react'
import MapComponent from './components/MapComponent'
import './App.css'

const App: React.FC = () => {
  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <MapComponent />
    </div>
  )
}

export default App
