import React from 'react'
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { LinearGradient } from 'expo-linear-gradient'
import { useUserStore } from '../../stores/userStore'
import { useHabitStore } from '../../stores/habitStore'
import { useQuery } from '@tanstack/react-query'
import { db } from '../../services/supabase'

export default function HomeScreen() {
  const { user, profile } = useUserStore()
  const { activeHabit, streak, todayCheckin } = useHabitStore()
  
  // Fetch today's data
  const { data: habitData } = useQuery({
    queryKey: ['activeHabit', user?.id],
    queryFn: async () => {
      if (!user?.id) return null
      const { data } = await db.getActiveHabit(user.id)
      return data
    },
    enabled: !!user?.id,
  })

  const greeting = getGreeting()
  const userName = profile?.display_name || 'there'

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{greeting},</Text>
            <Text style={styles.userName}>{userName}! 👋</Text>
          </View>
          <View style={styles.streakContainer}>
            <Text style={styles.streakNumber}>{streak}</Text>
            <Text style={styles.streakLabel}>day streak</Text>
          </View>
        </View>

        {/* Today's Focus */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Today's Focus</Text>
          {activeHabit ? (
            <TouchableOpacity activeOpacity={0.8}>
              <LinearGradient
                colors={['#6366f1', '#8b5cf6']}
                style={styles.habitCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.habitHeader}>
                  <Text style={styles.habitIcon}>{activeHabit.habits?.icon}</Text>
                  <Text style={styles.habitName}>{activeHabit.habits?.name}</Text>
                </View>
                <Text style={styles.habitDescription}>
                  {activeHabit.habits?.description}
                </Text>
                {!todayCheckin ? (
                  <View style={styles.checkInButton}>
                    <Text style={styles.checkInButtonText}>Tap to Check In</Text>
                  </View>
                ) : (
                  <View style={styles.completedBadge}>
                    <Text style={styles.completedText}>✓ Completed Today</Text>
                  </View>
                )}
              </LinearGradient>
            </TouchableOpacity>
          ) : (
            <View style={styles.noHabitCard}>
              <Text style={styles.noHabitText}>
                Setting up your personalized habit...
              </Text>
            </View>
          )}
        </View>

        {/* Quick Stats */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Your Progress</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{streak}</Text>
              <Text style={styles.statLabel}>Current Streak</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>85%</Text>
              <Text style={styles.statLabel}>This Week</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>12</Text>
              <Text style={styles.statLabel}>Total Days</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Achievements</Text>
            </View>
          </View>
        </View>

        {/* Motivational Quote */}
        <View style={styles.quoteCard}>
          <Text style={styles.quoteText}>
            "The secret of getting ahead is getting started."
          </Text>
          <Text style={styles.quoteAuthor}>- Mark Twain</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  greeting: {
    fontSize: 18,
    color: '#6B7280',
    fontWeight: '500',
  },
  userName: {
    fontSize: 28,
    fontWeight: '800',
    color: '#111827',
    marginTop: 4,
  },
  streakContainer: {
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  streakNumber: {
    fontSize: 24,
    fontWeight: '800',
    color: '#F59E0B',
  },
  streakLabel: {
    fontSize: 12,
    color: '#92400E',
    fontWeight: '600',
  },
  section: {
    paddingHorizontal: 24,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 16,
  },
  habitCard: {
    padding: 24,
    borderRadius: 20,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 5,
  },
  habitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  habitIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  habitName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  habitDescription: {
    fontSize: 16,
    color: '#E0E7FF',
    lineHeight: 24,
    marginBottom: 20,
  },
  checkInButton: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  checkInButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#6366f1',
  },
  completedBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  completedText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  noHabitCard: {
    backgroundColor: '#F3F4F6',
    padding: 24,
    borderRadius: 20,
    alignItems: 'center',
  },
  noHabitText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -8,
  },
  statCard: {
    width: '50%',
    paddingHorizontal: 8,
    marginBottom: 16,
  },
  statValue: {
    fontSize: 32,
    fontWeight: '800',
    color: '#6366f1',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  quoteCard: {
    marginHorizontal: 24,
    marginTop: 32,
    padding: 24,
    backgroundColor: '#EDE9FE',
    borderRadius: 16,
  },
  quoteText: {
    fontSize: 18,
    fontStyle: 'italic',
    color: '#4C1D95',
    lineHeight: 28,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: '#6D28D9',
    fontWeight: '600',
    textAlign: 'right',
  },
})