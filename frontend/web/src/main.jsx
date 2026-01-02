import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import '@mantine/core/styles.css'
import { MantineProvider, createTheme } from '@mantine/core'
import './index.css'

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, -apple-system, sans-serif',
});

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  </React.StrictMode>,
)