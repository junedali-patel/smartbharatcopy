import { useState, useEffect } from 'react';
import { Platform, Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { Audio } from 'expo-av';

const useVoiceRecognition = () => {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  useEffect(() => {
    return () => {
      if (recording) {
        recording.stopAndUnloadAsync();
      }
    };
  }, [recording]);

  const requestMicrophonePermission = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      return status === 'granted';
    } catch (error) {
      console.error('Error requesting microphone permission:', error);
      return false;
    }
  };

  const startListening = async () => {
    try {
      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      // Start recording
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      setIsListening(true);
      setTranscript(''); // Clear previous transcript
      setError(null); // Clear any previous errors

    } catch (error) {
      console.error('Error starting recording:', error);
      setError('Failed to start recording. Please try again.');
      setIsListening(false);
    }
  };

  const stopListening = async () => {
    try {
      if (recording) {
        await recording.stopAndUnloadAsync();
        setRecording(null);
        
        // Here you would typically send the recording to a speech recognition service
        // For now, we'll just set a placeholder message
        setTranscript('Recording stopped. Processing...');
      }
      setIsListening(false);
    } catch (error) {
      console.error('Error stopping recording:', error);
      setError('Failed to stop recording. Please try again.');
    }
  };

  const speak = async (text: string) => {
    try {
      await Speech.speak(text, {
        language: 'hi-IN', // Hindi language code
        pitch: 1.0,
        rate: 0.9,
      });
    } catch (error) {
      console.error('Error speaking:', error);
      setError('Failed to speak the response. Please try again.');
    }
  };

  return {
    isListening,
    transcript,
    error,
    startListening,
    stopListening,
    speak,
  };
};

export default useVoiceRecognition; 