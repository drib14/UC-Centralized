import React from 'react';
import './SplashScreen.css';
import logo from '../../assets/uc-central-logo.png';

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <img src={logo} alt="UC Central Logo" className="splash-logo" />
      <div className="splash-text">
        <span className="trace-text">Centralized</span>
      </div>
    </div>
  );
};

export default SplashScreen;
