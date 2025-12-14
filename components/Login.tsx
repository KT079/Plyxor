import React, { useState } from 'react';
import { UserProfile } from '../types';
import { MapPin, Navigation } from 'lucide-react';
import { LOCATIONS } from '../data/locations';
import { Logo } from './Logo';

interface LoginProps {
  onLogin: (profile: UserProfile) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');

  const countries = Object.keys(LOCATIONS).sort();
  const states = country ? LOCATIONS[country].sort() : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username && country && state) {
      onLogin({ username, country, state });
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen bg-black text-white p-4 overflow-hidden">
      {/* Blurry Background Logo */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div className="absolute w-[150vh] h-[150vh] opacity-20 blur-[100px] animate-pulse">
            <Logo className="w-full h-full text-blue-600" />
        </div>
      </div>

      <div className="relative w-full max-w-md bg-zinc-900/80 backdrop-blur-xl rounded-xl p-8 border border-zinc-800 shadow-2xl z-10">
        <div className="text-center mb-8">
          <div className="w-24 h-24 mx-auto flex items-center justify-center mb-4 relative group">
             {/* Logo Glow */}
             <div className="absolute inset-0 bg-blue-500/30 rounded-full blur-xl group-hover:bg-blue-500/50 transition-all duration-500"></div>
             <Logo className="w-20 h-20 text-white drop-shadow-[0_0_15px_rgba(59,130,246,0.8)]" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Plyxor</h1>
          <p className="text-zinc-400 mt-2 text-sm">Connect with your world, nation, and neighbors.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all placeholder-zinc-600"
              placeholder="@johndoe"
              required
            />
          </div>

          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                <span className="text-lg">🌍</span> Country
              </label>
              <div className="relative">
                <select
                  value={country}
                  onChange={(e) => {
                    setCountry(e.target.value);
                    setState(''); // Reset state when country changes
                  }}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                  required
                >
                  <option value="" disabled>Select a country</option>
                  {countries.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-zinc-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                </div>
              </div>
            </div>
            
            <div>
              <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">
                <MapPin size={14} /> State/Region
              </label>
              <div className="relative">
                <select
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                  disabled={!country}
                >
                  <option value="" disabled>Select a state</option>
                  {states.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-zinc-500">
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white font-semibold py-3 rounded-lg transition-all shadow-[0_0_20px_rgba(37,99,235,0.3)] hover:shadow-[0_0_25px_rgba(37,99,235,0.5)] flex items-center justify-center gap-2"
          >
            Enter Messenger <Navigation size={18} />
          </button>
        </form>
        
        <p className="mt-6 text-center text-xs text-zinc-600">
          By connecting, you agree to join the global simulation network.
        </p>
      </div>
    </div>
  );
};