import React, { useEffect } from 'react';
import { Activity } from 'lucide-react';
import './SplashScreen.css';

export default function SplashScreen({ onFinish }) {
  useEffect(() => {
    // 1000ms for logo wipe + 800ms for text fade + 1000ms pause = 2800ms total
    const timer = setTimeout(() => {
      onFinish();
    }, 2800);
    
    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="splash-container">
      <div className="splash-content">
        
        <div className="splash-logo-container">
          <div className="splash-logo-wipe">
            <div className="splash-logo-inner">
              {/* Using Lucide React Activity icon which resembles a heartbeat/pulse */}
              <Activity size={90} color="#FF3355" strokeWidth={2.5} />
            </div>
          </div>
        </div>

        <div className="splash-text">LifeLink</div>

      </div>
    </div>
  );
}
