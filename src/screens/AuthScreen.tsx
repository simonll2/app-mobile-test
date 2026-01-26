/**
 * Auth Screen - Welcome screen with login and signup modals
 */

import React, {useState} from 'react';
import {WelcomeScreen, LoginModal, SignUpModal} from '@/components/auth';

export default function AuthScreen(): JSX.Element {
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSignUpModal, setShowSignUpModal] = useState(false);

  const handleLoginPress = () => {
    setShowLoginModal(true);
  };

  const handleSignUpPress = () => {
    setShowSignUpModal(true);
  };

  const handleSignUpSuccess = () => {
    // After successful signup, open the login modal
    setShowLoginModal(true);
  };

  return (
    <>
      <WelcomeScreen
        onLoginPress={handleLoginPress}
        onSignUpPress={handleSignUpPress}
      />
      <LoginModal
        visible={showLoginModal}
        onClose={() => setShowLoginModal(false)}
      />
      <SignUpModal
        visible={showSignUpModal}
        onClose={() => setShowSignUpModal(false)}
        onSignUpSuccess={handleSignUpSuccess}
      />
    </>
  );
}
