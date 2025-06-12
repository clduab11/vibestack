import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/atoms/Card';
import { IconButton } from '@/components/atoms/IconButton';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

export interface HabitCardProps {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  streak: number;
  frequency: 'daily' | 'weekly' | 'custom';
  completedToday: boolean;
  onPress: () => void;
  onComplete: () => void;
  onEdit?: () => void;
}

export const HabitCard: React.FC<HabitCardProps> = ({
  name,
  icon,
  color,
  streak,
  frequency,
  completedToday,
  onPress,
  onComplete,
  onEdit,
}) => {
  const handleComplete = async () => {
    await Haptics.notificationAsync(
      completedToday
        ? Haptics.NotificationFeedbackType.Warning
        : Haptics.NotificationFeedbackType.Success
    );
    onComplete();
  };

  const getFrequencyText = () => {
    switch (frequency) {
      case 'daily':
        return 'Daily';
      case 'weekly':
        return 'Weekly';
      default:
        return 'Custom';
    }
  };

  return (
    <Card
      variant="elevated"
      onPress={onPress}
      style={styles.card}
    >
      <View style={styles.header}>
        <View style={[styles.iconContainer, { backgroundColor: `${color}20` }]}>
          <Ionicons name={icon} size={24} color={color} />
        </View>
        
        <View style={styles.headerRight}>
          {onEdit && (
            <IconButton
              icon="ellipsis-horizontal"
              onPress={onEdit}
              size="small"
              color="#6B7280"
            />
          )}
        </View>
      </View>

      <Text style={styles.name}>{name}</Text>
      <Text style={styles.frequency}>{getFrequencyText()}</Text>

      <View style={styles.footer}>
        <View style={styles.streakContainer}>
          <Ionicons name="flame" size={16} color="#F59E0B" />
          <Text style={styles.streakText}>{streak} day streak</Text>
        </View>

        <TouchableOpacity
          onPress={handleComplete}
          activeOpacity={0.8}
          style={[
            styles.completeButton,
            completedToday && styles.completedButton,
          ]}
        >
          {completedToday ? (
            <Ionicons name="checkmark-circle" size={24} color="#10B981" />
          ) : (
            <View style={[styles.circle, { borderColor: color }]} />
          )}
        </TouchableOpacity>
      </View>

      {completedToday && (
        <LinearGradient
          colors={['#10B98100', '#10B98110']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.completedOverlay}
        />
      )}
    </Card>
  );
};

const styles = StyleSheet.create({
  card: {
    marginBottom: 12,
    overflow: 'hidden',
  },

  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },

  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  name: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },

  frequency: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 12,
  },

  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  streakContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  streakText: {
    fontSize: 14,
    color: '#F59E0B',
    marginLeft: 4,
    fontWeight: '500',
  },

  completeButton: {
    padding: 4,
  },

  completedButton: {
    opacity: 0.8,
  },

  circle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
  },

  completedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
});