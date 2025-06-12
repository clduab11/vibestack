import React from 'react';
import { View, StyleSheet, ViewStyle, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export interface CardProps {
  children: React.ReactNode;
  variant?: 'elevated' | 'outlined' | 'filled' | 'gradient';
  padding?: 'none' | 'small' | 'medium' | 'large';
  onPress?: () => void;
  disabled?: boolean;
  style?: ViewStyle;
  gradientColors?: string[];
}

export const Card: React.FC<CardProps> = ({
  children,
  variant = 'elevated',
  padding = 'medium',
  onPress,
  disabled = false,
  style,
  gradientColors = ['#F3E8FF', '#E9D5FF'],
}) => {
  const cardStyles = [
    styles.base,
    styles[variant],
    styles[`padding_${padding}`],
    disabled && styles.disabled,
    style,
  ];
  
  const content = variant === 'gradient' ? (
    <LinearGradient
      colors={gradientColors}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={[styles.gradient, styles[`padding_${padding}`]]}
    >
      {children}
    </LinearGradient>
  ) : (
    children
  );
  
  if (onPress) {
    return (
      <TouchableOpacity
        onPress={onPress}
        disabled={disabled}
        activeOpacity={0.8}
        style={cardStyles}
      >
        {content}
      </TouchableOpacity>
    );
  }
  
  return <View style={cardStyles}>{content}</View>;
};

const styles = StyleSheet.create({
  base: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  
  // Variants
  elevated: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  
  outlined: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  
  filled: {
    backgroundColor: '#F9FAFB',
  },
  
  gradient: {
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  
  // Padding
  padding_none: {
    padding: 0,
  },
  
  padding_small: {
    padding: 12,
  },
  
  padding_medium: {
    padding: 16,
  },
  
  padding_large: {
    padding: 24,
  },
  
  // States
  disabled: {
    opacity: 0.5,
  },
});