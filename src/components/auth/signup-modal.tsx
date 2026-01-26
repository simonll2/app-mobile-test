import {ApiError, signUpUser} from '@/services/auth-service';
import {Icon} from '@/components/ui';
import React, {useEffect, useRef, useState} from 'react';
import {
  Alert,
  Animated,
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
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

interface SignUpModalProps {
  visible: boolean;
  onClose: () => void;
  onSignUpSuccess: () => void;
}

// Validation helpers
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password: string) => password.length >= 6;
const isValidCompanyCode = (code: string) => code.length === 6;

export const SignUpModal: React.FC<SignUpModalProps> = ({
  visible,
  onClose,
  onSignUpSuccess,
}) => {
  const [step, setStep] = useState(1);
  const [firstname, setFirstname] = useState('');
  const [lastname, setLastname] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifyPassword, setVerifyPassword] = useState('');
  const [companyCode, setCompanyCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showVerifyPassword, setShowVerifyPassword] = useState(false);

  // Refs
  const codeInputRef = useRef<TextInput>(null);

  // Animation
  const stepSlideAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0.333)).current;
  const modalSlideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(modalSlideAnim, {
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
        Animated.timing(modalSlideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, backdropAnim, modalSlideAnim]);

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: step / 3,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [step, progressAnim]);

  const animateToStep = (newStep: number) => {
    const direction = newStep > step ? -1 : 1;
    Animated.sequence([
      Animated.timing(stepSlideAnim, {
        toValue: direction * 50,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(stepSlideAnim, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    setStep(newStep);
  };

  const resetForm = () => {
    setFirstname('');
    setLastname('');
    setUsername('');
    setEmail('');
    setPassword('');
    setVerifyPassword('');
    setCompanyCode('');
    setStep(1);
    stepSlideAnim.setValue(0);
    progressAnim.setValue(0.333);
  };

  // Step 1 validation
  const isStep1Valid =
    firstname.trim().length >= 2 &&
    lastname.trim().length >= 2 &&
    username.trim().length >= 3;

  // Step 2 validation
  const isStep2Valid =
    isValidEmail(email) &&
    isValidPassword(password) &&
    password === verifyPassword;

  // Step 3 validation
  const isStep3Valid = isValidCompanyCode(companyCode);

  const handleNextStep = () => {
    if (step === 1 && isStep1Valid) {
      animateToStep(2);
    } else if (step === 2 && isStep2Valid) {
      animateToStep(3);
    }
  };

  const handlePreviousStep = () => {
    if (step > 1) {
      animateToStep(step - 1);
    }
  };

  const handleSignUp = async () => {
    if (!isStep3Valid) {
      return;
    }

    Keyboard.dismiss();
    setIsLoading(true);

    try {
      await signUpUser({
        username,
        email,
        password,
        firstname,
        lastname,
        company_code: companyCode.toUpperCase(),
      });

      Alert.alert(
        'Bienvenue !',
        'Votre compte a ete cree avec succes. Connectez-vous pour commencer votre aventure ecologique.',
        [
          {
            text: 'Se connecter',
            onPress: () => {
              resetForm();
              onClose();
              onSignUpSuccess();
            },
          },
        ],
      );
    } catch (error) {
      const apiError = error as ApiError;
      Alert.alert(
        'Oups !',
        apiError.message || 'Impossible de creer votre compte',
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    Keyboard.dismiss();
    resetForm();
    onClose();
  };

  const renderInput = (
    label: string,
    value: string,
    onChangeText: (text: string) => void,
    placeholder: string,
    options?: {
      icon?: string;
      keyboardType?: 'default' | 'email-address';
      autoCapitalize?: 'none' | 'words' | 'characters';
      secureTextEntry?: boolean;
      showToggle?: boolean;
      isVisible?: boolean;
      onToggleVisibility?: () => void;
      isValid?: boolean;
      maxLength?: number;
      hint?: string;
    },
  ) => {
    const {
      icon,
      keyboardType = 'default',
      autoCapitalize = 'none',
      secureTextEntry = false,
      showToggle = false,
      isVisible = true,
      onToggleVisibility,
      isValid,
      maxLength,
      hint,
    } = options || {};

    const showValidation = value.length > 0 && isValid !== undefined;

    return (
      <View style={styles.inputWrapper}>
        <Text style={styles.inputLabel}>{label}</Text>
        <View
          style={[
            styles.inputContainer,
            showValidation &&
              (isValid ? styles.inputValid : styles.inputInvalid),
          ]}>
          {icon && (
            <View style={styles.inputIcon}>
              <Icon name={icon} size={20} color="#888" />
            </View>
          )}
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor="#AAA"
            value={value}
            onChangeText={onChangeText}
            keyboardType={keyboardType}
            autoCapitalize={autoCapitalize}
            autoCorrect={false}
            secureTextEntry={secureTextEntry && !isVisible}
            maxLength={maxLength}
          />
          {showToggle && (
            <TouchableOpacity
              onPress={onToggleVisibility}
              style={styles.eyeButton}>
              <Icon
                name={isVisible ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color="#888"
              />
            </TouchableOpacity>
          )}
          {showValidation && (
            <Icon
              name={isValid ? 'checkmark-circle' : 'alert-circle'}
              size={20}
              color={isValid ? '#4CAF50' : '#FF5252'}
            />
          )}
        </View>
        {hint && <Text style={styles.inputHint}>{hint}</Text>}
      </View>
    );
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
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.overlay}>
        <Animated.View style={[styles.backdrop, {opacity: backdropAnim}]}>
          <Pressable style={StyleSheet.absoluteFill} onPress={handleClose} />
        </Animated.View>

        <Animated.View
          style={[
            styles.container,
            {transform: [{translateY: modalSlideAnim}]},
          ]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTop}>
              <View style={styles.headerTitleContainer}>
                <View style={styles.iconBadge}>
                  <Icon name="leaf" size={24} color="#FFF" />
                </View>
                <View>
                  <Text style={styles.headerTitle}>Rejoignez-nous</Text>
                  <Text style={styles.headerSubtitle}>Etape {step} sur 3</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={handleClose}
                style={styles.closeButton}>
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressContainer}>
              <View style={styles.progressBackground}>
                <Animated.View
                  style={[
                    styles.progressBar,
                    {
                      width: progressAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', '100%'],
                      }),
                    },
                  ]}
                />
              </View>
              <View style={styles.stepsLabels}>
                <Text
                  style={[
                    styles.stepLabel,
                    step >= 1 && styles.stepLabelActive,
                  ]}>
                  Identite
                </Text>
                <Text
                  style={[
                    styles.stepLabel,
                    step >= 2 && styles.stepLabelActive,
                  ]}>
                  Securite
                </Text>
                <Text
                  style={[
                    styles.stepLabel,
                    step >= 3 && styles.stepLabelActive,
                  ]}>
                  Entreprise
                </Text>
              </View>
            </View>
          </View>

          {/* Content */}
          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled">
            <Animated.View
              style={{transform: [{translateX: stepSlideAnim}]}}>
              {/* Step 1: Identity */}
              {step === 1 && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Qui etes-vous ?</Text>
                  <Text style={styles.stepDescription}>
                    Commencons par faire connaissance
                  </Text>

                  {renderInput('Prenom', firstname, setFirstname, 'Jean', {
                    icon: 'person-outline',
                    autoCapitalize: 'words',
                    isValid: firstname.trim().length >= 2,
                  })}

                  {renderInput('Nom', lastname, setLastname, 'Dupont', {
                    icon: 'person-outline',
                    autoCapitalize: 'words',
                    isValid: lastname.trim().length >= 2,
                  })}

                  {renderInput(
                    "Nom d'utilisateur",
                    username,
                    setUsername,
                    'jean_dupont',
                    {
                      icon: 'at-outline',
                      isValid: username.trim().length >= 3,
                      hint: 'Minimum 3 caracteres',
                    },
                  )}
                </View>
              )}

              {/* Step 2: Security */}
              {step === 2 && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Securisez votre compte</Text>
                  <Text style={styles.stepDescription}>
                    Choisissez un mot de passe robuste
                  </Text>

                  {renderInput(
                    'Email professionnel',
                    email,
                    setEmail,
                    'vous@entreprise.com',
                    {
                      icon: 'mail-outline',
                      keyboardType: 'email-address',
                      isValid: isValidEmail(email),
                    },
                  )}

                  {renderInput(
                    'Mot de passe',
                    password,
                    setPassword,
                    '••••••••',
                    {
                      icon: 'lock-closed-outline',
                      secureTextEntry: true,
                      showToggle: true,
                      isVisible: showPassword,
                      onToggleVisibility: () => setShowPassword(!showPassword),
                      isValid: isValidPassword(password),
                      hint: 'Minimum 6 caracteres',
                    },
                  )}

                  {renderInput(
                    'Confirmer le mot de passe',
                    verifyPassword,
                    setVerifyPassword,
                    '••••••••',
                    {
                      icon: 'lock-closed-outline',
                      secureTextEntry: true,
                      showToggle: true,
                      isVisible: showVerifyPassword,
                      onToggleVisibility: () =>
                        setShowVerifyPassword(!showVerifyPassword),
                      isValid:
                        verifyPassword.length > 0 &&
                        password === verifyPassword,
                    },
                  )}

                  {verifyPassword.length > 0 && password !== verifyPassword && (
                    <View style={styles.errorMessage}>
                      <Icon name="warning-outline" size={16} color="#FF5252" />
                      <Text style={styles.errorText}>
                        Les mots de passe ne correspondent pas
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Step 3: Company */}
              {step === 3 && (
                <View style={styles.stepContent}>
                  <Text style={styles.stepTitle}>Derniere etape !</Text>
                  <Text style={styles.stepDescription}>
                    Entrez le code de votre entreprise
                  </Text>

                  <View style={styles.codeSection}>
                    <Pressable
                      style={styles.codeBoxes}
                      onPress={() => codeInputRef.current?.focus()}>
                      {[0, 1, 2, 3, 4, 5].map(index => (
                        <View
                          key={index}
                          style={[
                            styles.codeBox,
                            companyCode[index] && styles.codeBoxFilled,
                            companyCode.length === index &&
                              styles.codeBoxActive,
                          ]}>
                          <Text
                            style={[
                              styles.codeBoxText,
                              companyCode[index] && styles.codeBoxTextFilled,
                            ]}>
                            {companyCode[index] || ''}
                          </Text>
                        </View>
                      ))}
                    </Pressable>

                    <TextInput
                      ref={codeInputRef}
                      style={styles.hiddenInput}
                      value={companyCode}
                      onChangeText={text =>
                        setCompanyCode(
                          text.toUpperCase().replace(/[^A-Z0-9]/g, ''),
                        )
                      }
                      maxLength={6}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      keyboardType="default"
                    />
                  </View>

                  {companyCode.length === 0 && (
                    <TouchableOpacity
                      style={styles.codeInputTouchable}
                      activeOpacity={0.7}
                      onPress={() => codeInputRef.current?.focus()}>
                      <Icon name="keypad-outline" size={18} color="#4CAF50" />
                      <Text style={styles.tapToType}>Appuyez pour saisir</Text>
                    </TouchableOpacity>
                  )}

                  {companyCode.length === 6 && (
                    <View style={styles.successBadge}>
                      <Icon name="checkmark-circle" size={18} color="#4CAF50" />
                      <Text style={styles.successText}>Code valide</Text>
                    </View>
                  )}

                  {companyCode.length > 0 && companyCode.length < 6 && (
                    <Text style={styles.codeHint}>
                      {6 - companyCode.length} caractere
                      {6 - companyCode.length > 1 ? 's' : ''} restant
                      {6 - companyCode.length > 1 ? 's' : ''}
                    </Text>
                  )}

                  <View style={styles.companyInfoCard}>
                    <View style={styles.companyInfoIcon}>
                      <Icon name="help-circle" size={24} color="#FFF" />
                    </View>
                    <View style={styles.companyInfoContent}>
                      <Text style={styles.companyInfoTitle}>
                        Ou trouver ce code ?
                      </Text>
                      <Text style={styles.companyInfoText}>
                        Votre employeur vous l'a communique par email ou lors de
                        votre integration.
                      </Text>
                    </View>
                  </View>

                  <View style={styles.termsCard}>
                    <Text style={styles.termsText}>
                      En continuant, vous acceptez nos{' '}
                      <Text style={styles.termsLink}>CGU</Text> et{' '}
                      <Text style={styles.termsLink}>
                        Politique de confidentialite
                      </Text>
                    </Text>
                  </View>
                </View>
              )}
            </Animated.View>
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            {step > 1 && (
              <TouchableOpacity
                style={styles.backButton}
                onPress={handlePreviousStep}
                activeOpacity={0.7}>
                <Icon name="arrow-back" size={20} color="#4CAF50" />
                <Text style={styles.backButtonText}>Retour</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                step === 1 && !isStep1Valid && styles.primaryButtonDisabled,
                step === 2 && !isStep2Valid && styles.primaryButtonDisabled,
                step === 3 &&
                  (!isStep3Valid || isLoading) &&
                  styles.primaryButtonDisabled,
                step === 1 && styles.primaryButtonFull,
              ]}
              onPress={step === 3 ? handleSignUp : handleNextStep}
              disabled={
                (step === 1 && !isStep1Valid) ||
                (step === 2 && !isStep2Valid) ||
                (step === 3 && (!isStep3Valid || isLoading))
              }
              activeOpacity={0.8}>
              {isLoading ? (
                <Text style={styles.primaryButtonText}>
                  Creation en cours...
                </Text>
              ) : (
                <>
                  <Text style={styles.primaryButtonText}>
                    {step === 3 ? 'Creer mon compte' : 'Continuer'}
                  </Text>
                  <Icon
                    name={step === 3 ? 'checkmark' : 'arrow-forward'}
                    size={20}
                    color="#FFF"
                  />
                </>
              )}
            </TouchableOpacity>
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
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
    maxHeight: '92%',
  },
  header: {
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1fa055',
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
  progressContainer: {
    gap: 8,
  },
  progressBackground: {
    height: 6,
    backgroundColor: '#E8F5E9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#4CAF50',
    borderRadius: 3,
  },
  stepsLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepLabel: {
    fontSize: 12,
    color: '#AAA',
    fontWeight: '500',
  },
  stepLabelActive: {
    color: '#4CAF50',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 8,
    maxHeight: 420,
  },
  stepContent: {
    paddingVertical: 16,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1A1A1A',
    marginBottom: 8,
  },
  stepDescription: {
    fontSize: 15,
    color: '#666',
    marginBottom: 24,
    lineHeight: 22,
  },
  inputWrapper: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F0F0F0',
    paddingHorizontal: 14,
    height: 52,
  },
  inputValid: {
    borderColor: '#C8E6C9',
    backgroundColor: '#FAFFF9',
  },
  inputInvalid: {
    borderColor: '#FFCDD2',
    backgroundColor: '#FFFAFA',
  },
  inputIcon: {
    marginRight: 10,
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
  inputHint: {
    fontSize: 12,
    color: '#888',
    marginTop: 6,
    marginLeft: 4,
  },
  errorMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  errorText: {
    fontSize: 13,
    color: '#FF5252',
  },
  codeSection: {
    alignItems: 'center',
    marginBottom: 16,
    position: 'relative',
  },
  codeBoxes: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  codeBox: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    borderWidth: 2,
    borderColor: '#E0E0E0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  codeBoxFilled: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  codeBoxActive: {
    borderColor: '#4CAF50',
    backgroundColor: '#FFF',
  },
  codeBoxText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#CCC',
  },
  codeBoxTextFilled: {
    color: '#2E7D32',
  },
  hiddenInput: {
    position: 'absolute',
    opacity: 0,
    width: '100%',
    height: 56,
  },
  codeInputTouchable: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#F0FFF0',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: '#C8E6C9',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  tapToType: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#E8F5E9',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignSelf: 'center',
    marginBottom: 20,
  },
  successText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
  },
  codeHint: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 20,
  },
  companyInfoCard: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 16,
    padding: 16,
    gap: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#EEEEEE',
  },
  companyInfoIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#4CAF50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  companyInfoContent: {
    flex: 1,
  },
  companyInfoTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  companyInfoText: {
    fontSize: 13,
    color: '#666',
    lineHeight: 19,
  },
  termsCard: {
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },
  termsText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
  },
  termsLink: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    paddingVertical: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    backgroundColor: '#FFF',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#4CAF50',
    gap: 6,
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4CAF50',
  },
  primaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4CAF50',
    paddingVertical: 16,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#4CAF50',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonFull: {
    flex: 1,
  },
  primaryButtonDisabled: {
    backgroundColor: '#C8E6C9',
    shadowOpacity: 0,
    elevation: 0,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFF',
  },
});
