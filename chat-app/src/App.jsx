import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Search, PlusCircle, Phone, Video, SendHorizonal, EllipsisVertical, Paperclip, Send } from 'lucide-react';
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import defaultAvatar from './images/me.jpg';
import avatar1 from './images/one.jpg';
import avatar2 from './images/two.jpg';
import avatar3 from './images/three.jpg';
import avatar4 from './images/four.jpg';
import avatar5 from './images/five.jpg';
import { collection, doc, addDoc, query, orderBy, onSnapshot, deleteDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth, storage } from './firebase';
import { updateProfile } from 'firebase/auth';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

// Constants
const THEMES = [
  { 
    name: 'Light', 
    class: 'light-theme',
    gradient: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)'
  },
  { 
    name: 'Dark', 
    class: 'dark-theme',
    gradient: 'linear-gradient(135deg, #1e1e1e, #3a3a3a)'
  },
  { 
    name: 'Sunset', 
    class: 'sunset-theme',
    gradient: 'linear-gradient(135deg, #ff9a9e, #fad0c4)'
  },
  { 
    name: 'Ocean', 
    class: 'ocean-theme',
    gradient: 'linear-gradient(135deg, #1d2b64, #f8cdda)'
  }
];

const DEFAULT_CONTACTS = [
  { id: '1', name: 'Daniel', lastMessage: 'Hey there!', img: avatar1 },
  { id: '2', name: 'Zeal', lastMessage: 'How are you?', img: avatar2 },
  { id: '3', name: 'Wisdom', lastMessage: 'See you soon', img: avatar3 },
  { id: '4', name: 'Benjamine', lastMessage: 'Thanks!', img: avatar4 },
  { id: '5', name: 'Grace', lastMessage: 'Call me later', img: avatar5 },
];

