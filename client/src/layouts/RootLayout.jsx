import React from 'react';
import { Outlet } from 'react-router-dom';
import Navbar from '../components/layout/Navbar.jsx';

export function RootLayout() {
  return (
    <div className="app">
      <Navbar />
      <main className="app__main">
        <Outlet />
      </main>
    </div>
  );
}
