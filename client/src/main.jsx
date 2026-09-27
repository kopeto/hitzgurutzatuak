import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './pages/App';

const stateElement = document.getElementById('app-state');
const state = stateElement ? JSON.parse(stateElement.textContent) : null;

createRoot(document.getElementById('root')).render(<App state={state} />);
