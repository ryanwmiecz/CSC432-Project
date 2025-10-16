import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username && password) {
      onLogin();
      navigate('/');
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#2D3142] text-white">
      <div className="bg-[#4F5D75] p-8 rounded-lg">
        <h2 className="text-2xl font-bold mb-4 text-[#EF8354]">Login</h2>
        <div>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full p-2 mb-4 border border-[#BFC0C0] rounded text-[#2D3142]"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full p-2 mb-4 border border-[#BFC0C0] rounded text-[#2D3142]"
          />
          <button
            onClick={handleSubmit}
            className="bg-[#EF8354] text-white border-none py-2 px-4 rounded cursor-pointer w-full"
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;