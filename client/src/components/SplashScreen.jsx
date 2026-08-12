import React, { useState, useEffect, useRef } from 'react';
import './SplashScreen.css';
import logo from '../assets/uc-central-logo.svg';

/**
 * Realistic Typewriter Hook
 * Simulates human typing cadence with variable keystroke delays, natural pauses, and backspacing.
 */
const SplashScreen = ({ onComplete }) => {
    const [mainText, setMainText] = useState('');
    const [subText, setSubText] = useState('');
    const [statusText, setStatusText] = useState('Initializing system...');
    const [isTypingActive, setIsTypingActive] = useState(true);
    const [isFadingOut, setIsFadingOut] = useState(false);
    const [progress, setProgress] = useState(0);

    const isCancelledRef = useRef(false);

    useEffect(() => {
        isCancelledRef.current = false;

        // Progress bar smooth advance
        const progressInterval = setInterval(() => {
            setProgress((prev) => {
                if (prev >= 100) {
                    clearInterval(progressInterval);
                    return 100;
                }
                return prev + Math.random() * 8 + 3;
            });
        }, 120);

        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

        // Get random human keystroke latency
        const getKeystrokeDelay = (char) => {
            if (char === ' ' || char === '•' || char === '-') return 140 + Math.random() * 80;
            return 45 + Math.random() * 65; // ~45ms - 110ms human variance
        };

        const typeString = async (target, setText, speedFactor = 1) => {
            for (let i = 0; i <= target.length; i++) {
                if (isCancelledRef.current) return;
                setText(target.slice(0, i));
                const char = target[i - 1] || '';
                const delay = getKeystrokeDelay(char) * speedFactor;
                await sleep(delay);
            }
        };

        const backspaceString = async (current, count, setText, speed = 35) => {
            for (let i = 0; i < count; i++) {
                if (isCancelledRef.current) return;
                current = current.slice(0, -1);
                setText(current);
                await sleep(speed + Math.random() * 20);
            }
        };

        const runAnimationSequence = async () => {
            await sleep(400); // Initial entrance pause
            if (isCancelledRef.current) return;

            // Step 1: Type initial phrase
            setStatusText('Connecting to UC Network...');
            setIsTypingActive(true);
            await typeString('University of Cebu', setMainText);
            setIsTypingActive(false);

            await sleep(550); // Pause for comprehension
            if (isCancelledRef.current) return;

            // Step 2: Realistic backspacing
            setIsTypingActive(true);
            await backspaceString('University of Cebu', 18, setMainText);

            // Step 3: Type the final branded title
            setStatusText('Loading Centralized Core Services...');
            await typeString('UC CENTRALIZED', setMainText);
            setIsTypingActive(false);

            await sleep(250);
            if (isCancelledRef.current) return;

            // Step 4: Subtitle typewriter
            setIsTypingActive(true);
            await typeString('Campus Portal • Web Services • Intelligence', setSubText, 0.7);
            setIsTypingActive(false);

            setStatusText('Ready. Entering workspace...');
            setProgress(100);

            await sleep(650);
            if (isCancelledRef.current) return;

            // Step 5: Fade out
            setIsFadingOut(true);
            await sleep(450);
            if (onComplete && !isCancelledRef.current) {
                onComplete();
            }
        };

        runAnimationSequence();

        return () => {
            isCancelledRef.current = true;
            clearInterval(progressInterval);
        };
    }, [onComplete]);

    const handleSkip = () => {
        setIsFadingOut(true);
        setTimeout(() => {
            if (onComplete) onComplete();
        }, 300);
    };

    return (
        <div className={`splash-overlay ${isFadingOut ? 'splash-fade-out' : ''}`} onClick={handleSkip}>
            {/* Ambient Background Aura */}
            <div className="splash-ambient-glow"></div>
            <div className="splash-ambient-glow-secondary"></div>

            <div className="splash-content-container">
                {/* Custom UC Crest Logo */}
                <div className="splash-logo-wrapper">
                    <div className="splash-logo-halo"></div>
                    <img src={logo} alt="University of Cebu Central Logo" className="splash-logo-img" />
                </div>

                {/* Main Typing Title */}
                <div className="splash-title-box">
                    <h1 className="splash-main-title">
                        {mainText}
                        <span className={`splash-cursor ${!isTypingActive ? 'splash-cursor-blink' : ''}`}>|</span>
                    </h1>
                </div>

                {/* Subtitle Typing */}
                <div className="splash-subtitle-box">
                    <p className="splash-subtitle-text">
                        {subText}
                        {subText.length > 0 && subText.length < 42 && (
                            <span className="splash-sub-cursor">▍</span>
                        )}
                    </p>
                </div>

                {/* Progress & Live Status Pill */}
                <div className="splash-status-wrapper">
                    <div className="splash-progress-track">
                        <div
                            className="splash-progress-bar"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                        ></div>
                    </div>

                    <div className="splash-status-pill">
                        <span className="splash-status-dot"></span>
                        <span className="splash-status-label">{statusText}</span>
                    </div>
                </div>

                <div className="splash-footer-hint">
                    <span>Click anywhere to enter</span>
                </div>
            </div>
        </div>
    );
};

export default SplashScreen;
