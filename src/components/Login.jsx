import React, { useState } from 'react';
import styled from 'styled-components';
import { supabase } from '../supabaseClient';

const Container = styled.div`
  display: flex;
  height: 98vh; /* Reduced height */
  background: #f4f4f9;
`;

const LeftSection = styled.div`
  width: 90%; /* Reduced width */
  background: url('https://scmsgroup.org/sset/wp-content/uploads/2024/02/sset-1.webp') center/cover no-repeat;

  @media (max-width: 768px) {
    display: none;
  }
`;

const RightSection = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 50%;
  padding: 30px; /* Reduced padding */
  background: #ffffff;

  @media (max-width: 768px) {
    width: 100%;
    padding: 15px; /* Reduced padding for smaller screens */
  }
`;

const Card = styled.div`
  background: #ffffff;
  padding: 30px; /* Reduced padding */
  border-radius: 10px; /* Slightly smaller border radius */
  box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.4);
  text-align: center;
  width: 100%;
  max-width: 350px; /* Reduced max width */
`;

const Logo = styled.h1`
  font-size: 2rem; /* Reduced font size */
  margin: 15px 0; /* Reduced margin */
  color: #4a47a3;
  font-weight: bold;
`;

const Button = styled.button`
  background: #4a47a3;
  color: #ffffff;
  border: none;
  padding: 10px; /* Reduced padding */
  width: 100%;
  border-radius: 6px; /* Slightly smaller border radius */
  font-size: 0.9rem; /* Reduced font size */
  font-weight: bold;
  cursor: pointer;
  transition: background 0.3s ease;
  margin-top: 10px; /* Reduced margin */

  &:hover {
    background: #3b388f;
  }

  &:disabled {
    background: #ccc;
    cursor: not-allowed;
  }
`;

const GoogleButton = styled(Button)`
  background: #db4437;
  margin-top: 8px; /* Reduced margin */

  &:hover {
    background: #c23321;
  }
`;

const Input = styled.input`
  width: 100%;
  padding: 10px; /* Reduced padding */
  margin: 8px 0; /* Reduced margin */
  border-radius: 6px; /* Slightly smaller border radius */
  border: 1px solid #ccc;
  font-size: 0.9rem; /* Reduced font size */
  box-sizing: border-box;

  &:focus {
    outline: none;
    border-color: #4a47a3;
    box-shadow: 0 0 4px rgba(74, 71, 163, 0.5);
  }
`;

const ErrorMessage = styled.p`
  color: #e74c3c;
  margin-top: 8px; /* Reduced margin */
  font-size: 0.8rem; /* Reduced font size */
`;

const LoginPage = ({ setRole }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSignup, setIsSignup] = useState(false); // Toggle between login and signup
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRoleInput] = useState('student'); // Default role to 'student'

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      // After Google login, insert/update profile with default role 'student'
      // Wait for user to be authenticated
      setTimeout(async () => {
        const { data: userData } = await supabase.auth.getUser();
        const user = userData?.user;
        if (user && user.id) {
          // Check if profile exists
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', user.id)
            .single();
          if (!profile) {
            // Insert new profile with role 'student'
            await supabase
              .from('profiles')
              .insert([{ id: user.id, email: user.email, name: user.user_metadata?.name || '', role: 'student' }]);
          }
        }
      }, 2000);

      setRole(null); // Reset role for selection
    } catch (error) {
      console.error('Google login failed:', error.message);
      setError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      setRole(null);
    } catch (error) {
      console.error('Login failed:', error.message);
      setError('Email login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      // Insert additional user data into the profiles table
      const userId = data.user?.id; // Get the user ID from the signup response
      if (!userId) throw new Error('User ID not found after signup.');

      if (!role) throw new Error('Role is required. Please select a role.');

      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{ id: userId, email, name, role }]);

      if (profileError) throw profileError;

      alert('Signup successful! Please log in.');
      setIsSignup(false); // Switch back to login
    } catch (error) {
      console.error('Signup failed:', error.message);
      setError(error.message || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container>
      <LeftSection />
      <RightSection>
        <Card>
          <Logo>🚍 Constant Commute</Logo>
          <p>{isSignup ? 'Sign up to get started' : 'Sign in to continue'}</p>
          {error && <ErrorMessage>{error}</ErrorMessage>}
          {isSignup ? (
            <form onSubmit={handleSignup}>
              <Input
                type="text"
                placeholder="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                type="text"
                placeholder="Role (e.g., driver or student)"
                value={role}
                onChange={(e) => setRoleInput(e.target.value)}
                required
              />
              {/* Optionally, you can hide the role input and use a hidden input instead:
              <input type="hidden" value="student" /> 
              */}
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Signing up...' : 'Sign Up'}
              </Button>
              <p>
                Already have an account?{' '}
                <a href="#" onClick={() => setIsSignup(false)}>
                  Log in
                </a>
              </p>
            </form>
          ) : (
            <form onSubmit={handleEmailLogin}>
              <Input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <Button type="submit" disabled={loading}>
                {loading ? 'Logging in...' : 'Login with Email'}
              </Button>
              <p>OR</p>
              <GoogleButton onClick={handleGoogleLogin} disabled={loading}>
                {loading ? 'Logging in...' : 'Login with Google'}
              </GoogleButton>
              <p>
                Don't have an account?{' '}
                <a href="#" onClick={() => setIsSignup(true)}>
                  Sign up
                </a>
              </p>
            </form>
          )}
        </Card>
      </RightSection>
    </Container>
  );
};

export default LoginPage;
