import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: 'small' | 'medium' | 'large';
  color?: string;
  backgroundColor?: string;
  disabled?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
}

export const IconButton: React.FC<IconButtonProps> = ({
  icon,
  onPress,
  size = 'medium',
  color = '#6B7280',
  backgroundColor,
  disabled = false,
  haptic = true,
  style,
}) => {
  const handlePress = async () => {
    if (haptic) {
      await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onPress();
  };
  
  const iconSize = {
    small: 20,
    medium: 24,
    large: 28,
  }[size];
  
  const buttonSize = {
    small: 32,
    medium: 40,
    large: 48,
  }[size];
  
  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={disabled}
      activeOpacity={0.7}
      style={[
        styles.button,
        {
          width: buttonSize,
          height: buttonSize,
          backgroundColor: backgroundColor || 'transparent',
        },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons
        name={icon}
        size={iconSize}
        color={disabled ? '#D1D5DB' : color}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
  },
  
  disabled: {
    opacity: 0.5,
  },
});