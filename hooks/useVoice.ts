import { useState } from 'react';
import VoiceService from '../services/VoiceService';

export const useVoice = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const voiceService = VoiceService.getInstance();

  const processCommand = async (text: string) => {
    try {
      setIsProcessing(true);
      const response = await voiceService.processVoiceCommand(text);
      return response;
    } catch (error) {
      console.error('Error processing command:', error);
      setError('Failed to process command');
      return 'TYPE: error | RESPONSE: Sorry, I encountered an error processing your request.';
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    isProcessing,
    error,
    processCommand,
  };
}; 