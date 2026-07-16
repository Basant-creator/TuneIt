import * as React from 'react';

export function TextLogo() {
  return (
    <div className="logo-container">
      <span className="text-tune">Tune</span>
      
      <div className="badge-it">
        <span>it</span>
      </div>

      <div className="bolt-wrapper">
        <svg className="lightning-bolt" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" stroke="black" strokeWidth="1.5" strokeLinejoin="round"/>
        </svg>
      </div>
    </div>
  );
}
