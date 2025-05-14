'use client';

import React from 'react';
import { Amplify } from 'aws-amplify';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import outputs from '@/amplify_outputs.json';

// Configure Amplify once at module load
Amplify.configure(outputs);

export function Providers({ children }: { children: React.ReactNode }) {
  return <Authenticator>{children}</Authenticator>;
}
