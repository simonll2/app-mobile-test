/**
 * ProfileHeader Component
 * Displays user avatar, name, and role badge
 */

import React from 'react';
import {View, Text, StyleSheet} from 'react-native';
import {User, Shield, Crown, Briefcase} from 'lucide-react-native';

interface ProfileHeaderProps {
  firstname: string;
  lastname: string;
  username: string;
  role: string;
  email?: string;
  memberSince?: string;
}

const getRoleConfig = (role: string) => {
  switch (role) {
    case 'admin':
      return {
        label: 'Administrateur',
        color: '#E53935',
        bgColor: '#FFEBEE',
        Icon: Crown,
      };
    case 'manager':
      return {
        label: 'Manager',
        color: '#FB8C00',
        bgColor: '#FFF3E0',
        Icon: Briefcase,
      };
    default:
      return {
        label: 'Membre',
        color: '#2E7D32',
        bgColor: '#E8F5E9',
        Icon: Shield,
      };
  }
};

export default function ProfileHeader({
  firstname,
  lastname,
  username,
  role,
  email,
  memberSince,
}: ProfileHeaderProps): JSX.Element {
  const roleConfig = getRoleConfig(role);
  const initials = `${firstname.charAt(0)}${lastname.charAt(0)}`.toUpperCase();

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {initials || <User size={40} color="#fff" />}
          </Text>
        </View>
        <View style={styles.onlineIndicator} />
      </View>

      <Text style={styles.fullName}>
        {firstname} {lastname}
      </Text>
      <Text style={styles.username}>@{username}</Text>
      {email && <Text style={styles.email}>{email}</Text>}

      <View style={[styles.roleBadge, {backgroundColor: roleConfig.bgColor}]}>
        <roleConfig.Icon size={14} color={roleConfig.color} />
        <Text style={[styles.roleText, {color: roleConfig.color}]}>
          {roleConfig.label}
        </Text>
      </View>

      {memberSince && (
        <Text style={styles.memberSince}>
          Membre depuis le {formatDate(memberSince)}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2E7D32',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 4},
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  avatarText: {
    fontSize: 36,
    fontWeight: '700',
    color: '#fff',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: '#fff',
  },
  fullName: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  username: {
    fontSize: 16,
    color: '#666',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#888',
    marginBottom: 12,
  },
  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  roleText: {
    fontSize: 13,
    fontWeight: '600',
  },
  memberSince: {
    fontSize: 13,
    color: '#888',
    marginTop: 12,
  },
});
