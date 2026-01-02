import { useState } from 'react'
import './App.css'
import MapComponent from './components/MapComponent'

function App() {
  return (
    <div className="App">
      <header style={{ padding: '20px', backgroundColor: '#333', color: '#fff' }}>
        <h1>GTFS Public Viewer - Purbalingga</h1>
        <p>Real-time transit map visualization</p>
      </header>
      
      <main style={{ padding: '20px' }}>
        <MapComponent />
      </main>
    </div>
  )
}

export default App
