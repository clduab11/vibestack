import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

export default function SocialScreen() {
  const challenges = [
    {
      id: 1,
      title: 'Morning Meditation Marathon',
      description: 'Complete 7 days of morning meditation',
      participants: 234,
      progress: 3,
      total: 7,
      reward: '500 points',
      icon: 'fitness-outline',
    },
    {
      id: 2,
      title: 'Hydration Hero',
      description: 'Drink 8 glasses of water daily for a week',
      participants: 189,
      progress: 5,
      total: 7,
      reward: '300 points',
      icon: 'water-outline',
    },
    {
      id: 3,
      title: 'Step Challenge',
      description: 'Walk 10,000 steps every day this week',
      participants: 456,
      progress: 2,
      total: 7,
      reward: '750 points',
      icon: 'walk-outline',
    },
  ];

  const leaderboard = [
    { rank: 1, name: 'Alex Chen', points: 2450, avatar: '🏆' },
    { rank: 2, name: 'Sarah Johnson', points: 2380, avatar: '🥈' },
    { rank: 3, name: 'Mike Davis', points: 2210, avatar: '🥉' },
    { rank: 4, name: 'You', points: 1890, avatar: '😊', isUser: true },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Social Challenges</Text>
        <TouchableOpacity style={styles.notificationButton}>
          <Ionicons name="notifications-outline" size={24} color="#666" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Leaderboard Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Weekly Leaderboard</Text>
          <View style={styles.leaderboardCard}>
            {leaderboard.map((player) => (
              <View 
                key={player.rank} 
                style={[
                  styles.leaderboardItem,
                  player.isUser && styles.userHighlight
                ]}
              >
                <View style={styles.rankInfo}>
                  <Text style={styles.rankNumber}>#{player.rank}</Text>
                  <Text style={styles.playerAvatar}>{player.avatar}</Text>
                  <Text style={[styles.playerName, player.isUser && styles.userName]}>
                    {player.name}
                  </Text>
                </View>
                <Text style={[styles.playerPoints, player.isUser && styles.userPoints]}>
                  {player.points.toLocaleString()} pts
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Active Challenges */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Challenges</Text>
          {challenges.map((challenge) => (
            <TouchableOpacity key={challenge.id} style={styles.challengeCard}>
              <View style={styles.challengeHeader}>
                <View style={styles.challengeIcon}>
                  <Ionicons name={challenge.icon} size={24} color="#6366f1" />
                </View>
                <View style={styles.challengeInfo}>
                  <Text style={styles.challengeTitle}>{challenge.title}</Text>
                  <Text style={styles.challengeDescription}>{challenge.description}</Text>
                </View>
              </View>

              <View style={styles.challengeStats}>
                <View style={styles.participantInfo}>
                  <Ionicons name="people-outline" size={16} color="#666" />
                  <Text style={styles.participantCount}>{challenge.participants} joined</Text>
                </View>
                <Text style={styles.rewardText}>{challenge.reward}</Text>
              </View>

              <View style={styles.progressSection}>
                <View style={styles.progressBar}>
                  <View 
                    style={[
                      styles.progressFill, 
                      { width: `${(challenge.progress / challenge.total) * 100}%` }
                    ]} 
                  />
                </View>
                <Text style={styles.progressText}>
                  {challenge.progress}/{challenge.total} days
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Create Challenge Button */}
        <TouchableOpacity style={styles.createButton}>
          <Ionicons name="add-circle-outline" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Create New Challenge</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1a1a1a',
  },
  notificationButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  leaderboardCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  leaderboardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  userHighlight: {
    backgroundColor: '#f0f0ff',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  rankInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#666',
    width: 30,
  },
  playerAvatar: {
    fontSize: 24,
    marginHorizontal: 12,
  },
  playerName: {
    fontSize: 16,
    color: '#1a1a1a',
  },
  userName: {
    fontWeight: 'bold',
    color: '#6366f1',
  },
  playerPoints: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  userPoints: {
    color: '#6366f1',
  },
  challengeCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  challengeHeader: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  challengeIcon: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: '#f0f0ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  challengeInfo: {
    flex: 1,
  },
  challengeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  challengeDescription: {
    fontSize: 14,
    color: '#666',
  },
  challengeStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  participantInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  participantCount: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
  },
  rewardText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#6366f1',
  },
  progressSection: {
    marginTop: 8,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#6366f1',
  },
  progressText: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  createButton: {
    flexDirection: 'row',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 24,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});