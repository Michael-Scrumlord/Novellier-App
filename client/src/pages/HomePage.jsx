import React from 'react';
import HomePageView from '../components/home/HomePage.jsx';
import { useAuthContext } from '../contexts/AuthContext.jsx';

export function HomePage() {
    const { token } = useAuthContext();

    return (
        <div id="home">
        <HomePageView
        />
        </div>
    );
}
