import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Message, ChatRoom, RoomType, UserProfile } from '../types';
import { Image, Heart, Mic, Play, Pause, X, Send, Trash2, Reply, Ban, Copy, Languages, CheckCheck, User as UserIcon, Eye, Search, SkipForward, Loader2 } from 'lucide-react';
import { ThemeBackground } from './ThemeBackground';
import { COUNTRY_CODES } from '../data/locations';

interface ChatWindowProps {
  room: ChatRoom;
  onSendMessage: (text: string, replyTo?: Message['replyTo']) => void; // Simplified for text-only
  onDeleteMessage: (messageId: string) => void;
  onDeleteForYou: (messageId: string) => void;
  onBlockUser: (username: string) => void;
  onTranslate: (messageId: string, text: string) => void;
  onSkip: () => void;
  blockedUsers: string[];
  onBack: () => void;
  currentUser: string;
  userCountry: string;
  userState: string;
  isWsConnected: boolean; // Indicates if WebSocket is active
}

interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  message: Message | null;
}

export const ChatWindow: React.FC<ChatWindowProps> = ({ 
  room, 
  onSendMessage, 
  onDeleteMessage, 
  onDeleteForYou, 
  onBlockUser,
  onTranslate,
  onSkip,
  blockedUsers,
  onBack, 
  currentUser,
  userCountry,
  userState,
  isWsConnected
}) => {
  const [inputText, setInputText] = useState('');
  // Removed isRecording, mediaRecorder states
  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0, message: null });
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [showReadInfo, setShowReadInfo] = useState<Message | null>(null); // Still supported for BroadcastChannel rooms
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Determine if input should be disabled
  const isInputDisabled = !isWsConnected || (room.id === RoomType.ONE_ON_ONE && !room.connectedPartner);

  // Reset search when room changes
  useEffect(() => {
    setIsSearchOpen(false);
    setSearchQuery('');
  }, [room.id]);

  // Filter messages based on blocked users and search query
  const visibleMessages = room.messages.filter(msg => {
    if (blockedUsers.includes(msg.sender)) return false;
    if (searchQuery && msg.text) {
       return msg.text.toLowerCase().includes(searchQuery.toLowerCase());
    }
    return true;
  });

  const scrollToBottom = () => {
    if (!isSearchOpen) {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [room.messages.length, replyingTo]); 

  // Focus input when replying
  useEffect(() => {
    if (replyingTo && inputRef.current) {
        inputRef.current.focus();
    }
  }, [replyingTo]);

  // Close context menu on click outside
  useEffect(() => {
    const handleClick = () => {
        if (contextMenu.visible) {
            setContextMenu({ ...contextMenu, visible: false });
        }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu.visible]);

  const handleSendText = () => {
    if (inputText.trim()) {
      const replyData = replyingTo ? {
          id: replyingTo.id,
          sender: replyingTo.sender,
          text: replyingTo.text || '[Message]' // Changed from Voice Message
      } : undefined;

      onSendMessage(inputText, replyData); // Simplified call
      setInputText('');
      setReplyingTo(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isInputDisabled) {
      e.preventDefault();
      handleSendText();
    }
  };

  // Removed startRecording, cancelRecording, sendVoiceMessage

  // --- Context Menu Handlers ---
  const handleContextMenu = (e: React.MouseEvent, msg: Message) => {
    e.preventDefault();
    setContextMenu({ visible: true, x: e.pageX, y: e.pageY, message: msg });
  };

  const handleTouchStart = (e: React.TouchEvent, msg: Message) => {
    const touch = e.touches[0];
    const pageX = touch.pageX;
    const pageY = touch.pageY;
    longPressTimer.current = setTimeout(() => {
        setContextMenu({ visible: true, x: pageX, y: pageY, message: msg });
    }, 500); 
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
    }
  };

  const handleUnsend = () => {
    if (contextMenu.message) {
        onDeleteMessage(contextMenu.message.id);
        setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const handleDeleteForYou = () => {
     if (contextMenu.message) {
        onDeleteForYou(contextMenu.message.id);
        setContextMenu({ ...contextMenu, visible: false });
     }
  };

  const handleBlock = () => {
    if (contextMenu.message) {
        onBlockUser(contextMenu.message.sender);
        setContextMenu({ ...contextMenu, visible: false });
    }
  };

  const handleCopy = () => {
      if (contextMenu.message && contextMenu.message.text) {
          navigator.clipboard.writeText(contextMenu.message.text);
          setContextMenu({ ...contextMenu, visible: false });
      }
  };

  const handleTranslate = () => {
      if (contextMenu.message && contextMenu.message.text) {
          onTranslate(contextMenu.message.id, contextMenu.message.text);
          setContextMenu({ ...contextMenu, visible: false });
      }
  };

  const handleShowInfo = () => {
      if (contextMenu.message) {
          setShowReadInfo(contextMenu.message);
          setContextMenu({ ...contextMenu, visible: false });
      }
  };

  const handleMessageClick = (msg: Message) => {
      if (window.getSelection()?.toString()) return;
      setReplyingTo(msg);
  };

  const getAvatar = (seed: string) => `https://picsum.photos/seed/${seed}/200/200`;

  // Removed AudioPlayer component

  const renderTextWithMentions = (text: string) => {
    const mentionRegex = /(@\w+)/g;
    const parts = text.split(mentionRegex);
    return parts.map((part, index) => {
      if (part.match(mentionRegex)) {
        const isMe = part === `@${currentUser}`;
        return (
          <span key={index} className={isMe ? "bg-yellow-500/30 text-yellow-200 px-1 rounded font-semibold" : "text-blue-300 font-medium"}>
            {part}
          </span>
        );
      }
      return part;
    });
  };

  return (
    <div className="flex flex-col h-full w-full bg-black relative">
      <ThemeBackground type={room.id} userCountry={userCountry} userState={userState} />
      
      {/* Header */}
      <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-black/60 backdrop-blur-xl sticky top-0 z-10 h-[73px]">
        {isSearchOpen ? (
           <div className="flex items-center w-full gap-3 animate-in fade-in slide-in-from-top-2 duration-200">
              <Search size={20} className="text-zinc-500" />
              <input 
                autoFocus
                type="text" 
                placeholder="Search messages..." 
                className="flex-1 bg-transparent text-white focus:outline-none placeholder-zinc-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button onClick={() => { setIsSearchOpen(false); setSearchQuery(''); }} className="text-zinc-400 hover:text-white">
                 <X size={24} />
              </button>
           </div>
        ) : (
           <>
            <div className="flex items-center gap-4">
              <button onClick={onBack} className="md:hidden text-zinc-400 hover:text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
              </button>
              <div className="flex items-center gap-3">
                 <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-lg overflow-hidden border border-white/20 ${room.id === RoomType.ONE_ON_ONE ? 'bg-gradient-to-br from-pink-500 to-purple-600' : 'bg-black'}`}>
                    {room.id === RoomType.ONE_ON_ONE ? (
                         room.connectedPartner ? (room.connectedPartner as UserProfile).username.charAt(0) : '?'
                    ) : (
                        // Tiny Icon in Header
                        room.id === RoomType.WORLD ? (
                            <img src="https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=200&auto=format&fit=crop" className="w-full h-full object-cover" />
                        ) : room.id === RoomType.COUNTRY ? (
                             <img src={`https://flagcdn.com/w160/${COUNTRY_CODES[userCountry]?.toLowerCase() || 'us'}.png`} className="w-full h-full object-cover" />
                        ) : room.id === RoomType.STATE ? (
                             <img src={`https://picsum.photos/seed/${userState}landmark/200/200`} className="w-full h-full object-cover" />
                        ) : null
                    )}
                 </div>
                 <div>
                   <h3 className="font-semibold text-white text-base">
                     {room.id === RoomType.ONE_ON_ONE 
                       ? (room.connectedPartner ? (room.connectedPartner as UserProfile).username : 'One on One') 
                       : room.name}
                   </h3>
                   <p className="text-xs text-zinc-400 flex items-center gap-1">
                      {room.id === RoomType.ONE_ON_ONE ? (
                          room.connectedPartner ? <span className="text-green-400">● Connected</span> : <span className="text-zinc-500">Searching...</span>
                      ) : (
                          room.id === RoomType.WORLD ? 'Global Chat' : room.id === RoomType.COUNTRY ? 'National Group' : 'Local Group'
                      )}
                   </p>
                 </div>
              </div>
            </div>
            <div className="flex items-center gap-6 text-white">
               {room.id === RoomType.ONE_ON_ONE && room.connectedPartner && (
                 <button 
                   onClick={onSkip} 
                   className="hover:text-pink-400 transition-colors flex items-center gap-1 text-xs font-bold border border-white/20 px-3 py-1.5 rounded-full hover:bg-white/10"
                   title="Skip and find new partner"
                 >
                   <SkipForward className="w-4 h-4" fill="currentColor" /> SKIP
                 </button>
               )}
               <button onClick={() => setIsSearchOpen(true)} className="hover:text-zinc-300">
                  <Search className="w-6 h-6" />
               </button>
            </div>
           </>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar relative z-0">
        {room.id === RoomType.ONE_ON_ONE && (room.isSearching || !isWsConnected) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/50 backdrop-blur-sm text-white">
                <div className="relative">
                     <div className="w-24 h-24 rounded-full border-2 border-pink-500/30 animate-ping absolute inset-0"></div>
                     <div className="w-24 h-24 rounded-full border-2 border-pink-500/50 animate-pulse flex items-center justify-center bg-black/50">
                        <Loader2 className="w-10 h-10 animate-spin text-pink-500" />
                     </div>
                </div>
                <h3 className="mt-6 text-xl font-light tracking-wider">
                  {!isWsConnected ? "CONNECTING TO SERVER..." : "SEARCHING FOR PARTNER"}
                </h3>
                <p className="text-zinc-500 text-sm mt-2">Connecting to random user...</p>
            </div>
        )}

        {visibleMessages.length === 0 && !room.isSearching && (
          <div className="flex flex-col items-center justify-center h-full text-zinc-500 mt-10">
            {searchQuery ? (
               <p>No messages found matching "{searchQuery}"</p>
            ) : (
                <>
                <div className="w-24 h-24 rounded-full border-2 border-white/10 bg-white/5 flex items-center justify-center mb-4 backdrop-blur-md">
                   <span className="text-4xl">👋</span>
                </div>
                <p className="text-zinc-400 drop-shadow-md">
                    {room.id === RoomType.ONE_ON_ONE ? 'You are connected! Say hi.' : `Say hello to everyone in ${room.name}!`}
                </p>
                </>
            )}
          </div>
        )}

        {visibleMessages.map((msg, index) => {
          const showAvatar = !msg.isMe && (index === 0 || visibleMessages[index - 1].sender !== msg.sender);
          const timeString = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

          return (
            <div key={msg.id} className={`flex w-full ${msg.isMe ? 'justify-end' : 'justify-start'} mb-1`}>
              {!msg.isMe && (
                <div className="w-8 flex-shrink-0 mr-2 flex items-end">
                   {showAvatar ? (
                     <img 
                       src={getAvatar(msg.sender)} 
                       alt={msg.sender} 
                       className="w-8 h-8 rounded-full bg-zinc-800 border border-black object-cover" 
                     />
                   ) : <div className="w-8" />}
                </div>
              )}
              
              <div className={`flex flex-col max-w-[70%] ${msg.isMe ? 'items-end' : 'items-start'}`}>
                 {!msg.isMe && showAvatar && (
                    <span className="text-[10px] text-zinc-400 ml-1 mb-1 font-medium drop-shadow-md">{msg.sender}</span>
                 )}
                 {msg.replyTo && (
                    <div className={`mb-1 px-3 py-2 rounded-lg text-xs bg-black/60 border-l-2 ${msg.isMe ? 'border-blue-400' : 'border-zinc-500'} text-zinc-300 backdrop-blur-sm truncate max-w-full`}>
                       <span className="font-bold block text-[10px] mb-0.5">{msg.replyTo.sender}</span>
                       {msg.replyTo.text}
                    </div>
                 )}
                 <div
                  onClick={() => handleMessageClick(msg)}
                  onContextMenu={(e) => handleContextMenu(e, msg)}
                  onTouchStart={(e) => handleTouchStart(e, msg)}
                  onTouchEnd={handleTouchEnd}
                  onTouchMove={handleTouchEnd} 
                  className={`px-4 py-2 rounded-[22px] text-[15px] leading-snug break-words relative group cursor-pointer select-none transition-transform active:scale-95 shadow-lg backdrop-blur-sm ${
                    msg.isMe
                      ? 'bg-[#3797f0] text-white rounded-br-sm'
                      : 'bg-[#262626]/80 text-white rounded-bl-sm border border-white/5'
                  }`}
                >
                  {/* Timestamp Tooltip */}
                  <div 
                    className={`absolute top-1/2 -translate-y-1/2 ${
                      msg.isMe 
                        ? 'right-full mr-2' 
                        : 'left-full ml-2'
                    } opacity-0 group-hover:opacity-100 group-active:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10`}
                  >
                     <span className="text-[10px] font-medium text-white/80 bg-black/40 px-1.5 py-0.5 rounded backdrop-blur-md">
                        {timeString}
                     </span>
                  </div>

                  {/* Text Message Content */}
                  {msg.text && renderTextWithMentions(msg.text)}
                  {msg.translation && (
                    <div className="mt-2 pt-2 border-t border-white/20 text-xs italic opacity-90">
                        <span className="font-bold">Translated:</span> {msg.translation}
                    </div>
                  )}
                </div>
                {msg.isMe && msg.readBy.length > 0 && (
                   <span className="text-[10px] text-zinc-500 mr-2 mt-1 flex items-center gap-1">
                      Seen <CheckCheck size={10} />
                   </span>
                )}
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply Preview Bar */}
      {replyingTo && (
        <div className="px-4 py-2 bg-zinc-900/90 backdrop-blur border-t border-zinc-800 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
                <Reply size={20} className="text-zinc-500 flex-shrink-0" />
                <div className="flex flex-col text-sm truncate">
                    <span className="text-[#3797f0] font-semibold">Replying to {replyingTo.sender}</span>
                    <span className="text-zinc-400 truncate text-xs">{replyingTo.text}</span>
                </div>
            </div>
            <button onClick={() => setReplyingTo(null)} className="text-zinc-500 hover:text-white">
                <X size={18} />
            </button>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 bg-black/80 backdrop-blur-md relative z-10">
        <div className={`flex items-center bg-[#262626] rounded-full px-2 py-1.5 border border-zinc-800 ${!isInputDisabled ? 'focus-within:border-zinc-600' : ''} transition-colors`}>
            <>
              <input
                ref={inputRef}
                type="text"
                className="flex-1 bg-transparent text-white px-3 py-2 focus:outline-none placeholder-zinc-500"
                placeholder={
                  !isWsConnected 
                    ? "Connecting to server..." 
                    : room.id === RoomType.ONE_ON_ONE && room.isSearching
                      ? "Searching for partner..."
                      : room.id === RoomType.ONE_ON_ONE && !room.connectedPartner
                        ? "Tap 'One on One' to start chat"
                        : "Message..."
                }
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isInputDisabled}
              />
              <div className="flex items-center gap-3 px-2">
                {!inputText && !isInputDisabled && (
                   <>
                    {/* Image and Heart icons, if needed, would go here. Mic removed. */}
                    <Image className="w-6 h-6 text-white cursor-pointer opacity-50" />
                    <Heart className="w-6 h-6 text-white cursor-pointer opacity-50" />
                   </>
                )}
                {(inputText && !isInputDisabled) && (
                   <button onClick={handleSendText} className="text-[#3797f0] font-semibold text-sm hover:text-blue-400">
                      Send
                   </button>
                )}
              </div>
            </>
        </div>
      </div>

      {/* Context Menu, Modal (kept as is) */}
      {contextMenu.visible && contextMenu.message && (
        <div 
            className="fixed z-50 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl overflow-hidden py-1 min-w-[180px]"
            style={{ 
                top: Math.min(contextMenu.y, window.innerHeight - 300), 
                left: Math.min(contextMenu.x, window.innerWidth - 200) 
            }}
        >
            {contextMenu.message.isMe ? (
              <>
                 {/* Message Info for my own messages */}
                 <button onClick={(e) => { e.stopPropagation(); handleShowInfo(); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
                    <Eye size={16} /> Message Info
                 </button>
                 {contextMenu.message.text && (
                   <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
                      <Copy size={16} /> Copy
                   </button>
                 )}
                 {contextMenu.message.text && (
                   <button onClick={(e) => { e.stopPropagation(); handleTranslate(); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
                      <Languages size={16} /> Translate
                   </button>
                 )}
                 <button onClick={(e) => { e.stopPropagation(); handleDeleteForYou(); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
                    <Trash2 size={16} /> Delete For You
                 </button>
                 {/* Unsend is only for BroadcastChannel messages for now */}
                 {room.id !== RoomType.ONE_ON_ONE && (
                   <button onClick={(e) => { e.stopPropagation(); handleUnsend(); }} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-zinc-700 flex items-center gap-2 border-t border-zinc-700">
                      <Trash2 size={16} /> Unsend
                   </button>
                 )}
              </>
            ) : (
              <>
                 {contextMenu.message.text && (
                   <button onClick={(e) => { e.stopPropagation(); handleCopy(); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
                      <Copy size={16} /> Copy
                   </button>
                 )}
                 {contextMenu.message.text && (
                   <button onClick={(e) => { e.stopPropagation(); handleTranslate(); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
                      <Languages size={16} /> Translate
                   </button>
                 )}
                 <button onClick={(e) => { e.stopPropagation(); handleDeleteForYou(); }} className="w-full text-left px-4 py-3 text-sm text-white hover:bg-zinc-700 flex items-center gap-2">
                    <Trash2 size={16} /> Delete For You
                 </button>
                 <button onClick={(e) => { e.stopPropagation(); handleBlock(); }} className="w-full text-left px-4 py-3 text-sm text-red-500 hover:bg-zinc-700 flex items-center gap-2 border-t border-zinc-700">
                    <Ban size={16} /> Block User
                 </button>
              </>
            )}
        </div>
      )}
    </div>
  );
};