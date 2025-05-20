// src/app/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageSquare, Edit3, XCircle, CheckCircle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input as UiInput } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from "@/hooks/use-toast";

import ChatMessageItem from '@/components/booking-room/chat-message-item';
import BookingDetailsForm from '@/components/booking-room/booking-details-form';

import {
  processUserMessage,
  submitBookingRequest,
  getInitialBotMessage,
  type ParsedBookingDetails,
} from './actions';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

export default function BookingRoomPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentBookingDetails, setCurrentBookingDetails] = useState<Partial<ParsedBookingDetails>>({});
  const [showBookingForm, setShowBookingForm] = useState(false);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      // The actual scrollable element within ScrollArea is usually the first child of Viewport
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const addMessage = useCallback((sender: 'user' | 'ai', text: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString() + Math.random(), sender, text, timestamp: new Date() }]);
  }, []);
  
  const fetchInitialMessageAndFocus = useCallback(async () => {
    setIsLoading(true);
    try {
      const initialMessage = await getInitialBotMessage();
      addMessage('ai', initialMessage);
    } catch (error) {
      addMessage('ai', "Sorry, I couldn't start our conversation. Please refresh.");
      console.error("Failed to get initial bot message", error);
      toast({ title: "Connection Error", description: "Could not fetch initial message.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [addMessage]);


  useEffect(() => {
    fetchInitialMessageAndFocus();
  }, [fetchInitialMessageAndFocus]);


  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;
    const text = userInput;
    addMessage('user', text);
    setUserInput('');
    setIsLoading(true);
    setShowBookingForm(false); // Hide form while processing new text

    try {
      const result = await processUserMessage(text, currentBookingDetails);
      if (result.error) {
        addMessage('ai', result.error);
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        addMessage('ai', result.aiMessage);
        setCurrentBookingDetails(result.updatedDetails);
        if (result.missingDetailsResponse.isComplete) {
          // Don't show form immediately, let AI message guide user
          // User can click an "Edit/Confirm" button later
        }
      }
    } catch (error) {
      const errorMsg = "An unexpected error occurred. Please try again.";
      addMessage('ai', errorMsg);
      toast({ title: "Processing Error", description: errorMsg, variant: "destructive" });
      console.error("Failed to process message", error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleConfirmBooking = async (detailsToConfirm: ParsedBookingDetails) => {
    setIsLoading(true);
    setShowBookingForm(false); 
    addMessage('ai', "Submitting your request with the provided details...");
    try {
      const result = await submitBookingRequest(detailsToConfirm);
      addMessage('ai', result.aiMessage);
      if (result.validityResponse.isValid) {
        toast({ title: "Success!", description: "Booking request submitted successfully." });
        setCurrentBookingDetails({}); 
        // Potentially add a "New Booking" button or reset chat
      } else {
        toast({ title: "Validation Failed", description: result.aiMessage, variant: "destructive" });
        setShowBookingForm(true); 
        setCurrentBookingDetails(detailsToConfirm); 
      }
    } catch (error) {
      const errorMsg = "An error occurred during submission. Please try again.";
      addMessage('ai', errorMsg);
      toast({ title: "Submission Error", description: errorMsg, variant: "destructive" });
      setShowBookingForm(true);
      setCurrentBookingDetails(detailsToConfirm);
      console.error("Failed to confirm booking", error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleEditDetails = () => {
    setShowBookingForm(true);
  };

  const handleStartOver = () => {
    setMessages([]);
    setCurrentBookingDetails({});
    setShowBookingForm(false);
    fetchInitialMessageAndFocus();
    toast({ title: "Chat Reset", description: "Starting a new booking conversation." });
  };

  return (
    <div className="flex flex-col items-center min-h-screen p-4 md:p-8 bg-background text-foreground">
      <Card className="w-full max-w-2xl shadow-2xl rounded-lg overflow-hidden border-primary/20">
        <CardHeader className="bg-card-foreground/5 border-b border-border">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-semibold flex items-center gap-2 text-primary">
              <MessageSquare size={28} /> BookingRoom Assistant
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleStartOver} title="Start Over">
              <RotateCcw size={20} />
            </Button>
          </div>
          <CardDescription className="text-foreground/70">
            Chat with our AI to book your room. Type your request below.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[50vh] md:h-[60vh] p-6" ref={scrollAreaRef}>
            {messages.map((msg) => (
              <ChatMessageItem key={msg.id} sender={msg.sender} text={msg.text} timestamp={msg.timestamp} />
            ))}
            {isLoading && messages.length > 0 && messages[messages.length-1].sender === 'user' && (
              <ChatMessageItem sender="ai" text="..." timestamp={new Date()} />
            )}
          </ScrollArea>
        </CardContent>

        <div className="border-t border-border p-4 bg-card-foreground/5">
          {Object.keys(currentBookingDetails).length > 0 && !showBookingForm && (
            <div className="mb-3 flex justify-center">
              <Button onClick={handleEditDetails} variant="outline" className="border-primary text-primary hover:bg-primary/10">
                <Edit3 size={16} className="mr-2" /> Review & Confirm Details
              </Button>
            </div>
          )}
          <div className="flex items-center gap-3">
            <UiInput
              ref={inputRef}
              type="text"
              placeholder="Type your booking request..."
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 text-base py-3 px-4 border-border focus:border-primary ring-offset-background focus:ring-ring focus-visible:ring-2"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !userInput.trim()}
              className="px-6 py-3 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
              aria-label="Send message"
            >
              {isLoading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
            </Button>
          </div>
        </div>
      </Card>

      {showBookingForm && Object.keys(currentBookingDetails).length > 0 && (
        <div className="w-full max-w-2xl mt-8">
          <BookingDetailsForm
            initialDetails={currentBookingDetails as ParsedBookingDetails}
            onSubmit={handleConfirmBooking}
            onCancel={() => setShowBookingForm(false)}
            isLoading={isLoading}
          />
        </div>
      )}
    </div>
  );
}
