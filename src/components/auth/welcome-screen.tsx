import React from 'react';
import {
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {Icon} from '@/components/ui';

interface WelcomeScreenProps {
  onLoginPress: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({
  onLoginPress,
}) => {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Arriere-plan avec degrade vert */}
      <View style={styles.backgroundGradient}>
        <View style={[styles.circle, styles.circle1]} />
        <View style={[styles.circle, styles.circle2]} />
        <View style={[styles.circle, styles.circle3]} />
      </View>

      {/* Contenu principal */}
      <View style={styles.content}>
        {/* Icone hero */}
        <View style={styles.heroIconContainer}>
          <Icon name="leaf" size={80} color="#FFFFFF" />
        </View>

        {/* Titre de l'application */}
        <Text style={styles.title}>Green Mobility Pass</Text>

        {/* Slogan */}
        <Text style={styles.tagline}>Vos trajets durables recompenses</Text>

        {/* Icones illustratives */}
        <View style={styles.iconsRow}>
          <View style={styles.iconBox}>
            <Icon name="bicycle" size={32} color="#4CAF50" />
          </View>
          <View style={styles.iconBox}>
            <Icon name="bus" size={32} color="#4CAF50" />
          </View>
          <View style={styles.iconBox}>
            <Icon name="train" size={32} color="#4CAF50" />
          </View>
          <View style={styles.iconBox}>
            <Icon name="walk" size={32} color="#4CAF50" />
          </View>
        </View>

        {/* Bouton d'action */}
        <View style={styles.buttonsContainer}>
          <TouchableOpacity
            style={styles.loginButton}
            onPress={onLoginPress}
            activeOpacity={0.8}>
            <Text style={styles.loginButtonText}>Se connecter</Text>
          </TouchableOpacity>
        </View>

        {/* Footer texte */}
        <Text style={styles.footerText}>
          Reduisez votre empreinte carbone et gagnez des points !
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1fa055',
  },
  backgroundGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#1fa055',
  },
  circle: {
    position: 'absolute',
    borderRadius: 1000,
    opacity: 0.1,
    backgroundColor: '#4CAF50',
  },
  circle1: {
    width: 300,
    height: 300,
    top: -100,
    right: -100,
  },
  circle2: {
    width: 200,
    height: 200,
    bottom: 100,
    left: -50,
  },
  circle3: {
    width: 150,
    height: 150,
    top: '50%',
    left: '50%',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 30,
    zIndex: 1,
  },
  heroIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 30,
    borderWidth: 3,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: 10,
    letterSpacing: 0.5,
  },
  tagline: {
    fontSize: 18,
    color: '#C8E6C9',
    textAlign: 'center',
    marginBottom: 40,
    fontWeight: '300',
  },
  iconsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 50,
    gap: 15,
  },
  iconBox: {
    width: 60,
    height: 60,
    borderRadius: 15,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  buttonsContainer: {
    width: '100%',
    gap: 15,
  },
  loginButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  loginButtonText: {
    color: '#1fa055',
    fontSize: 18,
    fontWeight: '700',
  },
  footerText: {
    marginTop: 30,
    color: '#C8E6C9',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '300',
  },
});