const ChatApp = () => {
  // State management
  const [menuOpen, setMenuOpen] = useState(false);
  const [messages, setMessages] = useState({});
  const [message, setMessage] = useState('');
  const [videoCallActive, setVideoCallActive] = useState(false);
  const [activeChat, setActiveChat] = useState(null);
  const [showChatBoard, setShowChatBoard] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [newProfilePic, setNewProfilePic] = useState(null);
  const [newProfilePicPreview, setNewProfilePicPreview] = useState('');
  const [users, setUsers] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [activeTheme, setActiveTheme] = useState(THEMES[3]); // Default to Ocean theme
  const [searchQuery, setSearchQuery] = useState('');
  const [currentUserData, setCurrentUserData] = useState({
    name: 'You',
    photoURL: defaultAvatar
  });

  // Refs
  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const peerConnection = useRef(null);
  const mediaStreamRef = useRef(null);

  // Initialize user data
  useEffect(() => {
    const initializeUser = async () => {
      const user = auth.currentUser;
      if (user) {
        setCurrentUserData({
          name: user.displayName || 'You',
          photoURL: user.photoURL || defaultAvatar
        });
      }

      // Initialize users from localStorage or defaults
      const savedUsers = localStorage.getItem('chatUsers');
      if (savedUsers) {
        setUsers(JSON.parse(savedUsers));
      } else {
        setUsers([
          {
            id: 'current-user',
            name: user?.displayName || 'You',
            lastMessage: 'Your profile',
            img: user?.photoURL || defaultAvatar
          },
          ...DEFAULT_CONTACTS
        ]);
      }
    };

    initializeUser();
  }, []);

  // Save users to localStorage when they change
  useEffect(() => {
    localStorage.setItem('chatUsers', JSON.stringify(users));
  }, [users]);

  // Apply theme
  useEffect(() => {
    document.body.style.background = activeTheme.gradient;
    return () => {
      document.body.style.background = '';
    };
  }, [activeTheme]);

  // Filter contacts based on search query
  const filteredContacts = users.filter(user => 
    user.id !== 'current-user' && 
    user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Chat functions
  const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), []);

  const openChat = useCallback((contact) => {
    setActiveChat(contact);
    setShowChatBoard(true);
    setMenuOpen(false);
  }, []);

  const goBackToContacts = useCallback(() => {
    setShowChatBoard(false);
    setActiveChat(null);
  }, []);

  // Message functions
  useEffect(() => {
    if (!activeChat) return;

    const messagesRef = collection(db, 'chats', activeChat.id, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const messagesData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setMessages(prev => ({ ...prev, [activeChat.id]: messagesData }));
      
      // Scroll to bottom when new messages arrive
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    });

    return () => unsubscribe();
  }, [activeChat]);

  const sendMessage = async () => {
    if (!message.trim() || !activeChat) return;

    try {
      await addDoc(collection(db, 'chats', activeChat.id, 'messages'), {
        text: message,
        sender: auth.currentUser?.uid || 'me',
        timestamp: new Date(),
      });
      setMessage('');
    } catch (error) {
      console.error('Error sending message: ', error);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Video call functions
  const startVideoCall = async () => {
    try {
      setVideoCallActive(true);
      
      // Get user media
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      });
      
      mediaStreamRef.current = stream;
      
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      // Create peer connection
      peerConnection.current = new RTCPeerConnection({
        iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
      });

      // Add local stream to connection
      stream.getTracks().forEach(track => {
        peerConnection.current.addTrack(track, stream);
      });

      // Handle remote stream
      peerConnection.current.ontrack = (event) => {
        if (remoteVideoRef.current) {
          remoteVideoRef.current.srcObject = event.streams[0];
        }
      };

      // Create an offer
      const offer = await peerConnection.current.createOffer();
      await peerConnection.current.setLocalDescription(offer);

      // Generate a unique ID
      const callId = Math.random().toString(36).substr(2, 9);
      const callDoc = doc(collection(db, 'calls'), callId);

      // Save offer to Firestore
      await setDoc(callDoc, { 
        offer: offer,
        caller: auth.currentUser?.uid,
        callee: activeChat.id,
        timestamp: new Date()
      });

      // Listen for an answer
      onSnapshot(callDoc, (snapshot) => {
        const data = snapshot.data();
        if (data?.answer && !peerConnection.current.currentRemoteDescription) {
          const answer = new RTCSessionDescription(data.answer);
          peerConnection.current.setRemoteDescription(answer);
        }
      });

      alert(`Video call started! Share this ID with your friend: ${callId}`);
    } catch (error) {
      console.error('Error starting video call:', error);
      alert('Failed to start video call. Check console for details.');
      setVideoCallActive(false);
    }
  };

  const endVideoCall = useCallback(() => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }
    if (peerConnection.current) {
      peerConnection.current.close();
      peerConnection.current = null;
    }
    setVideoCallActive(false);
  }, []);

  // Clean up video call on unmount
  useEffect(() => {
    return () => {
      endVideoCall();
    };
  }, [endVideoCall]);

  // File upload functions
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !activeChat) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('File size must be less than 5MB');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // Create storage reference
      const storageRef = ref(storage, `chat-files/${activeChat.id}/${file.name}`);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get download URL
      const fileUrl = await getDownloadURL(snapshot.ref);

      // Send file message
      await addDoc(collection(db, 'chats', activeChat.id, 'messages'), {
        type: file.type.startsWith('image/') ? 'image' : 'file',
        content: fileUrl,
        fileName: file.name,
        sender: auth.currentUser?.uid || 'me',
        timestamp: new Date(),
      });

      // Reset file input
      e.target.value = '';
    } catch (error) {
      console.error('Upload error:', error);
      setUploadError('Failed to upload file. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  // Profile functions
  const handleProfileClick = useCallback(() => {
    setEditProfileOpen(true);
  }, []);

  const handleProfilePicChange = useCallback((e) => {
    if (e.target.files[0]) {
      setNewProfilePic(e.target.files[0]);
      const previewUrl = URL.createObjectURL(e.target.files[0]);
      setNewProfilePicPreview(previewUrl);
    }
  }, []);

  const updateUserProfile = async () => {
    if (!newProfilePic) return;

    try {
      // Create storage reference
      const storageRef = ref(storage, `profile-pictures/${auth.currentUser.uid}`);
      
      // Upload file
      const snapshot = await uploadBytes(storageRef, newProfilePic);
      
      // Get download URL
      const imageUrl = await getDownloadURL(snapshot.ref);
      
      // Update profile
      await updateProfile(auth.currentUser, { 
        photoURL: imageUrl 
      });
      
      // Update Firestore
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { 
        photoURL: imageUrl 
      });
      
      // Update local state
      setCurrentUserData(prev => ({
        ...prev,
        photoURL: imageUrl
      }));
      
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === 'current-user' 
            ? { ...user, img: imageUrl } 
            : user
        )
      );
      
      // Reset states
      setNewProfilePic(null);
      setNewProfilePicPreview('');
      setEditProfileOpen(false);
      
      alert('Profile picture updated successfully!');
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile picture');
    }
  };
  // Add this useEffect to your ChatApp component
