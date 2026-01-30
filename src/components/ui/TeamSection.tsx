/**
 * TeamSection Component
 * Handles team display, joining, creating, and leaving
 */

import React, {useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  Users,
  Trophy,
  Plus,
  X,
  Lock,
  Globe,
  LogOut,
  ChevronRight,
  Check,
  Copy,
} from 'lucide-react-native';

import {apiClient} from '@/api/client';
import {Team, TeamListItem} from '@/api/types';
import InfoCard from './InfoCard';
import InfoRow from './InfoRow';
import ActionButton from './ActionButton';

interface TeamSectionProps {
  team: Team | null;
  userId: number;
  onTeamChange: () => void;
}

export default function TeamSection({
  team,
  userId,
  onTeamChange,
}: TeamSectionProps): JSX.Element {
  const [modalVisible, setModalVisible] = useState(false);
  const [teams, setTeams] = useState<TeamListItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [creating, setCreating] = useState(false);

  // Join team state
  const [selectedTeam, setSelectedTeam] = useState<TeamListItem | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [showJoinInput, setShowJoinInput] = useState(false);

  // Create team state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamPublic, setNewTeamPublic] = useState(true);
  const [createdTeamCode, setCreatedTeamCode] = useState<string | null>(null);

  const fetchTeams = async () => {
    setLoading(true);
    try {
      const data = await apiClient.getAllTeams();
      setTeams(data);
    } catch (err) {
      console.error('Error fetching teams:', err);
    } finally {
      setLoading(false);
    }
  };

  const openModal = () => {
    setModalVisible(true);
    fetchTeams();
  };

  const closeModal = () => {
    setModalVisible(false);
    setSelectedTeam(null);
    setJoinCode('');
    setShowJoinInput(false);
    setShowCreateForm(false);
    setNewTeamName('');
    setNewTeamPublic(true);
    setCreatedTeamCode(null);
  };

  const handleTeamPress = (teamItem: TeamListItem) => {
    if (teamItem.is_public) {
      joinTeam(teamItem.id);
    } else {
      setSelectedTeam(teamItem);
      setShowJoinInput(true);
    }
  };

  const joinTeam = async (teamId: number, code?: string) => {
    setJoining(true);
    try {
      await apiClient.joinTeam(teamId, code);
      closeModal();
      onTeamChange();
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de rejoindre la team');
    } finally {
      setJoining(false);
    }
  };

  const handleJoinWithCode = () => {
    if (selectedTeam && joinCode.trim()) {
      joinTeam(selectedTeam.id, joinCode.trim());
    }
  };

  const handleLeaveTeam = () => {
    if (!team) {
      return;
    }

    Alert.alert(
      'Quitter la team',
      `Voulez-vous vraiment quitter "${team.name}" ?`,
      [
        {text: 'Annuler', style: 'cancel'},
        {
          text: 'Quitter',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await apiClient.leaveTeam(userId);
              onTeamChange();
            } catch (err: any) {
              Alert.alert('Erreur', err.message || 'Impossible de quitter');
            } finally {
              setLeaving(false);
            }
          },
        },
      ],
    );
  };

  const handleCreateTeam = async () => {
    if (!newTeamName.trim()) {
      return;
    }

    setCreating(true);
    try {
      const result = await apiClient.createTeam({
        name: newTeamName.trim(),
        is_public: newTeamPublic,
      });

      if (result.join_code) {
        setCreatedTeamCode(result.join_code);
      } else {
        closeModal();
        onTeamChange();
      }
    } catch (err: any) {
      Alert.alert('Erreur', err.message || 'Impossible de creer la team');
    } finally {
      setCreating(false);
    }
  };

  const handleCodeCreatedDone = () => {
    closeModal();
    onTeamChange();
  };

  const renderTeamItem = ({item}: {item: TeamListItem}) => (
    <TouchableOpacity
      style={styles.teamItem}
      onPress={() => handleTeamPress(item)}
      activeOpacity={0.7}>
      <View style={styles.teamItemLeft}>
        <View
          style={[
            styles.teamIcon,
            {backgroundColor: item.is_public ? '#E8F5E9' : '#FFF3E0'},
          ]}>
          {item.is_public ? (
            <Globe size={20} color="#2E7D32" />
          ) : (
            <Lock size={20} color="#FB8C00" />
          )}
        </View>
        <View style={styles.teamInfo}>
          <Text style={styles.teamName}>{item.name}</Text>
          <Text style={styles.teamScore}>{item.score_total} pts</Text>
        </View>
      </View>
      <ChevronRight size={20} color="#999" />
    </TouchableOpacity>
  );

  // If user has a team, show team info with leave button
  if (team) {
    return (
      <View>
        <InfoCard title="Mon Equipe" icon={<Users size={20} color="#2E7D32" />}>
          <InfoRow
            label="Nom"
            value={team.name}
            icon={<Users size={16} color="#999" />}
          />
          <InfoRow
            label="Score total"
            value={`${team.score_total} pts`}
            valueColor="#2E7D32"
            icon={<Trophy size={16} color="#999" />}
          />
          <InfoRow
            label="Type"
            value={team.is_public ? 'Publique' : 'Privee'}
            icon={
              team.is_public ? (
                <Globe size={16} color="#999" />
              ) : (
                <Lock size={16} color="#999" />
              )
            }
          />
          <View style={styles.leaveButton}>
            <ActionButton
              title="Quitter la team"
              onPress={handleLeaveTeam}
              variant="danger"
              loading={leaving}
              icon={<LogOut size={18} color="#E53935" />}
            />
          </View>
        </InfoCard>

        {/* Team code */}
        {team.join_code && (
          <View style={styles.teamCodeCard}>
            <View style={styles.teamCodeHeader}>
              <Lock size={16} color="#FB8C00" />
              <Text style={styles.teamCodeLabel}>Code d'invitation</Text>
            </View>
            <View style={styles.teamCodeContainer}>
              <Text style={styles.teamCodeText}>{team.join_code}</Text>
              <TouchableOpacity style={styles.teamCodeCopy}>
                <Copy size={18} color="#2E7D32" />
              </TouchableOpacity>
            </View>
            <Text style={styles.teamCodeHint}>
              Partagez ce code pour inviter des membres
            </Text>
          </View>
        )}
      </View>
    );
  }

  // If no team, show button to open modal
  return (
    <>
      <View style={styles.noTeamCard}>
        <View style={styles.noTeamContent}>
          <Users size={32} color="#999" />
          <Text style={styles.noTeamTitle}>Aucune equipe</Text>
          <Text style={styles.noTeamSubtitle}>
            Rejoignez ou creez une equipe pour participer aux classements
          </Text>
        </View>
        <ActionButton
          title="Trouver une equipe"
          onPress={openModal}
          variant="primary"
          icon={<Users size={18} color="#fff" />}
        />
      </View>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>
              {showCreateForm
                ? 'Creer une equipe'
                : showJoinInput
                ? 'Rejoindre'
                : 'Equipes'}
            </Text>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Created team success */}
          {createdTeamCode && (
            <View style={styles.successContainer}>
              <View style={styles.successIcon}>
                <Check size={40} color="#2E7D32" />
              </View>
              <Text style={styles.successTitle}>Equipe creee !</Text>
              <Text style={styles.successSubtitle}>
                Partagez ce code pour inviter des membres :
              </Text>
              <View style={styles.codeContainer}>
                <Text style={styles.codeText}>{createdTeamCode}</Text>
                <TouchableOpacity style={styles.copyButton}>
                  <Copy size={20} color="#2E7D32" />
                </TouchableOpacity>
              </View>
              <ActionButton
                title="Terminer"
                onPress={handleCodeCreatedDone}
                variant="primary"
                style={{marginTop: 24}}
              />
            </View>
          )}

          {/* Join with code form */}
          {showJoinInput && !createdTeamCode && (
            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>
                Entrez le code pour rejoindre "{selectedTeam?.name}"
              </Text>
              <TextInput
                style={styles.input}
                placeholder="Code d'invitation"
                value={joinCode}
                onChangeText={setJoinCode}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <View style={styles.formButtons}>
                <ActionButton
                  title="Annuler"
                  onPress={() => {
                    setShowJoinInput(false);
                    setSelectedTeam(null);
                    setJoinCode('');
                  }}
                  variant="outline"
                  style={{flex: 1}}
                />
                <ActionButton
                  title="Rejoindre"
                  onPress={handleJoinWithCode}
                  variant="primary"
                  loading={joining}
                  disabled={!joinCode.trim()}
                  style={{flex: 1}}
                />
              </View>
            </View>
          )}

          {/* Create team form */}
          {showCreateForm && !createdTeamCode && (
            <View style={styles.formContainer}>
              <Text style={styles.formLabel}>Nom de l'equipe</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex: Les Champions"
                value={newTeamName}
                onChangeText={setNewTeamName}
                autoCapitalize="words"
              />

              <Text style={[styles.formLabel, {marginTop: 16}]}>
                Visibilite
              </Text>
              <View style={styles.visibilityOptions}>
                <TouchableOpacity
                  style={[
                    styles.visibilityOption,
                    newTeamPublic && styles.visibilityOptionActive,
                  ]}
                  onPress={() => setNewTeamPublic(true)}>
                  <Globe size={20} color={newTeamPublic ? '#2E7D32' : '#999'} />
                  <Text
                    style={[
                      styles.visibilityText,
                      newTeamPublic && styles.visibilityTextActive,
                    ]}>
                    Publique
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.visibilityOption,
                    !newTeamPublic && styles.visibilityOptionActive,
                  ]}
                  onPress={() => setNewTeamPublic(false)}>
                  <Lock size={20} color={!newTeamPublic ? '#FB8C00' : '#999'} />
                  <Text
                    style={[
                      styles.visibilityText,
                      !newTeamPublic && styles.visibilityTextActive,
                    ]}>
                    Privee
                  </Text>
                </TouchableOpacity>
              </View>
              {!newTeamPublic && (
                <Text style={styles.privateHint}>
                  Un code d'invitation sera genere
                </Text>
              )}

              <View style={styles.formButtons}>
                <ActionButton
                  title="Annuler"
                  onPress={() => setShowCreateForm(false)}
                  variant="outline"
                  style={{flex: 1}}
                />
                <ActionButton
                  title="Creer"
                  onPress={handleCreateTeam}
                  variant="primary"
                  loading={creating}
                  disabled={!newTeamName.trim()}
                  style={{flex: 1}}
                />
              </View>
            </View>
          )}

          {/* Teams list */}
          {!showJoinInput && !showCreateForm && !createdTeamCode && (
            <>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color="#2E7D32" />
                </View>
              ) : (
                <FlatList
                  data={teams}
                  keyExtractor={item => item.id.toString()}
                  renderItem={renderTeamItem}
                  contentContainerStyle={styles.listContent}
                  ListEmptyComponent={
                    <View style={styles.emptyList}>
                      <Text style={styles.emptyText}>
                        Aucune equipe disponible
                      </Text>
                    </View>
                  }
                />
              )}

              <View style={styles.createButtonContainer}>
                <ActionButton
                  title="Creer une equipe"
                  onPress={() => setShowCreateForm(true)}
                  variant="secondary"
                  icon={<Plus size={20} color="#2E7D32" />}
                />
              </View>
            </>
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  noTeamCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginHorizontal: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  noTeamContent: {
    alignItems: 'center',
    marginBottom: 16,
  },
  noTeamTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: 12,
  },
  noTeamSubtitle: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginTop: 4,
  },
  leaveButton: {
    marginTop: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  closeButton: {
    padding: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 16,
  },
  teamItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  teamItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  teamIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  teamInfo: {
    marginLeft: 12,
    flex: 1,
  },
  teamName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  teamScore: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  emptyList: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  createButtonContainer: {
    padding: 16,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  formContainer: {
    padding: 20,
  },
  formLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
  },
  formButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  visibilityOptions: {
    flexDirection: 'row',
    gap: 12,
  },
  visibilityOption: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 14,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  visibilityOptionActive: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  visibilityText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#666',
  },
  visibilityTextActive: {
    color: '#2E7D32',
  },
  privateHint: {
    fontSize: 13,
    color: '#666',
    marginTop: 8,
    fontStyle: 'italic',
  },
  successContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  successSubtitle: {
    fontSize: 15,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    marginTop: 16,
    gap: 12,
  },
  codeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2E7D32',
    letterSpacing: 2,
  },
  copyButton: {
    padding: 8,
  },
  teamCodeCard: {
    backgroundColor: '#FFF8E1',
    marginHorizontal: 16,
    marginTop: -4,
    marginBottom: 12,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFE082',
  },
  teamCodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  teamCodeLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#FB8C00',
  },
  teamCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
  },
  teamCodeText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    letterSpacing: 2,
  },
  teamCodeCopy: {
    padding: 4,
  },
  teamCodeHint: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
});
