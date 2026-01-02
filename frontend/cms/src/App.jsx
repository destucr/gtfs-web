import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Agencies from './components/Agencies';
import Stops from './components/Stops';
import RoutesComponent from './components/Routes'; // Renamed to avoid conflict with Routes from react-router-dom
import Trips from './components/Trips';
import Shapes from './components/Shapes';
import 'bootstrap/dist/css/bootstrap.min.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Navigation />
        <Routes>
          <Route path="/" element={
            <div className="container mt-5">
              <h1>Welcome to GTFS CMS</h1>
              <p>Select a category from the navigation menu to manage data.</p>
            </div>
          } />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/stops" element={<Stops />} />
          <Route path="/routes" element={<RoutesComponent />} />
          <Route path="/trips" element={<Trips />} />
          <Route path="/shapes" element={<Shapes />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;