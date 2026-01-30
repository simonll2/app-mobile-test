/**
 * Auth Screen - Welcome screen with login and signup modals
 */

import React, {useState} from 'react';
import {WelcomeScreen, LoginModal} from '@/components/auth';

export default function AuthScreen(): JSX.Element {
  const [showLoginModal, setShowLoginModal] = useState(false);

  const handleLoginPress = () => {
    setShowLoginModal(true);
  };

  return (
    <>
      <WelcomeScreen
        onLoginPress={handleLoginPress}
      />
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
    </>
  );
}
