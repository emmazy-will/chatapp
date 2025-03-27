import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import AuthPage from "./signup";
import App from "./App"
import './App.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <Router>
    <Routes>
        <Route path="/" element={<AuthPage />}> </Route>
        <Route path="/dashboard" element={<App />}> </Route>
    </Routes>
  </Router>
);
