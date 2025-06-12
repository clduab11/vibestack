import React, { useState } from 'react';
import {
  TextInput,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: keyof typeof Ionicons.glyphMap;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: ViewStyle;
  variant?: 'default' | 'filled' | 'outline';
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  hint,
  leftIcon,
  rightIcon,
  onRightIconPress,
  containerStyle,
  inputStyle,
  variant = 'default',
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const [isSecure, setIsSecure] = useState(secureTextEntry);
  
  const hasError = !!error;
  
  const inputContainerStyles = [
    styles.inputContainer,
    styles[`${variant}Container`],
    isFocused && styles.focused,
    hasError && styles.errorContainer,
  ];
  
  const inputStyles = [
    styles.input,
    leftIcon && styles.inputWithLeftIcon,
    (rightIcon || secureTextEntry) && styles.inputWithRightIcon,
    inputStyle,
  ];
  
  const handleRightIconPress = () => {
    if (secureTextEntry) {
      setIsSecure(!isSecure);
    } else if (onRightIconPress) {
      onRightIconPress();
    }
  };
  
  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}
      
      <View style={inputContainerStyles}>
        {leftIcon && (
          <Ionicons
            name={leftIcon}
            size={20}
            color={hasError ? '#EF4444' : isFocused ? '#9333EA' : '#6B7280'}
            style={styles.leftIcon}
          />
        )}
        
        <TextInput
          {...props}
          style={inputStyles}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isSecure}
        />
        
        {(rightIcon || secureTextEntry) && (
          <TouchableOpacity
            onPress={handleRightIconPress}
            style={styles.rightIconButton}
          >
            <Ionicons
              name={
                secureTextEntry
                  ? isSecure
                    ? 'eye-outline'
                    : 'eye-off-outline'
                  : rightIcon!
              }
              size={20}
              color={hasError ? '#EF4444' : '#6B7280'}
            />
          </TouchableOpacity>
        )}
      </View>
      
      {(error || hint) && (
        <Text style={[styles.helperText, hasError && styles.errorText]}>
          {error || hint}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#374151',
    marginBottom: 6,
  },
  
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    minHeight: 48,
  },
  
  // Variants
  defaultContainer: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  
  filledContainer: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  
  outlineContainer: {
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: 'transparent',
  },
  
  // States
  focused: {
    borderColor: '#9333EA',
  },
  
  errorContainer: {
    borderColor: '#EF4444',
  },
  
  // Input
  input: {
    flex: 1,
    fontSize: 16,
    color: '#111827',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  
  inputWithLeftIcon: {
    paddingLeft: 8,
  },
  
  inputWithRightIcon: {
    paddingRight: 8,
  },
  
  // Icons
  leftIcon: {
    marginLeft: 12,
  },
  
  rightIconButton: {
    padding: 12,
  },
  
  // Helper text
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  
  errorText: {
    color: '#EF4444',
  },
});