import ReactDOM from 'react-dom/client'
import App from './App'
import '@mantine/core/styles.css'
import { MantineProvider, createTheme } from '@mantine/core'
import './index.css'

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: 'Inter, -apple-system, sans-serif',
});

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <MantineProvider theme={theme}>
      <App />
    </MantineProvider>
  )
}
