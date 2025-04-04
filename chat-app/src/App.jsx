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
  { name: 'Light', class: 'light-theme', gradient: 'linear-gradient(135deg, #f5f7fa, #c3cfe2)' },
  { name: 'Dark', class: 'dark-theme', gradient: 'linear-gradient(135deg, #1e1e1e, #3a3a3a)' },
  { name: 'Sunset', class: 'sunset-theme', gradient: 'linear-gradient(135deg, #ff9a9e, #fad0c4)' },
  { name: 'Ocean', class: 'ocean-theme', gradient: 'linear-gradient(135deg, #1d2b64, #f8cdda)' }
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
  const filteredContacts = users.filter(
    (user) =>
      user.id !== 'current-user' &&
      user.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Chat functions
  const toggleMenu = useCallback(() => setMenuOpen((prev) => !prev), []);
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
      setMessages((prev) => ({ ...prev, [activeChat.id]: messagesData }));
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

    // Check if the user is authenticated
    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to update your profile.');
      return;
    }

    try {
      // Create storage reference
      const storageRef = ref(storage, `profile-pictures/${user.uid}`);
      // Upload file
      const snapshot = await uploadBytes(storageRef, newProfilePic);
      // Get download URL
      const imageUrl = await getDownloadURL(snapshot.ref);

      // Update Firebase Authentication profile
      await updateProfile(user, { photoURL: imageUrl });

      // Update Firestore
      await updateDoc(doc(db, 'users', user.uid), { photoURL: imageUrl });

      // Update local state
      setCurrentUserData((prev) => ({
        ...prev,
        photoURL: imageUrl,
      }));
      setUsers((prevUsers) =>
        prevUsers.map((u) =>
          u.id === 'current-user' ? { ...u, img: imageUrl } : u
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
                <button className="action-btn" onClick={() => alert("Video call feature coming soon!")}>
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
                        {THEMES.map((theme) => (
                          <button
                            key={theme.class}
                            className={`theme-option ${
                              activeTheme.class === theme.class ? 'active' : ''
                            }`}
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
                    className={`message-container ${
                      msg.sender === (auth.currentUser?.uid || 'me') ? 'sent' : 'received'
                    }`}
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
              <div ref={messagesEndRef} />
            </div>
            {/* Message Input */}
            <div className="message-input-area" style={{
              background: "linear-gradient(to right,rgb(48, 19, 69),rgb(113, 102, 118))",
            }}>
              <label className="attachment-btn">
                <Paperclip size={20} />
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={() => {}}
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