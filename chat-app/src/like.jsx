<div className={`d-flex vh-100 w-100 ${activeChat ? 'chat-active' : ''}`}>
{/* Sidebar */}
<div className="d-flex flex-column mobile-view text-white p-4 sidebar" style={{ width: '300px' }}>
 {/* Show only on mobile and only in the contact list */}
  {!showChatBoard && (
  <div className="d-flex align-items-center mb-4 d-md-none">
      <img
      src={mee}
      alt="User profile"
      className="rounded-circle me-3"
      style={{ width: '50px', height: '50px' }}
      />
      <h5>Emmanuel</h5>
  </div>
  )}

  <div className="d-flex align-items-center mb-4 d-none d-md-flex">
  <img
      src={mee}
      alt="User profile"
      className="rounded-circle me-3"
      style={{ width: '50px', height: '50px' }}
  />
  <h5>Emmanuel</h5>
  </div>




 {/* Contacts List - Hidden on mobile when chat is open */}
  <div className={`contacts-list flex-grow-1 overflow-auto ${showChatBoard ? 'd-none d-md-block' : 'd-block'}`} id='bgg'>
  {/* Search Input */}
  <div className="p-2">
      <input type="text" className="form-control" placeholder="Search contacts..." />
  </div>

  <ul className="list-unstyled">
      {contacts.map((contact) => (
      <li
          key={contact.id}
          className="d-flex align-items-center p-3 hover-bg-secondary cursor-pointer"
          onClick={() => openChat(contact)}
      >
          <img
          src={contact.img}
          alt={contact.name}
          className="rounded-circle me-3"
          style={{ width: '40px', height: '40px' }}
          />
          <div>
          <h6 className="mb-0">{contact.name}</h6>
          <p className="text-muted mb-0">{contact.message}</p>
          </div>
      </li>
      ))}
  </ul>
  </div>

  



  {/* New Chat Button */}
  <button className="btn btn-success w-100 mt-3 d-flex align-items-center justify-content-center d-none d-md-block">
    <PlusCircle className="me-2" size={20} /> New Chat
  </button>
</div>

{/* Chat Window */}
{showChatBoard && (
  <div
      className="d-flex flex-column flex-grow-1 border width-section"
     
  >
      {activeChat ? (
      <>
          {/* Chat Header */}
          <div className="d-flex align-items-center justify-content-between p-3 bg-light border-bottom position-relative">
          {/* Back Button (only on mobile) */}
          <button
              className="btn btn-light d-lg-none me-2"
              onClick={() => setShowChatBoard(false)} // Hide chat window on mobile
          >
              ←
          </button>

          <div className="d-flex align-items-center">
              <img
              src={activeChat.img}
              alt="Chat header"
              className="rounded-circle me-3"
              style={{ width: '40px', height: '40px' }}
              />
              <h5 className="mb-0">{activeChat.name}</h5>
          </div>

          {/* Icons */}
          <div className="d-flex align-items-center" id="icons">
              <Video
              className="text-secondary cursor-pointer me-3"
              size={20}
              onClick={startVideoCall}
              style={{ cursor: 'pointer' }}
              />
              <Phone
              className="text-secondary cursor-pointer me-3"
              size={20}
              onClick={startPhoneCall}
              style={{ cursor: 'pointer' }}
              />
              <EllipsisVertical
              size={20}
              onClick={toggleMenu}
              style={{ cursor: 'pointer' }}
              />
          </div>
          </div>

          {/* Chat Messages Container */}
          <div className="flex-grow-1 overflow-auto mb-3 mt-2">
          {messages[activeChat?.id]?.map((msg, index) => (
              <div key={index} className={`p-2 ${msg.sender === 'me' ? 'text-end' : 'text-start'}`}>
              <span className="p-2 rounded bg-secondary text-white">{msg.text}</span>
              </div>
          ))}
          </div>

          {/* Message Input */}
          <div className="p-3 border-top d-flex align-items-center">
          <input id='input'
              type="text"
              className="form-control"
              placeholder="Type a message..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
          />
          <Paperclip className='paperclip' size={20}/>
          <button
              className="btn btn-success bt"
              onClick={sendMessage}
          >
              <SendHorizonal size={20} />
          </button>
          </div>
      </>
      ) : (
      <div className="d-flex align-items-center justify-content-center flex-grow-1 bg-light">
          <h5>Select a chat to start messaging</h5>
      </div>
      )}
  </div>
  )}

<input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={handleFileUpload} />
</div>