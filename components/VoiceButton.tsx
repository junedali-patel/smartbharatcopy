import React, { useState, useEffect } from 'react';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';
import VoiceService from '../services/VoiceService';

const VoiceButton = () => {
  const [isListening, setIsListening] = useState(false);
  const voiceService = VoiceService.getInstance();

  useEffect(() => {
    // Set up speech result callback
    voiceService.setOnSpeechResult((text: string) => {
      console.log('Speech result:', text);
      // Handle the speech result here
    });

    return () => {
      // Clean up
      voiceService.stopListening();
    };
  }, []);

  const toggleListening = async () => {
    if (isListening) {
      await voiceService.stopListening();
    } else {
      await voiceService.startListening();
    }
    setIsListening(!isListening);
  };

  return (
    <TouchableOpacity
      style={[styles.button, isListening && styles.listeningButton]}
      onPress={toggleListening}
    >
      <Text style={styles.buttonText}>
        {isListening ? 'Stop Listening' : 'Start Listening'}
      </Text>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    margin: 10,
  },
  listeningButton: {
    backgroundColor: '#FF3B30',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default VoiceButton; 