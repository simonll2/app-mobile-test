import {useAuth} from '@/context/AuthContext';
import {ApiError, loginUser, resetPassword, changePasswordWithCode} from '@/services/auth-service';
import {Icon} from '@/components/ui';
import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

const {height: SCREEN_HEIGHT} = Dimensions.get('window');

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

type ResetStep = 'email' | 'code';

export const LoginModal: React.FC<LoginModalProps> = ({visible, onClose}) => {
  const {setIsLoggedIn} = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Reset password states
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetStep, setResetStep] = useState<ResetStep>('email');
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  const isFormValid = email.trim().length > 0 && password.length >= 1;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 65,
          friction: 11,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropAnim, slideAnim]);

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setShowPassword(false);
  };

  const handleClose = () => {
    Keyboard.dismiss();
    resetForm();
    onClose();
  };

  const handleLogin = async () => {
    if (!isFormValid) {
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);

    try {
      await loginUser({username: email, password});
      setIsLoggedIn(true);
      resetForm();
      onClose();
    } catch (error) {
      const apiError = error as ApiError;
      Alert.alert('Oups !', apiError.message || 'Impossible de se connecter');
    } finally {
      setIsLoading(false);
    }
  };

  if (!visible) {
    return null;
  }

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={visible}
      onRequestClose={handleClose}
      statusBarTranslucent>
      <View style={styles.overlay}>
        <Animated.View style={[styles.backdrop, {opacity: backdropAnim}]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[styles.container, {transform: [{translateY: slideAnim}]}]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <View style={styles.iconBadge}>
                <Icon name="person" size={24} color="#FFF" />
              </View>
              <View>
                <Text style={styles.headerTitle}>Bon retour !</Text>
                <Text style={styles.headerSubtitle}>
                  Connectez-vous a votre compte
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
              <Icon name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
            bounces={false}
            scrollEnabled={true}>
            {/* Email Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>
                Email ou nom d'utilisateur
              </Text>
              <View
                style={[
                  styles.inputContainer,
                  email.length > 0 &&
                    (isValidEmail(email)
                      ? styles.inputValid
                      : styles.inputNeutral),
                ]}>
                <View style={styles.inputIcon}>
                  <Icon name="mail-outline" size={20} color="#888" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="vous@entreprise.com"
                  placeholderTextColor="#AAA"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  autoComplete="email"
                />
                {email.length > 0 && isValidEmail(email) && (
                  <Icon name="checkmark-circle" size={20} color="#4CAF50" />
                )}
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputWrapper}>
              <Text style={styles.inputLabel}>Mot de passe</Text>
              <View
                style={[
                  styles.inputContainer,
                  password.length > 0 && styles.inputNeutral,
                ]}>
                <View style={styles.inputIcon}>
                  <Icon name="lock-closed-outline" size={20} color="#888" />
                </View>
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor="#AAA"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}>
                  <Icon
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color="#888"
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Forgot Password */}
            <TouchableOpacity 
              style={styles.forgotPassword}
              onPress={() => setShowResetModal(true)}>
              <Text style={styles.forgotPasswordText}>
                Mot de passe oublié ?
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.primaryButton,
                (!isFormValid || isLoading) && styles.primaryButtonDisabled,
              ]}
              onPress={handleLogin}
              disabled={!isFormValid || isLoading}
              activeOpacity={0.8}>
              {isLoading ? (
                <>
                  <Icon name="sync" size={20} color="#FFF" />
                  <Text style={styles.primaryButtonText}>Connexion...</Text>
                </>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>Se connecter</Text>
                  <Icon name="arrow-forward" size={20} color="#FFF" />
                </>
              )}
            </TouchableOpacity>
          </View>

      {/* Reset Password Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={showResetModal}
        onRequestClose={() => {
          setShowResetModal(false);
          setResetStep('email');
          setResetEmail('');
          setResetCode('');
          setNewPassword('');
          setConfirmPassword('');
        }}>
        <View style={styles.resetOverlay}>
          <View style={styles.resetContainer}>
            {/* Header */}
            <View style={styles.resetHeader}>
              <View style={styles.resetHeaderLeft}>
                {resetStep === 'code' && (
                  <TouchableOpacity 
                    onPress={() => setResetStep('email')}
                    style={styles.backButton}>
                    <Icon name="arrow-back" size={20} color="#666" />
                  </TouchableOpacity>
                )}
                <Text style={styles.resetTitle}>
                  {resetStep === 'email' ? 'Mot de passe oublié' : 'Nouveau mot de passe'}
                </Text>
              </View>
              <TouchableOpacity onPress={() => {
                setShowResetModal(false);
                setResetStep('email');
                setResetEmail('');
                setResetCode('');
                setNewPassword('');
                setConfirmPassword('');
              }}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={styles.resetScrollContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}>
              
              {/* Step 1: Email */}
              {resetStep === 'email' && (
                <View style={styles.resetContent}>
                  <View style={styles.stepIndicator}>
                    <View style={[styles.stepDot, styles.stepDotActive]} />
                    <View style={styles.stepLine} />
                    <View style={styles.stepDot} />
                  </View>
                  
                  <Text style={styles.resetSubtitle}>
                    Entre ton email pour recevoir un code temporaire
                  </Text>

                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Email</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        resetEmail.length > 0 &&
                          (isValidEmail(resetEmail)
                            ? styles.inputValid
                            : styles.inputNeutral),
                      ]}>
                      <Icon name="mail-outline" size={20} color="#888" />
                      <TextInput
                        style={styles.input}
                        placeholder="vous@entreprise.com"
                        placeholderTextColor="#AAA"
                        value={resetEmail}
                        onChangeText={setResetEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {resetEmail.length > 0 && isValidEmail(resetEmail) && (
                        <Icon name="checkmark-circle" size={20} color="#4CAF50" />
                      )}
                    </View>
                  </View>
                </View>
              )}

              {/* Step 2: Code + New Password */}
              {resetStep === 'code' && (
                <View style={styles.resetContent}>
                  <View style={styles.stepIndicator}>
                    <View style={[styles.stepDot, styles.stepDotCompleted]}>
                      <Icon name="checkmark" size={12} color="#FFF" />
                    </View>
                    <View style={[styles.stepLine, styles.stepLineActive]} />
                    <View style={[styles.stepDot, styles.stepDotActive]} />
                  </View>
                  
                  <Text style={styles.resetSubtitle}>
                    Entre le code reçu par email et ton nouveau mot de passe
                  </Text>

                  {/* Code Input */}
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Code temporaire</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        resetCode.length > 0 && styles.inputNeutral,
                      ]}>
                      <Icon name="key-outline" size={20} color="#888" />
                      <TextInput
                        style={styles.input}
                        placeholder="Code reçu par email"
                        placeholderTextColor="#AAA"
                        value={resetCode}
                        onChangeText={setResetCode}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {resetCode.length > 0 && (
                        <Icon name="checkmark-circle" size={20} color="#4CAF50" />
                      )}
                    </View>
                  </View>

                  {/* New Password Input */}
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Nouveau mot de passe</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        newPassword.length > 0 && 
                          (newPassword.length >= 6 ? styles.inputValid : styles.inputNeutral),
                      ]}>
                      <Icon name="lock-closed-outline" size={20} color="#888" />
                      <TextInput
                        style={styles.input}
                        placeholder="Minimum 6 caractères"
                        placeholderTextColor="#AAA"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry={!showNewPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowNewPassword(!showNewPassword)}
                        style={styles.eyeButton}>
                        <Icon
                          name={showNewPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="#888"
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Confirm Password Input */}
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputLabel}>Confirmer le mot de passe</Text>
                    <View
                      style={[
                        styles.inputContainer,
                        confirmPassword.length > 0 && 
                          (confirmPassword === newPassword && newPassword.length >= 6
                            ? styles.inputValid 
                            : styles.inputError),
                      ]}>
                      <Icon name="lock-closed-outline" size={20} color="#888" />
                      <TextInput
                        style={styles.input}
                        placeholder="Retape ton mot de passe"
                        placeholderTextColor="#AAA"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry={!showConfirmPassword}
                        autoCapitalize="none"
                      />
                      <TouchableOpacity
                        onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={styles.eyeButton}>
                        <Icon
                          name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                          size={20}
                          color="#888"
                        />
                      </TouchableOpacity>
                    </View>
                    {confirmPassword.length > 0 && confirmPassword !== newPassword && (
                      <Text style={styles.errorText}>Les mots de passe ne correspondent pas</Text>
                    )}
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.resetFooter}>
              <TouchableOpacity
                style={styles.resetCancelButton}
                onPress={() => {
                  setShowResetModal(false);
                  setResetStep('email');
                  setResetEmail('');
                  setResetCode('');
                  setNewPassword('');
                  setConfirmPassword('');
                }}
                disabled={resetLoading}>
                <Text style={styles.resetCancelButtonText}>Annuler</Text>
              </TouchableOpacity>

              {resetStep === 'email' ? (
                <TouchableOpacity
                  style={[
                    styles.resetSubmitButton,
                    (!isValidEmail(resetEmail) || resetLoading) &&
                      styles.resetSubmitButtonDisabled,
                  ]}
                  onPress={async () => {
                    setResetLoading(true);
                    Keyboard.dismiss();
                    try {
                      await resetPassword({email: resetEmail});
                      setResetStep('code');
                    } catch (error) {
                      const apiError = error as ApiError;
                      Alert.alert('Erreur', apiError.message || "Impossible d'envoyer le code");
                    } finally {
                      setResetLoading(false);
                    }
                  }}
                  disabled={!isValidEmail(resetEmail) || resetLoading}>
                  <Text style={styles.resetSubmitButtonText}>
                    {resetLoading ? 'Envoi...' : 'Recevoir le code'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.resetSubmitButton,
                    (resetCode.length === 0 || 
                     newPassword.length < 6 || 
                     confirmPassword !== newPassword ||
                     resetLoading) &&
                      styles.resetSubmitButtonDisabled,
                  ]}
                  onPress={async () => {
                    if (newPassword !== confirmPassword) {
                      Alert.alert('Erreur', 'Les mots de passe ne correspondent pas');
                      return;
                    }
                    setResetLoading(true);
                    Keyboard.dismiss();
                    try {
                      await changePasswordWithCode({
                        email: resetEmail,
                        temporary_password: resetCode,
                        new_password: newPassword,
                      });
                      Alert.alert(
                        'Succès ✓',
                        'Ton mot de passe a été modifié. Tu peux maintenant te connecter.',
                        [{
                          text: 'OK',
                          onPress: () => {
                            setShowResetModal(false);
                            setResetStep('email');
                            setResetEmail('');
                            setResetCode('');
                            setNewPassword('');
                            setConfirmPassword('');
                          }
                        }]
                      );
                    } catch (error) {
                      const apiError = error as ApiError;
                      Alert.alert('Erreur', apiError.message || 'Code invalide ou expiré');
                    } finally {
                      setResetLoading(false);
                    }
                  }}
                  disabled={
                    resetCode.length === 0 || 
                    newPassword.length < 6 || 
                    confirmPassword !== newPassword ||
                    resetLoading
                  }>
                  <Text style={styles.resetSubmitButtonText}>
                    {resetLoading ? 'Modification...' : 'Changer le mot de passe'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  container: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#888',
    marginTop: 2,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 24,
  },
  scrollContent: {
    paddingTop: 24,
    paddingBottom: 180,
  },
  inputWrapper: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    paddingHorizontal: 16,
    height: 56,
  },
  inputValid: {
    borderColor: '#C8E6C9',
    backgroundColor: '#FAFFF9',
  },
  inputNeutral: {
    borderColor: '#E0E0E0',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1A1A1A',
    paddingVertical: 0,
  },
  eyeButton: {
    padding: 4,
  },
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 24,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 18,
    borderRadius: 16,
    gap: 10,
  },
  primaryButtonDisabled: {
    backgroundColor: '#C8E6C9',
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#FFF',
  },
  resetOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resetContainer: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    width: '85%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  resetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  resetHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  backButton: {
    padding: 4,
  },
  resetTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  resetScrollContent: {
    maxHeight: 400,
  },
  resetContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  resetSubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    lineHeight: 20,
  },
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: '#4CAF50',
  },
  stepDotCompleted: {
    backgroundColor: '#4CAF50',
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: '#4CAF50',
  },
  inputError: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFF5F5',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginTop: 6,
  },
  resetFooter: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  resetCancelButton: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetCancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#666',
  },
  resetSubmitButton: {
    flex: 1,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetSubmitButtonDisabled: {
    backgroundColor: '#C8E6C9',
  },
  resetSubmitButtonText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
});
