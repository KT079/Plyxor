import React, { useState, useEffect, useRef } from 'react';
import { Login } from './components/Login';
import { ChatList } from './components/ChatList';
import { ChatWindow } from './components/ChatWindow';
import { UserProfile, RoomType, ChatRoom, Message, OnlineUserDoc } from './types';
import { translateMessage } from './services/geminiService';
import { db, auth } from './firebaseConfig';
import { 
  signInAnonymously, 
  onAuthStateChanged 
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  serverTimestamp, 
  doc, 
  setDoc, 
  limit, 
  getDocs, 
  runTransaction,
  deleteDoc,
  updateDoc
} from "firebase/firestore";

interface OnlineUser {
  username: string;
  country: string;
  state: string;
  timestamp: number;
}

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false); // New Demo Mode state
  const [activeRoom, setActiveRoom] = useState<RoomType>(RoomType.WORLD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [onlineUsersMap, setOnlineUsersMap] = useState<Map<string, OnlineUser>>(new Map());
  
  // Refs for tracking active state in listeners
  const activeRoomRef = useRef<RoomType>(activeRoom);
  const userRef = useRef<UserProfile | null>(user);

  // Initialize rooms state
  const [rooms, setRooms] = useState<Record<RoomType, ChatRoom>>({
    [RoomType.ONE_ON_ONE]: {
      id: RoomType.ONE_ON_ONE,
      name: 'One on One',
      description: 'Connect with a random stranger.',
      messages: [],
      unreadCount: 0,
      muted: false,
      isSearching: false,
      connectedPartner: null,
      sessionId: null
    },
    [RoomType.WORLD]: {
      id: RoomType.WORLD,
      name: 'World Chat',
      description: 'Connect with people from everywhere.',
      messages: [],
      unreadCount: 0,
      muted: false
    },
    [RoomType.COUNTRY]: {
      id: RoomType.COUNTRY,
      name: 'Country Chat',
      description: 'Connect with your nation.',
      messages: [],
      unreadCount: 0,
      muted: false
    },
    [RoomType.STATE]: {
      id: RoomType.STATE,
      name: 'State Chat',
      description: 'Connect with your neighbors.',
      messages: [],
      unreadCount: 0,
      muted: false
    }
  });

  // Keep refs sync
  useEffect(() => {
    activeRoomRef.current = activeRoom;
    userRef.current = user;
  }, [activeRoom, user]);

  // 1. Firebase Auth Initialization with Error Handling
  useEffect(() => {
    if (!auth) {
        console.warn("Firebase Auth not initialized. Switching to Demo Mode.");
        setIsDemoMode(true);
        return;
    }

    const handleAuthError = (error: any) => {
        // Suppress known configuration errors and switch to demo mode
        const ignoredCodes = [
            'auth/configuration-not-found', 
            'auth/api-key-not-valid', 
            'auth/operation-not-allowed',
            'auth/internal-error',
            'auth/admin-restricted-operation'
        ];
        
        if (ignoredCodes.includes(error.code)) {
             console.warn(`Firebase Auth unavailable (${error.code}). App operating in Demo Mode.`);
        } else {
             console.error("Firebase Auth Error:", error);
        }
        setIsDemoMode(true);
    };

    let unsubscribe: () => void;

    try {
        unsubscribe = onAuthStateChanged(auth, (authUser) => {
          if (authUser) {
            setFirebaseUid(authUser.uid);
            setIsDemoMode(false);
          } else {
            signInAnonymously(auth).catch(handleAuthError);
          }
        }, handleAuthError);
    } catch (e) {
        handleAuthError(e);
        unsubscribe = () => {};
    }

    return () => {
        if (unsubscribe) unsubscribe();
    };
  }, []);

  // 2. Presence System (Heartbeat) - Skipped in Demo Mode
  useEffect(() => {
    if (isDemoMode || !firebaseUid || !user || !db) return;

    // Set initial presence
    const userStatusRef = doc(db, 'online_users', firebaseUid);
    setDoc(userStatusRef, {
      userId: firebaseUid,
      username: user.username,
      country: user.country,
      state: user.state,
      lastActive: Date.now()
    }).catch(e => console.error("Presence error", e));

    const interval = setInterval(() => {
      updateDoc(userStatusRef, {
        lastActive: Date.now()
      }).catch(console.error);
    }, 5000); 

    // Listen for online users
    const q = query(collection(db, 'online_users'), where('lastActive', '>', Date.now() - 15000));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newMap = new Map<string, OnlineUser>();
      snapshot.forEach((doc) => {
        const data = doc.data() as OnlineUserDoc;
        if (data.userId !== firebaseUid) { 
          newMap.set(data.username, {
            username: data.username,
            country: data.country,
            state: data.state,
            timestamp: data.lastActive
          });
        }
      });
      setOnlineUsersMap(newMap);
    }, (error) => {
        // If snapshot fails (e.g. permission denied), switch to simulated list
        console.warn("Snapshot error (using local fallback):", error);
    });

    return () => {
      clearInterval(interval);
      deleteDoc(userStatusRef).catch(() => {});
      unsubscribe();
    };
  }, [firebaseUid, user, isDemoMode]);

  // 3. Message Listeners - Skipped in Demo Mode
  useEffect(() => {
    if (isDemoMode || !firebaseUid || !user || !db) return;

    const setupRoomListener = (roomType: RoomType, roomId: string) => {
      const q = query(
        collection(db, 'messages'),
        where('roomId', '==', roomId),
        orderBy('timestamp', 'asc'),
        limit(100)
      );

      return onSnapshot(q, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added') {
            const data = change.doc.data();
            const message: Message = {
              id: change.doc.id,
              sender: data.sender,
              text: data.text,
              timestamp: data.timestamp,
              isMe: data.senderUid === firebaseUid,
              replyTo: data.replyTo,
              readBy: data.readBy || [],
              translation: data.translation,
              roomId: data.roomId
            };

            setRooms(prev => {
              const currentRoom = prev[roomType];
              if (currentRoom.messages.some(m => m.id === message.id)) return prev;

              const isRoomActive = activeRoomRef.current === roomType;
              const isBlocked = blockedUsers.includes(message.sender);
              const shouldNotify = !isRoomActive && !message.isMe && !currentRoom.muted && !isBlocked;

              if (!message.isMe && !isBlocked) {
                  const mentionText = `@${userRef.current?.username}`;
                  if (message.text?.includes(mentionText)) {
                    if ('Notification' in window && Notification.permission === 'granted') {
                        new Notification(`Mentioned in ${currentRoom.name}`, {
                            body: `${message.sender}: ${message.text}`
                        });
                    }
                  }
              }

              return {
                ...prev,
                [roomType]: {
                  ...currentRoom,
                  messages: [...currentRoom.messages, message],
                  unreadCount: shouldNotify ? currentRoom.unreadCount + 1 : currentRoom.unreadCount
                }
              };
            });
          }
        });
      });
    };

    const unsubWorld = setupRoomListener(RoomType.WORLD, 'WORLD_CHAT');
    const unsubCountry = setupRoomListener(RoomType.COUNTRY, `COUNTRY_${user.country}`);
    const unsubState = setupRoomListener(RoomType.STATE, `STATE_${user.state}_${user.country}`);
    
    return () => {
      unsubWorld();
      unsubCountry();
      unsubState();
    };
  }, [firebaseUid, user, blockedUsers, isDemoMode]);

  // 4. One-on-One Matching Logic (Firebase)
  const oneOnOneListenerRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (isDemoMode || !db) return;
    const sessionID = rooms[RoomType.ONE_ON_ONE].sessionId;
    
    if (oneOnOneListenerRef.current) {
        oneOnOneListenerRef.current();
        oneOnOneListenerRef.current = null;
    }

    if (sessionID && firebaseUid) {
        const q = query(
            collection(db, 'messages'),
            where('roomId', '==', sessionID),
            orderBy('timestamp', 'asc'),
            limit(100)
        );

        const unsub = onSnapshot(q, (snapshot) => {
             snapshot.docChanges().forEach((change) => {
                if (change.type === 'added') {
                    const data = change.doc.data();
                    const message: Message = {
                        id: change.doc.id,
                        sender: data.sender,
                        text: data.text,
                        timestamp: data.timestamp,
                        isMe: data.senderUid === firebaseUid,
                        replyTo: data.replyTo,
                        readBy: [],
                        roomId: sessionID
                    };
                    
                    setRooms(prev => ({
                        ...prev,
                        [RoomType.ONE_ON_ONE]: {
                            ...prev[RoomType.ONE_ON_ONE],
                            messages: [...prev[RoomType.ONE_ON_ONE].messages.filter(m => m.id !== message.id), message]
                        }
                    }));
                }
             });
        });
        oneOnOneListenerRef.current = unsub;
    }
  }, [rooms[RoomType.ONE_ON_ONE].sessionId, firebaseUid, isDemoMode]);


  // --- Simulation Logic for Demo Mode ---
  useEffect(() => {
      if (!isDemoMode || !user) return;

      // 1. Simulate One-on-One Partner
      if (activeRoom === RoomType.ONE_ON_ONE && rooms[RoomType.ONE_ON_ONE].isSearching && !rooms[RoomType.ONE_ON_ONE].connectedPartner) {
          const timer = setTimeout(() => {
              const demoPartner = { username: 'Plyxor Bot', country: 'AI', state: 'Virtual' };
              setRooms(prev => ({
                  ...prev,
                  [RoomType.ONE_ON_ONE]: {
                      ...prev[RoomType.ONE_ON_ONE],
                      isSearching: false,
                      connectedPartner: demoPartner,
                      sessionId: 'demo-session',
                      messages: [
                          {
                              id: Date.now().toString(),
                              sender: 'System',
                              text: 'Demo Mode: Simulating connection because Firebase Auth is not fully configured.',
                              timestamp: Date.now(),
                              isMe: false,
                              readBy: []
                          },
                          {
                              id: (Date.now() + 1).toString(),
                              sender: 'Plyxor Bot',
                              text: 'Hello! I am a simulated partner. You can chat with me while offline.',
                              timestamp: Date.now(),
                              isMe: false,
                              readBy: []
                          }
                      ]
                  }
              }));
          }, 1500);
          return () => clearTimeout(timer);
      }
      
      // 2. Simulate World Chat Activity
      const worldTimer = setInterval(() => {
        if (Math.random() > 0.8) { // Occasional random message
            const msgs = [
                "Hello from the other side!", 
                "Anyone from Brazil here?", 
                "This demo mode is pretty smooth.",
                "Plyxor is cool.",
                "Greetings!"
            ];
            const randomMsgText = msgs[Math.floor(Math.random() * msgs.length)];
            const randomUser = `User${Math.floor(Math.random() * 1000)}`;
            
            setRooms(prev => ({
                ...prev,
                [RoomType.WORLD]: {
                    ...prev[RoomType.WORLD],
                    messages: [...prev[RoomType.WORLD].messages, {
                        id: Date.now().toString() + Math.random(),
                        sender: randomUser,
                        text: randomMsgText,
                        timestamp: Date.now(),
                        isMe: false,
                        readBy: []
                    }]
                }
            }));
        }
      }, 8000);

      return () => clearInterval(worldTimer);

  }, [isDemoMode, user, activeRoom, rooms[RoomType.ONE_ON_ONE].isSearching]);


  const startSearch = async () => {
      if (!user) return;

      setRooms(prev => ({
          ...prev,
          [RoomType.ONE_ON_ONE]: { ...prev[RoomType.ONE_ON_ONE], isSearching: true, messages: [] }
      }));

      if (isDemoMode) {
          // Handled by effect above
          return;
      }

      if (!firebaseUid || !db) return;

      const queueRef = collection(db, 'queue');
      const myUserDocRef = doc(db, 'users', firebaseUid);

      await setDoc(myUserDocRef, {
          status: 'searching',
          sessionId: null,
          profile: user
      });

      try {
          await runTransaction(db, async (transaction) => {
              const q = query(queueRef, orderBy('timestamp', 'asc'), limit(1));
              const querySnapshot = await getDocs(q);
              
              let matchFound = false;
              let partnerUid = '';
              let partnerProfile: UserProfile | null = null;
              
              querySnapshot.forEach(doc => {
                  if (doc.id !== firebaseUid) {
                      matchFound = true;
                      partnerUid = doc.id;
                      partnerProfile = doc.data().profile;
                  }
              });

              if (matchFound && partnerUid && partnerProfile) {
                  const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                  transaction.delete(doc(db, 'queue', partnerUid));
                  transaction.update(doc(db, 'users', partnerUid), {
                      status: 'matched',
                      sessionId: newSessionId,
                      partnerProfile: user
                  });
                  transaction.update(myUserDocRef, {
                      status: 'matched',
                      sessionId: newSessionId,
                      partnerProfile: partnerProfile
                  });

                  setRooms(prev => ({
                      ...prev,
                      [RoomType.ONE_ON_ONE]: {
                          ...prev[RoomType.ONE_ON_ONE],
                          isSearching: false,
                          connectedPartner: partnerProfile,
                          sessionId: newSessionId
                      }
                  }));
              } else {
                  transaction.set(doc(db, 'queue', firebaseUid), {
                      userId: firebaseUid,
                      timestamp: Date.now(),
                      profile: user
                  });
              }
          });
      } catch (e) {
          console.error("Matchmaking error: ", e);
      }
  };

  // Passive Match Listener (Firebase only)
  useEffect(() => {
      if (isDemoMode || !firebaseUid || !db) return;
      if (!rooms[RoomType.ONE_ON_ONE].isSearching) return;

      const unsub = onSnapshot(doc(db, 'users', firebaseUid), (doc) => {
          const data = doc.data();
          if (data && data.status === 'matched' && data.sessionId) {
              setRooms(prev => ({
                  ...prev,
                  [RoomType.ONE_ON_ONE]: {
                      ...prev[RoomType.ONE_ON_ONE],
                      isSearching: false,
                      sessionId: data.sessionId,
                      connectedPartner: data.partnerProfile
                  }
              }));
          }
      });
      return () => unsub();
  }, [firebaseUid, rooms[RoomType.ONE_ON_ONE].isSearching, isDemoMode]);


  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    setRooms(prev => ({
        ...prev,
        [RoomType.COUNTRY]: { ...prev[RoomType.COUNTRY], name: profile.country },
        [RoomType.STATE]: { ...prev[RoomType.STATE], name: `${profile.state}, ${profile.country}` }
    }));
  };

  const handleLogout = async () => {
    if (!isDemoMode && firebaseUid && db) {
        await deleteDoc(doc(db, 'online_users', firebaseUid));
        await deleteDoc(doc(db, 'queue', firebaseUid));
    }
    
    setUser(null);
    setFirebaseUid(null);
    setActiveRoom(RoomType.WORLD);
    setIsDemoMode(false);
    setRooms(prev => {
        const resetRooms = {} as Record<RoomType, ChatRoom>;
        Object.values(RoomType).forEach(type => {
             resetRooms[type] = {
                 ...prev[type],
                 messages: [],
                 unreadCount: 0,
                 connectedPartner: null,
                 sessionId: null,
                 isSearching: false
             };
        });
        resetRooms[RoomType.COUNTRY].name = 'Country Chat';
        resetRooms[RoomType.STATE].name = 'State Chat';
        return resetRooms;
    });
  };

  const handleSendMessage = async (text: string, replyTo?: Message['replyTo']) => {
      if (!user) return;

      // --- Demo Mode Send ---
      if (isDemoMode) {
          const fakeMsg: Message = {
              id: Date.now().toString(),
              sender: user.username,
              text,
              timestamp: Date.now(),
              isMe: true,
              replyTo,
              readBy: []
          };
          
          setRooms(prev => ({
             ...prev,
             [activeRoom]: {
                 ...prev[activeRoom],
                 messages: [...prev[activeRoom].messages, fakeMsg]
             }
          }));

          // Fake Bot Reply if in One on One
          if (activeRoom === RoomType.ONE_ON_ONE) {
              setTimeout(() => {
                  const botReply: Message = {
                      id: (Date.now() + 10).toString(),
                      sender: 'Plyxor Bot',
                      text: `Echo: ${text}`,
                      timestamp: Date.now(),
                      isMe: false,
                      readBy: [],
                      replyTo: { id: fakeMsg.id, sender: fakeMsg.sender, text: fakeMsg.text }
                  };
                  setRooms(prev => ({
                      ...prev,
                      [activeRoom]: {
                          ...prev[activeRoom],
                          messages: [...prev[activeRoom].messages, botReply]
                      }
                  }));
              }, 800);
          }
          return;
      }

      // --- Real Firebase Send ---
      if (!firebaseUid || !db) return;

      let targetRoomId = '';
      switch (activeRoom) {
          case RoomType.WORLD: targetRoomId = 'WORLD_CHAT'; break;
          case RoomType.COUNTRY: targetRoomId = `COUNTRY_${user.country}`; break;
          case RoomType.STATE: targetRoomId = `STATE_${user.state}_${user.country}`; break;
          case RoomType.ONE_ON_ONE: targetRoomId = rooms[RoomType.ONE_ON_ONE].sessionId || ''; break;
      }

      if (!targetRoomId) return;

      try {
          await addDoc(collection(db, 'messages'), {
              text,
              sender: user.username,
              senderUid: firebaseUid,
              timestamp: Date.now(),
              roomId: targetRoomId,
              replyTo: replyTo || null,
              readBy: [user.username]
          });
      } catch (e) {
          console.error("Error sending message: ", e);
      }
  };

  const handleSkip = async () => {
      setRooms(prev => ({
          ...prev,
          [RoomType.ONE_ON_ONE]: { ...prev[RoomType.ONE_ON_ONE], connectedPartner: null, sessionId: null, messages: [] }
      }));
      startSearch();
  };

  const handleSelectRoom = (roomType: RoomType) => {
      setActiveRoom(roomType);
      setIsMobileMenuOpen(false);
      setRooms(prev => ({
          ...prev,
          [roomType]: { ...prev[roomType], unreadCount: 0 }
      }));

      if (roomType === RoomType.ONE_ON_ONE) {
          if (!rooms[RoomType.ONE_ON_ONE].sessionId && !rooms[RoomType.ONE_ON_ONE].isSearching) {
              startSearch();
          }
      }
  };

  const handleDeleteMessage = async (messageId: string) => {
      setRooms(prev => ({
        ...prev,
        [activeRoom]: {
            ...prev[activeRoom],
            messages: prev[activeRoom].messages.filter(m => m.id !== messageId)
        }
      }));
  };

  const handleDeleteForYou = (messageId: string) => {
      setRooms(prev => ({
        ...prev,
        [activeRoom]: {
            ...prev[activeRoom],
            messages: prev[activeRoom].messages.filter(m => m.id !== messageId)
        }
      }));
  };

  const handleBlockUser = (username: string) => {
      setBlockedUsers(prev => [...prev, username]);
  };

  const handleTranslateMessage = async (messageId: string, text: string) => {
      if (!user) return;
      const targetLang = user.country === "United States" || user.country === "United Kingdom" ? "Spanish" : "English"; 
      const translated = await translateMessage(text, targetLang);
      
      setRooms(prev => {
          const room = prev[activeRoom];
          const updatedMessages = room.messages.map(msg => msg.id === messageId ? { ...msg, translation: translated } : msg);
          return { ...prev, [activeRoom]: { ...room, messages: updatedMessages } };
      });
  };

  const handleToggleMute = (roomType: RoomType) => {
    setRooms(prev => ({ ...prev, [roomType]: { ...prev[roomType], muted: !prev[roomType].muted } }));
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  const onlineUsersList = isDemoMode ? [] : Array.from(onlineUsersMap.values()).filter((u: OnlineUser) => u.username !== user.username);

  return (
    <div className="flex h-screen w-full bg-black overflow-hidden">
      <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:block w-full md:w-auto h-full`}>
        <ChatList 
          rooms={rooms} 
          activeRoom={activeRoom} 
          onSelectRoom={handleSelectRoom}
          onToggleMute={handleToggleMute}
          onLogout={handleLogout}
          currentUser={user.username}
          onlineUsers={onlineUsersList}
          userCountry={user.country}
          userState={user.state}
        />
      </div>

      <div className={`${!isMobileMenuOpen ? 'flex' : 'hidden'} md:flex flex-1 h-full`}>
        <ChatWindow 
          room={rooms[activeRoom]} 
          onSendMessage={handleSendMessage}
          onDeleteMessage={handleDeleteMessage}
          onDeleteForYou={handleDeleteForYou}
          onBlockUser={handleBlockUser}
          onTranslate={handleTranslateMessage}
          onSkip={handleSkip}
          blockedUsers={blockedUsers}
          onBack={() => setIsMobileMenuOpen(true)}
          currentUser={user.username}
          userCountry={user.country}
          userState={user.state}
          isWsConnected={!!firebaseUid || isDemoMode} // Active if Firebase works OR Demo mode
        />
      </div>
    </div>
  );
};

export default App;