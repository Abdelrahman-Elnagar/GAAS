'use client';

import { useEffect, useState } from "react";
import { Amplify } from 'aws-amplify';
import { fetchUserAttributes } from 'aws-amplify/auth';
import { useAuthenticator } from "@aws-amplify/ui-react";
import outputs from '@/amplify_outputs.json';
import '../app.css';

Amplify.configure(outputs);

export default function ProfilePage() {
  const { user } = useAuthenticator();

  const [username, setUsername] = useState("Loading...");
  const [phone, setPhone] = useState("Loading...");
  const [email, setEmail] = useState("Loading...");

  useEffect(() => {
    const loadAttributes = async () => {
      try {
        const attributes = await fetchUserAttributes();
        console.log("Fetched user attributes:", attributes);

        setUsername(attributes.preferred_username ?? "N/A");
        setPhone(attributes.phone_number ?? "N/A");
        setEmail(attributes.email ?? "N/A");
      } catch (err) {
        console.error("Failed to fetch attributes", err);
        setUsername("N/A");
        setPhone("N/A");
        setEmail("N/A");
      }
    };

    if (user) {
      loadAttributes();
    }
  }, [user]);

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: '#f8f9fa'
    }}>
      <div
        style={{
          backgroundColor: '#fff',
          border: '3px solid #3b7f7f',
          borderRadius: '16px',
          padding: '2rem 2.5rem',
          maxWidth: '500px',
          width: '100%',
          boxShadow: '0 0 20px cyan',
          fontFamily: 'sans-serif',
          color: 'black'
        }}
      >
        <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', textAlign: 'center' }}>
          Your Profile Details
        </h2>

        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ margin: 0, fontWeight: 600 }}>Username</h4>
          <p style={{ marginTop: '4px' }}>{username}</p>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ margin: 0, fontWeight: 600 }}>Phone Number</h4>
          <p style={{ marginTop: '4px' }}>{phone}</p>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <h4 style={{ margin: 0, fontWeight: 600 }}>Email</h4>
          <p style={{ marginTop: '4px' }}>{email}</p>
        </div>

        <div style={{ textAlign: 'center' }}>
          <button
            className="btn-secondary"
            onClick={() => window.location.href = '/'}
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
