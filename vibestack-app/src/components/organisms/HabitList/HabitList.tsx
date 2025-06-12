import React, { useCallback } from 'react';
import { View, Text, StyleSheet, RefreshControl, ActivityIndicator } from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { HabitCard } from '@/components/molecules/HabitCard';
import { Button } from '@/components/atoms/Button';
import { Ionicons } from '@expo/vector-icons';

export interface HabitData {
  id: string;
  name: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  streak: number;
  frequency: 'daily' | 'weekly' | 'custom';
  completedToday: boolean;
}

export interface HabitListProps {
  habits: HabitData[];
  isLoading?: boolean;
  isRefreshing?: boolean;
  onRefresh?: () => void;
  onHabitPress: (habitId: string) => void;
  onHabitComplete: (habitId: string) => void;
  onHabitEdit?: (habitId: string) => void;
  onCreateHabit?: () => void;
  emptyMessage?: string;
  ListHeaderComponent?: React.ReactElement;
  ListFooterComponent?: React.ReactElement;
}

export const HabitList: React.FC<HabitListProps> = ({
  habits,
  isLoading = false,
  isRefreshing = false,
  onRefresh,
  onHabitPress,
  onHabitComplete,
  onHabitEdit,
  onCreateHabit,
  emptyMessage = 'No habits yet. Create your first habit!',
  ListHeaderComponent,
  ListFooterComponent,
}) => {
  const renderItem = useCallback(
    ({ item }: { item: HabitData }) => (
      <HabitCard
        {...item}
        onPress={() => onHabitPress(item.id)}
        onComplete={() => onHabitComplete(item.id)}
        onEdit={onHabitEdit ? () => onHabitEdit(item.id) : undefined}
      />
    ),
    [onHabitPress, onHabitComplete, onHabitEdit]
  );

  const keyExtractor = useCallback((item: HabitData) => item.id, []);

  const renderEmptyComponent = () => {
    if (isLoading) {
      return (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#9333EA" />
          <Text style={styles.loadingText}>Loading habits...</Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyContainer}>
        <Ionicons name="calendar-outline" size={64} color="#D1D5DB" />
        <Text style={styles.emptyTitle}>No Habits Yet</Text>
        <Text style={styles.emptyMessage}>{emptyMessage}</Text>
        {onCreateHabit && (
          <Button
            onPress={onCreateHabit}
            variant="primary"
            size="medium"
            gradient
            style={styles.createButton}
          >
            Create First Habit
          </Button>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <FlashList
        data={habits}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={120}
        contentContainerStyle={styles.contentContainer}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor="#9333EA"
              colors={['#9333EA']}
            />
          ) : undefined
        }
        ListEmptyComponent={renderEmptyComponent}
        ListHeaderComponent={ListHeaderComponent}
        ListFooterComponent={ListFooterComponent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  contentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },

  centerContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#6B7280',
  },

  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 32,
  },

  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
    marginBottom: 8,
  },

  emptyMessage: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
  },

  createButton: {
    paddingHorizontal: 24,
  },

  separator: {
    height: 8,
  },
});