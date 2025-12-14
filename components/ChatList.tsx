import React, { useState, useRef, useEffect } from 'react';
import { RoomType, ChatRoom, UserProfile } from '../types';
import { MoreVertical, BellOff, Volume2, Radio, User, Zap, LogOut } from 'lucide-react';
import { Logo } from './Logo';
import { COUNTRY_CODES } from '../data/locations';

interface OnlineUser {
  username: string;
  country: string;
  state: string;
  timestamp: number;
}

interface ChatListProps {
  rooms: Record<RoomType, ChatRoom>;
  activeRoom: RoomType;
  onSelectRoom: (room: RoomType) => void;
  onToggleMute: (room: RoomType) => void;
  onLogout: () => void;
  currentUser: string;
  onlineUsers: OnlineUser[];
  userCountry: string;
  userState: string;
}

export const ChatList: React.FC<ChatListProps> = ({ rooms, activeRoom, onSelectRoom, onToggleMute, onLogout, currentUser, onlineUsers, userCountry, userState }) => {
  const [menuOpenId, setMenuOpenId] = useState<RoomType | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const handleClickOutside = () => {
        setMenuOpenId(null);
        setProfileMenuOpen(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  const getIcon = (type: RoomType, partner?: UserProfile | null) => {
    switch (type) {
      case RoomType.WORLD: 
        return <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" alt="World" />;
      case RoomType.COUNTRY: 
        return <img src={`https://flagcdn.com/w160/${COUNTRY_CODES[userCountry]?.toLowerCase() || 'us'}.png`} className="w-full h-full object-cover" alt="Country" />;
      case RoomType.STATE: 
        return <img src={`https://picsum.photos/seed/${userState}landmark/200/200`} className="w-full h-full object-cover" alt="State" />;
      case RoomType.ONE_ON_ONE: 
        return (
            <div className="w-full h-full bg-zinc-900 flex items-center justify-center">
                 {partner ? (
                   <img src={`https://picsum.photos/seed/${partner.username}/200/200`} className="w-full h-full object-cover" alt={partner.username} />
                 ) : (
                   <span className="text-2xl font-bold text-pink-500">?</span>
                 )}
            </div>
        );
    }
  };

  const getBorderColor = (type: RoomType) => {
    switch (type) {
      case RoomType.WORLD: return "border-blue-500";
      case RoomType.COUNTRY: return "border-green-500";
      case RoomType.STATE: return "border-orange-500";
      case RoomType.ONE_ON_ONE: return "border-pink-500";
    }
  };

  const handleTouchStart = (roomId: RoomType) => {
    longPressTimer.current = setTimeout(() => {
        setMenuOpenId(roomId);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
  };

  const toggleMute = (e: React.MouseEvent, roomId: RoomType) => {
      e.stopPropagation();
      onToggleMute(roomId);
      setMenuOpenId(null);
  };

  const getFilteredOnlineUsers = (roomId: RoomType) => {
      if (roomId === RoomType.WORLD) return onlineUsers;
      if (roomId === RoomType.COUNTRY) return onlineUsers.filter(u => u.country === userCountry);
      if (roomId === RoomType.STATE) return onlineUsers.filter(u => u.state === userState);
      return onlineUsers; 
  };

  const chatOrder = [RoomType.ONE_ON_ONE, RoomType.WORLD, RoomType.COUNTRY, RoomType.STATE];

  const currentRoomOnlineUsers = getFilteredOnlineUsers(activeRoom);

  return (
    <div className="h-full flex flex-col bg-black border-r border-zinc-800 w-full md:w-80 lg:w-96 flex-shrink-0">
      {/* Header */}
      <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-950 relative z-20">
        <div className="flex items-center gap-3 relative">
            <Logo className="w-8 h-8 text-blue-500 drop-shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
            <button 
                onClick={(e) => { e.stopPropagation(); setProfileMenuOpen(!profileMenuOpen); }}
                className="text-xl font-bold flex items-center gap-2 text-white hover:text-zinc-300 transition-colors focus:outline-none"
            >
            {currentUser} <span className="text-xs font-normal text-zinc-500 mt-1">▼</span>
            </button>

            {profileMenuOpen && (
                <div className="absolute top-full left-0 mt-2 w-48 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in-95 duration-100 origin-top-left z-50">
                    <button 
                        onClick={(e) => { e.stopPropagation(); onLogout(); }}
                        className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-zinc-700 flex items-center gap-2 transition-colors"
                    >
                        <LogOut size={16} /> Log Out
                    </button>
                </div>
            )}
        </div>
        <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center hover:bg-zinc-700 cursor-pointer">
            <span className="text-lg">✍️</span>
        </div>
      </div>

      {/* Room List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        <h3 className="px-6 py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider mt-2">Chats</h3>
        
        {chatOrder.map((roomId) => {
          const room = rooms[roomId];
          const isActive = activeRoom === room.id;
          const lastMsg = room.messages[room.messages.length - 1];
          const time = lastMsg ? new Date(lastMsg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';
          const isUnread = room.unreadCount > 0 && !room.muted;
          const onlineCount = getFilteredOnlineUsers(roomId).length;

          return (
            <div
              key={room.id}
              onClick={() => onSelectRoom(room.id)}
              onTouchStart={() => handleTouchStart(room.id)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchEnd}
              className={`relative flex items-center px-5 py-3 cursor-pointer transition-all duration-200 group
                 ${isActive ? 'bg-zinc-900 border-l-4' : 'hover:bg-zinc-900/50 border-l-4 border-transparent'}
                 ${isActive ? getBorderColor(roomId) : ''}
              `}
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-lg bg-zinc-800 overflow-hidden mr-4 flex-shrink-0 relative group-hover:scale-105 transition-transform border border-zinc-700`}>
                {getIcon(room.id, room.connectedPartner)}
                {room.muted && (
                   <div className="absolute -bottom-1 -right-1 bg-zinc-800 rounded-full p-0.5 border border-black z-10">
                      <BellOff size={12} className="text-zinc-400" />
                   </div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                  <h4 className={`text-sm font-semibold truncate flex items-center gap-2 ${isActive || isUnread ? 'text-white' : 'text-zinc-200'}`}>
                    {room.name}
                    {isUnread && (
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-full animate-pulse"></span>
                    )}
                  </h4>
                  {time && <span className={`text-xs flex-shrink-0 ml-2 ${isUnread ? 'text-white font-medium' : 'text-zinc-500'}`}>{time}</span>}
                </div>
                <div className="flex justify-between items-center">
                  <p className={`text-sm truncate flex items-center gap-1 ${isActive ? 'text-zinc-300' : isUnread ? 'text-white font-medium' : 'text-zinc-500'}`}>
                     {roomId === RoomType.ONE_ON_ONE && room.isSearching ? (
                        <span className="text-pink-400 italic">Searching for partner...</span>
                     ) : roomId === RoomType.ONE_ON_ONE && !room.connectedPartner ? (
                        <span className="text-pink-400 italic">Tap to start chat</span>
                     ) : lastMsg ? (
                        `${lastMsg.sender}: ${lastMsg.text}`
                     ) : (
                        <span className="text-zinc-500 italic">{onlineCount} online</span>
                     )}
                  </p>
                </div>
              </div>

              {/* Desktop Menu Button */}
              <button 
                onClick={(e) => { e.stopPropagation(); setMenuOpenId(room.id); }}
                className="ml-2 p-1 text-zinc-500 hover:text-white rounded-full hover:bg-zinc-800 hidden md:block opacity-0 group-hover:opacity-100 transition-opacity"
              >
                 <MoreVertical size={16} />
              </button>

              {/* Context Menu (Desktop & Mobile) */}
              {menuOpenId === room.id && (
                  <div className="absolute right-4 top-10 z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl py-1 min-w-[140px] animate-in fade-in zoom-in duration-200">
                      <button 
                        onClick={(e) => toggleMute(e, room.id)}
                        className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 flex items-center gap-2"
                      >
                         {room.muted ? <Volume2 size={16} /> : <BellOff size={16} />}
                         {room.muted ? 'Unmute' : 'Mute'} Chat
                      </button>
                  </div>
              )}
            </div>
          );
        })}

        {/* Dynamic Bottom Section */}
        <div className="mt-6 border-t border-zinc-900 pt-4">
            {activeRoom === RoomType.ONE_ON_ONE ? (
                // One-on-One: Show Partner Info
                <div className="px-6">
                    <h3 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Zap size={12} className="text-pink-500" /> Current Connection
                    </h3>
                    {/* Fix: Access rooms[activeRoom] explicitly */}
                    {rooms[activeRoom].connectedPartner ? (
                         <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900/50 rounded-xl border border-zinc-800">
                             <div className="relative">
                                {/* Fix: Access rooms[activeRoom].connectedPartner explicitly */}
                                <img src={`https://picsum.photos/seed/${rooms[activeRoom].connectedPartner?.username}/100/100`} alt="Partner" className="w-10 h-10 rounded-full bg-zinc-800 object-cover" />
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-zinc-900 rounded-full"></div>
                             </div>
                             <div className="flex flex-col">
                                 {/* Fix: Access rooms[activeRoom].connectedPartner explicitly */}
                                 <span className="text-sm font-bold text-white">{rooms[activeRoom].connectedPartner?.username}</span>
                                 {/* Fix: Access rooms[activeRoom].connectedPartner explicitly */}
                                 <span className="text-xs text-green-400">Connected ({rooms[activeRoom].connectedPartner?.country})</span>
                             </div>
                        </div>
                    ) : (
                        <div className="px-4 py-3 text-zinc-600 text-sm italic text-center border border-zinc-900 rounded-xl border-dashed">
                             No active connection.
                        </div>
                    )}
                </div>
            ) : (
                // Group Chats: Show Online Users List
                <div className="px-0">
                    <h3 className="px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <Radio size={12} className="text-green-500 animate-pulse" /> Online in {rooms[activeRoom].name} ({currentRoomOnlineUsers.length})
                    </h3>
                    <div className="px-2">
                        {currentRoomOnlineUsers.length === 0 ? (
                            <div className="px-4 py-3 text-zinc-600 text-sm italic text-center">
                                No one else is here...
                            </div>
                        ) : (
                            currentRoomOnlineUsers.map(user => (
                                <div key={user.username} className="flex items-center gap-3 px-4 py-2 hover:bg-zinc-900 rounded-lg transition-colors cursor-default group">
                                    <div className="relative">
                                        <img src={`https://picsum.photos/seed/${user.username}/100/100`} alt={user.username} className="w-8 h-8 rounded-full bg-zinc-800 object-cover" />
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-black rounded-full"></div>
                                    </div>
                                    <div className="flex flex-col">
                                        <span className="text-sm text-zinc-300 group-hover:text-white transition-colors">{user.username}</span>
                                        {activeRoom === RoomType.WORLD && (
                                            <span className="text-[10px] text-zinc-500">{user.country}</span>
                                        )}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};