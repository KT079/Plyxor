import React, { useEffect, useRef, useState } from "react";
import { Login } from "./components/Login";
import { ChatList } from "./components/ChatList";
import { ChatWindow } from "./components/ChatWindow";
import { RoomType, ChatRoom, Message, UserProfile } from "./types";
import { db, auth } from "./firebaseConfig";

import {
  signInAnonymously,
  onAuthStateChanged,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where,
  limit,
} from "firebase/firestore";

/* ---------------- SAFE CONSTANTS ---------------- */

const ROOM_KEYS: RoomType[] = [
  RoomType.WORLD,
  RoomType.COUNTRY,
  RoomType.STATE,
  RoomType.ONE_ON_ONE,
];

const EMPTY_ROOMS: Record<RoomType, ChatRoom> = {
  [RoomType.WORLD]: {
    id: RoomType.WORLD,
    name: "World Chat",
    description: "Chat with everyone",
    messages: [],
    unreadCount: 0,
    muted: false,
  },
  [RoomType.COUNTRY]: {
    id: RoomType.COUNTRY,
    name: "Country Chat",
    description: "Chat with your country",
    messages: [],
    unreadCount: 0,
    muted: false,
  },
  [RoomType.STATE]: {
    id: RoomType.STATE,
    name: "State Chat",
    description: "Chat with your state",
    messages: [],
    unreadCount: 0,
    muted: false,
  },
  [RoomType.ONE_ON_ONE]: {
    id: RoomType.ONE_ON_ONE,
    name: "One on One",
    description: "Random chat",
    messages: [],
    unreadCount: 0,
    muted: false,
    isSearching: false,
    connectedPartner: null,
    sessionId: null,
  },
};

/* ---------------- APP ---------------- */

const App: React.FC = () => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [firebaseUid, setFirebaseUid] = useState<string | null>(null);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [activeRoom, setActiveRoom] = useState<RoomType>(RoomType.WORLD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(true);
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [rooms, setRooms] = useState<Record<RoomType, ChatRoom>>(EMPTY_ROOMS);

  const activeRoomRef = useRef(activeRoom);
  const userRef = useRef(user);

  useEffect(() => {
    activeRoomRef.current = activeRoom;
    userRef.current = user;
  }, [activeRoom, user]);

  /* ---------------- AUTH ---------------- */

  useEffect(() => {
    if (!auth) {
      setIsDemoMode(true);
      return;
    }

    const unsub = onAuthStateChanged(
      auth,
      async (u) => {
        if (u) {
          setFirebaseUid(u.uid);
          setIsDemoMode(false);
        } else {
          try {
            await signInAnonymously(auth);
          } catch {
            setIsDemoMode(true);
          }
        }
      },
      () => setIsDemoMode(true)
    );

    return () => unsub();
  }, []);

  /* ---------------- MESSAGE LISTENER ---------------- */

  useEffect(() => {
    if (!user || !firebaseUid || !db || isDemoMode) return;

    const getRoomId = (type: RoomType) => {
      switch (type) {
        case RoomType.WORLD:
          return "WORLD_CHAT";
        case RoomType.COUNTRY:
          return `COUNTRY_${user.country}`;
        case RoomType.STATE:
          return `STATE_${user.state}_${user.country}`;
        default:
          return null;
      }
    };

    const unsubscribers: (() => void)[] = [];

    [RoomType.WORLD, RoomType.COUNTRY, RoomType.STATE].forEach((type) => {
      const roomId = getRoomId(type);
      if (!roomId) return;

      const q = query(
        collection(db, "messages"),
        where("roomId", "==", roomId),
        orderBy("timestamp", "asc"),
        limit(100)
      );

      const unsub = onSnapshot(q, (snap) => {
        snap.docChanges().forEach((c) => {
          if (c.type === "added") {
            const d = c.doc.data();
            const msg: Message = {
              id: c.doc.id,
              sender: d.sender,
              text: d.text,
              timestamp: d.timestamp,
              isMe: d.senderUid === firebaseUid,
              readBy: d.readBy || [],
              roomId,
            };

            setRooms((prev) => {
              if (prev[type].messages.some((m) => m.id === msg.id)) return prev;
              return {
                ...prev,
                [type]: {
                  ...prev[type],
                  messages: [...prev[type].messages, msg],
                },
              };
            });
          }
        });
      });

      unsubscribers.push(unsub);
    });

    return () => unsubscribers.forEach((u) => u());
  }, [user, firebaseUid, isDemoMode]);

  /* ---------------- LOGIN ---------------- */

  const handleLogin = (profile: UserProfile) => {
    setUser(profile);
    setRooms((prev) => ({
      ...prev,
      [RoomType.COUNTRY]: { ...prev[RoomType.COUNTRY], name: profile.country },
      [RoomType.STATE]: {
        ...prev[RoomType.STATE],
        name: `${profile.state}, ${profile.country}`,
      },
    }));
  };

  /* ---------------- SEND MESSAGE ---------------- */

  const handleSendMessage = async (text: string) => {
    if (!user) return;

    if (isDemoMode) {
      const fake: Message = {
        id: Date.now().toString(),
        sender: user.username,
        text,
        timestamp: Date.now(),
        isMe: true,
        readBy: [],
      };
      setRooms((p) => ({
        ...p,
        [activeRoom]: {
          ...p[activeRoom],
          messages: [...p[activeRoom].messages, fake],
        },
      }));
      return;
    }

    if (!db || !firebaseUid) return;

    let roomId = "";
    if (activeRoom === RoomType.WORLD) roomId = "WORLD_CHAT";
    if (activeRoom === RoomType.COUNTRY) roomId = `COUNTRY_${user.country}`;
    if (activeRoom === RoomType.STATE)
      roomId = `STATE_${user.state}_${user.country}`;

    if (!roomId) return;

    await addDoc(collection(db, "messages"), {
      text,
      sender: user.username,
      senderUid: firebaseUid,
      roomId,
      timestamp: Date.now(),
      readBy: [user.username],
    });
  };

  /* ---------------- UI ---------------- */

  if (!user) return <Login onLogin={handleLogin} />;

  return (
    <div className="flex h-screen bg-black text-white">
      <div className={`${isMobileMenuOpen ? "block" : "hidden"} md:block`}>
        <ChatList
          rooms={rooms}
          activeRoom={activeRoom}
          onSelectRoom={(r) => {
            setActiveRoom(r);
            setIsMobileMenuOpen(false);
          }}
          onLogout={() => window.location.reload()}
          currentUser={user.username}
          onlineUsers={[]}
          userCountry={user.country}
          userState={user.state}
          onToggleMute={() => {}}
        />
      </div>

      <div className="flex-1">
        <ChatWindow
          room={rooms[activeRoom]}
          onSendMessage={handleSendMessage}
          onBack={() => setIsMobileMenuOpen(true)}
          blockedUsers={blockedUsers}
          onBlockUser={(u) => setBlockedUsers((p) => [...p, u])}
          isWsConnected={true}
          currentUser={user.username}
          userCountry={user.country}
          userState={user.state}
          onDeleteMessage={() => {}}
          onDeleteForYou={() => {}}
          onTranslate={() => {}}
          onSkip={() => {}}
        />
      </div>
    </div>
  );
};

export default App;
