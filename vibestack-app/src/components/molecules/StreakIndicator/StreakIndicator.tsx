import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export interface StreakIndicatorProps {
  currentStreak: number;
  bestStreak: number;
  variant?: 'compact' | 'detailed';
  showBest?: boolean;
}

export const StreakIndicator: React.FC<StreakIndicatorProps> = ({
  currentStreak,
  bestStreak,
  variant = 'compact',
  showBest = true,
}) => {
  const isNewRecord = currentStreak >= bestStreak && currentStreak > 0;
  
  if (variant === 'compact') {
    return (
      <View style={styles.compactContainer}>
        <Ionicons
          name="flame"
          size={20}
          color={currentStreak > 0 ? '#F59E0B' : '#D1D5DB'}
        />
        <Text style={[
          styles.compactText,
          currentStreak === 0 && styles.inactiveText
        ]}>
          {currentStreak}
        </Text>
      </View>
    );
  }
  
  return (
    <LinearGradient
      colors={currentStreak > 0 ? ['#FEF3C7', '#FDE68A'] : ['#F3F4F6', '#E5E7EB']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.detailedContainer}
    >
      <View style={styles.streakSection}>
        <Ionicons
          name="flame"
          size={32}
          color={currentStreak > 0 ? '#F59E0B' : '#9CA3AF'}
        />
        <View style={styles.streakInfo}>
          <Text style={styles.streakLabel}>Current Streak</Text>
          <View style={styles.streakValueRow}>
            <Text style={[
              styles.streakValue,
              currentStreak === 0 && styles.inactiveValue
            ]}>
              {currentStreak}
            </Text>
            <Text style={styles.streakUnit}>
              {currentStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>
      </View>
      
      {showBest && (
        <View style={styles.divider} />
      )}
      
      {showBest && (
        <View style={styles.bestSection}>
          <Ionicons
            name="trophy"
            size={20}
            color={bestStreak > 0 ? '#6B7280' : '#D1D5DB'}
          />
          <Text style={styles.bestLabel}>Best: {bestStreak}</Text>
          {isNewRecord && (
            <View style={styles.newRecordBadge}>
              <Text style={styles.newRecordText}>NEW!</Text>
            </View>
          )}
        </View>
      )}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  // Compact variant
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  
  compactText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#F59E0B',
    marginLeft: 4,
  },
  
  // Detailed variant
  detailedContainer: {
    padding: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  streakSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  streakInfo: {
    marginLeft: 12,
  },
  
  streakLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 2,
  },
  
  streakValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  
  streakValue: {
    fontSize: 24,
    fontWeight: '700',
    color: '#F59E0B',
  },
  
  streakUnit: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 4,
  },
  
  divider: {
    width: 1,
    height: 40,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 16,
  },
  
  bestSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  
  bestLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 6,
    fontWeight: '500',
  },
  
  newRecordBadge: {
    backgroundColor: '#10B981',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  
  newRecordText: {
    fontSize: 10,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  
  // Inactive states
  inactiveText: {
    color: '#D1D5DB',
  },
  
  inactiveValue: {
    color: '#9CA3AF',
  },
});