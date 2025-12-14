import React from 'react';
import { RoomType } from '../types';
import { COUNTRY_CODES } from '../data/locations';

interface ThemeBackgroundProps {
  type: RoomType;
  userCountry?: string;
  userState?: string;
}

export const ThemeBackground: React.FC<ThemeBackgroundProps> = ({ type, userCountry, userState }) => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 bg-black">
      {/* World Chat - Blurry Globe */}
      {type === RoomType.WORLD && (
        <div className="absolute inset-0">
          <img 
            src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=2072&auto=format&fit=crop" 
            className="w-full h-full object-cover blur-md opacity-40 scale-110" 
            alt="World Background"
          />
          <div className="absolute inset-0 bg-blue-900/30 mix-blend-overlay"></div>
        </div>
      )}

      {/* Country Chat - Blurry Flag */}
      {type === RoomType.COUNTRY && userCountry && (
        <div className="absolute inset-0">
          <img 
            src={`https://flagcdn.com/w1600/${COUNTRY_CODES[userCountry]?.toLowerCase() || 'us'}.png`}
            className="w-full h-full object-cover blur-2xl opacity-30 scale-125"
            alt={`${userCountry} Flag Background`}
          />
          <div className="absolute inset-0 bg-black/40"></div>
        </div>
      )}

      {/* State Chat - Blurry Landmark (Simulated via Seeded Image) */}
      {type === RoomType.STATE && userState && (
        <div className="absolute inset-0">
          <img 
            src={`https://picsum.photos/seed/${userState}landmark/1080/1920?blur=8`}
            className="w-full h-full object-cover blur-xl opacity-40 scale-110"
            alt={`${userState} Background`}
          />
           <div className="absolute inset-0 bg-orange-900/20 mix-blend-overlay"></div>
        </div>
      )}

      {/* One on One - Blurry Question Mark */}
      {type === RoomType.ONE_ON_ONE && (
         <div className="absolute inset-0 flex items-center justify-center">
             <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 to-black"></div>
             <img 
                src="https://upload.wikimedia.org/wikipedia/commons/4/46/Question_mark_%28black%29.svg"
                className="w-[120%] h-[120%] object-cover blur-3xl opacity-10 invert"
                alt="Question Mark Background"
             />
         </div>
      )}
      
      {/* Vignette Overlay for all */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80"></div>
    </div>
  );
};