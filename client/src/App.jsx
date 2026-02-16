import React, { useState } from 'react';
import axios from 'axios';

// Default Credentials
const DEFAULT_USER = "admin";
const DEFAULT_PASS = "admin";

function App() {
  // TODO: This should be factored out into a proper authentication system. I intend to use a Layered Architecture, so the authentication logic should be in its own service and repository layers.
  // For now, this is just a simple stub to gate access to the main app.
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [credentials, setCredentials] = useState({ user: '', pass: '' });
  const [story, setStory] = useState('');
  const [aiResponse, setAiResponse] = useState('');

  const handleLogin = (e) => {
    e.preventDefault();
    if (credentials.user === DEFAULT_USER && credentials.pass === DEFAULT_PASS) {
      setIsLoggedIn(true);
    } else {
      alert("Invalid Credentials. Use admin/admin for testing.");
    }
  };

  const getAISuggestion = async () => {
    try {
      const res = await axios.post('/api/suggest', { storyText: story });
      setAiResponse(res.data.suggestion);
    } catch (error) {
      console.error('Error:', error);
      setAiResponse('Error: Unable to get AI suggestion. ' + (error.message || 'Unknown error'));
    }
  };

  if (!isLoggedIn) {
    return (
      <div style={{ padding: '50px' }}>
        <h2>Login</h2>
        <form onSubmit={handleLogin}>
          <input type="text" placeholder="User" onChange={e => setCredentials({...credentials, user: e.target.value})} /><br/>
          <input type="password" placeholder="Pass" onChange={e => setCredentials({...credentials, pass: e.target.value})} /><br/>
          <button type="submit">Login</button>
        </form>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px' }}>
      <h1>Novellier - Demo</h1>
      <textarea rows="10" cols="50" value={story} onChange={e => setStory(e.target.value)} placeholder="Start writing your story..." />
      <br />
      <button onClick={getAISuggestion}>Receive feedback from phi3</button>
      <div style={{ marginTop: '20px', padding: '10px' }}>
        <strong>phi3 Response:</strong>
        <p>{aiResponse || "Enter some text to get feedback. Give it up to 180 seconds. "}</p>
      </div>
    </div>
  );
}

export default App;