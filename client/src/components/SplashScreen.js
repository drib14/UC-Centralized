import React from 'react';
import './SplashScreen.css';
import logo from '../assets/uc-central-logo.png';

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <img src={logo} alt="UC Central Logo" className="splash-logo" />
      <div className="splash-text">
        <svg className="trace-svg" viewBox="0 0 500 80">
          <text x="50%" y="50%" dy=".35em" textAnchor="middle">
            Centralized
          </text>
        </svg>
      </div>
    </div>
  );
};

export default SplashScreen;
