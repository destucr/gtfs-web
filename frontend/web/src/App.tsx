import React from 'react'
import MapComponent from './components/MapComponent'
import { SettingsProvider } from './hooks/useSettings'
import './App.css'

const App: React.FC = () => {
  return (
    <SettingsProvider>
      <MapComponent />
    </SettingsProvider>
  )
}

export default App