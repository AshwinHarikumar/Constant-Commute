import { signOut as firebaseSignOut, getAuth } from 'firebase/auth'; // Import Firebase signOut
import React, { useEffect, useState } from 'react';
import AdminDashboard from './components/AdminDashboard';
import DriverDashboard from './components/DriverDashboard';
import Login from './components/Login';
import StudentDashboard from './components/StudentDashboard';
import { supabase } from './supabaseClient';

const App = () => {
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserAndRole = async (user) => {
      try {
        // Check if the user's profile exists in the profiles table
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error && error.code === 'PGRST116') {
          // If the profile doesn't exist, create a new one with the default role 'student'
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{ id: user.id, email: user.email, name: user.user_metadata.full_name || 'Google User', role: 'student' }]);

          if (insertError) {
            console.error('Failed to create default profile:', insertError.message);
            setRole(null);
          } else {
            console.log('Default profile created with role: student');
            setRole('student');
          }
        } else if (error) {
          console.error('Failed to fetch user role:', error.message);
          setRole(null);
        } else {
          setRole(data.role);
        }
      } catch (err) {
        console.error('Unexpected error while fetching user role:', err.message);
        setRole(null);
      }
    };

    const initializeUser = async () => {
      try {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) {
          console.error('Failed to fetch user:', error?.message || 'Auth session missing!');
          setUser(null);
          setRole(null);
          return;
        }

        setUser(user);
        fetchUserAndRole(user);
      } catch (err) {
        console.error('Unexpected error while initializing user:', err.message);
        setUser(null);
        setRole(null);
      }
    };

    initializeUser();

    const { subscription } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser(session.user);
        fetchUserAndRole(session.user);
      } else {
        setUser(null);
        setRole(null);
      }
    });

    return () => {
      subscription?.unsubscribe?.(); // Correctly access the unsubscribe method
    };
  }, []);

  const handleLogout = async () => {
    try {
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      // Sign out from Firebase (Google Sign-In)
      const auth = getAuth();
      await firebaseSignOut(auth);

      setUser(null);
      setRole(null);
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Logout failed:', error.message);
    }
  };

  if (!user) return <Login setRole={setRole} />;
  if (role === 'admin') return <AdminDashboard onLogout={handleLogout} />;
  if (role === 'driver') return <DriverDashboard onLogout={handleLogout} />;
  if (role === 'student') return <StudentDashboard onLogout={handleLogout} />;
  return null;
};

export default App;