useEffect(() => {
  const usersRef = collection(db, 'users');
  const q = query(usersRef, orderBy('createdAt', 'desc'));
  
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const usersData = snapshot.docs.map(doc => ({
      id: doc.id,
      name: doc.data().displayName || doc.data().name, // Handle both field names
      lastMessage: doc.data().lastMessage || "Available",
      img: doc.data().photoURL || doc.data().img || defaultAvatar
    }));
    
    // Keep current user first
    const currentUser = usersData.find(u => u.id === auth.currentUser?.uid);
    const otherUsers = usersData.filter(u => u.id !== auth.currentUser?.uid);
    
    setUsers(currentUser ? [currentUser, ...otherUsers] : usersData);
  });

  return () => unsubscribe();
}, []);

  return (
    <div className={`chat-app-container ${showChatBoard ? 'chat-active' : ''}`}>
      {/* Sidebar */}
      <div className={`sidebar ${showChatBoard ? 'd-none d-md-flex' : 'd-flex'}`}>
        {/* Current User Profile */}
        <div className="user-profile" onClick={handleProfileClick}>
          <img
            src={currentUserData.photoURL}
            alt="User profile"
            className="profile-pic"
            onError={(e) => {
              e.target.onerror = null;
              e.target.src = defaultAvatar;
            }}
          />
          <h5>{currentUserData.name}</h5>
        </div>

        {/* Contacts List */}
        <div className="contacts-container">
          <div className="search-container">
            <Search className="search-icon" />
            <input 
              type="text" 
              className="search-input" 
              placeholder="Search contacts..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <ul className="contacts-list">
            {filteredContacts.map((user) => (
              <li
                key={user.id}
                className="contact-item"
                onClick={() => openChat(user)}
              >
                <img
                  src={user.img || defaultAvatar}
                  alt={user.name}
                  className="contact-avatar"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = defaultAvatar;
                  }}
                />
                <div className="contact-info">
                  <h6>{user.name}</h6>
                  <p>{user.lastMessage || 'No messages yet'}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <button className="new-chat-btn">
          <PlusCircle className="btn-icon" /> New Chat
        </button>
      </div>

      {/* Chat Window */}
<div className={`chat-window ${showChatBoard ? 'd-block' : 'd-none d-md-block'}`}>
  {activeChat ? (
    <div className="chat-window-inner">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="header-left">
          <button className="back-btn d-md-none" onClick={goBackToContacts}>
            ←
          </button>
          <div className="user-info">
            <img
              src={activeChat.img || defaultAvatar}
              alt={activeChat.name}
              className="chat-avatar"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = defaultAvatar;
              }}
            />
            <div>
              <h5 className="user-name">{activeChat.name}</h5>
              <span className="user-status">Online</span>
            </div>
          </div>
        </div>

        <div className="header-actions">
          <button className="action-btn" onClick={startVideoCall}>
            <Video size={20} />
          </button>
          <button 
            className="action-btn" 
            onClick={() => alert("Phone call feature coming soon!")}
          >
            <Phone size={20} />
          </button>
          
          {/* Theme Selector Dropdown */}
          <div className="dropdown-container">
            <button className="action-btn" onClick={toggleMenu}>
              <EllipsisVertical size={20} />
            </button>
            {menuOpen && (
              <div className="theme-dropdown">
                <div className="dropdown-header">
                  <h6>Chat Theme</h6>
                  <button 
                    className="close-btn" 
                    onClick={toggleMenu}
                    aria-label="Close theme picker"
                  >
                    ×
                  </button>
                </div>
                <div className="dropdown-divider" />
                <div className="theme-options">
                  {THEMES.map(theme => (
                    <button
                      key={theme.class}
                      className={`theme-option ${activeTheme.class === theme.class ? 'active' : ''}`}
                      onClick={() => {
                        setActiveTheme(theme);
                        setMenuOpen(false);
                      }}
                    >
                      {theme.name}
                      {activeTheme.class === theme.class && (   
                        <span className="checkmark">✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Messages Container */}
        <div className="messages-container">
        {messages[activeChat.id]?.length > 0 ? (
          messages[activeChat.id].map((msg) => (
            <div 
              key={msg.id} 
              className={`message-container ${msg.sender === (auth.currentUser?.uid || 'me') ? 'sent' : 'received'}`}
            >
              <div className="message-bubble">
                {msg.type === 'image' ? (
                  <div className="media-message">
                    <img 
                      src={msg.content} 
                      alt="Sent content" 
                      className="message-image"
                      onClick={() => window.open(msg.content, '_blank')}
                    />
                    <div className="message-footer">
                      <span className="timestamp">
                        {new Date(msg.timestamp?.toDate()).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {msg.sender === (auth.currentUser?.uid || 'me') && (
                        <span className="status-indicator">✓✓</span>
                      )}
                    </div>
                  </div>
                ) : msg.type === 'file' ? (
                  <div className="file-message-wrapper">
                    <a 
                      href={msg.content} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="file-message"
                    >
                      <div className="file-content">
                        <span className="file-icon">📄</span>
                        <div className="file-info">
                          <span className="file-name">{msg.fileName}</span>
                          <span className="file-size">Click to download</span>
                        </div>
                      </div>
                    </a>
                    <div className="message-footer">
                      <span className="timestamp">
                        {new Date(msg.timestamp?.toDate()).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {msg.sender === (auth.currentUser?.uid || 'me') && (
                        <span className="status-indicator">✓✓</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-message-wrapper">
                    <div className="text-content">
                      <p>{msg.text}</p>
                    </div>
                    <div className="message-footer">
                      <span className="timestamp">
                        {new Date(msg.timestamp?.toDate()).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                      {msg.sender === (auth.currentUser?.uid || 'me') && (
                        <span className="status-indicator">✓✓</span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="empty-messages">
            <p>Start your conversation with {activeChat.name}</p>
          </div>
        )}
        <div ref={messagesEndRef} />      </div>

        {/* Message Input */}
        <div className="message-input-area"style={{
            background: "linear-gradient(135deg,rgb(99, 61, 95),purple,white)",
          }}
          >
          <label className="attachment-btn">
            <Paperclip size={20} />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/*, .pdf, .doc, .docx, .txt"
            />
          </label>
          
          <input
            type="text"
            className="message-input"
            placeholder="Type a message..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
          />
          
          <button 
            className="send-btn"
            onClick={sendMessage}
            disabled={!message.trim() || uploading}
            aria-label="Send message"
          >
            {uploading ? (
              <div className="loading-spinner"></div>
            ) : (
              <Send size={20} />
            )}
          </button>
        </div>
      </div>
    ) : (
      <div className="empty-chat">
        <div className="empty-content">
          <h5>Select a chat to start messaging</h5>
          <p>Or start a new conversation</p>
        </div>
      </div>
    )}
  </div>

      {/* Video Call Modal */}
      {videoCallActive && (
        <div className="video-call-modal">
          <div className="video-container">
            <video ref={remoteVideoRef} autoPlay playsInline className="remote-video" />
            <video 
              ref={localVideoRef} 
              autoPlay 
              muted 
              playsInline 
              className="local-video"
            />
          </div>
          <div className="call-controls">
            <button className="end-call-btn" onClick={endVideoCall}>
              End Call
            </button>
          </div>
        </div>
      )}

      {/* Profile Edit Modal */}
      {editProfileOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h5>Update Profile Picture</h5>
              <button className="close-btn" onClick={() => setEditProfileOpen(false)}>
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="profile-preview">
                <img 
                  src={newProfilePicPreview || currentUserData.photoURL} 
                  alt="Profile preview" 
                  className="preview-image"
                />
              </div>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfilePicChange}
                className="file-input"
              />
              {uploadError && <div className="error-message">{uploadError}</div>}
              <div className="modal-actions">
                <button 
                  className="cancel-btn"
                  onClick={() => setEditProfileOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  className="save-btn"
                  onClick={updateUserProfile}
                  disabled={!newProfilePic || uploading}
                >
                  {uploading ? 'Uploading...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatApp;