// src/app/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageSquare, Edit3, RotateCcw, LogOut, User as UserIcon } from 'lucide-react';
import type { User } from 'firebase/auth';
import { Button } from '@/components/ui/button';
import { Input as UiInput } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/hooks/use-toast";

import ChatMessageItem from '@/components/booking-room/chat-message-item';
import BookingDetailsForm from '@/components/booking-room/booking-details-form';

import AuthModal from '@/components/auth/auth-modal';
import { observeAuthState, signout } from '@/services/auth-service';
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
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = observeAuthState((user) => {
      setCurrentUser(user);
      if (user) {
        setIsAuthModalOpen(false); // Close auth modal if user is found
      }
    });
    return () => unsubscribe(); // Cleanup subscription on unmount
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
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
    if (messages.length === 0) { // Only fetch initial if no messages exist
        fetchInitialMessageAndFocus();
    }
  }, [fetchInitialMessageAndFocus, messages.length]);


  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;
    const text = userInput;
    addMessage('user', text);
    setUserInput('');
    setIsLoading(true);
    setShowBookingForm(false);

    try {
      const result = await processUserMessage(text, currentBookingDetails);
      if (result.error) {
        addMessage('ai', result.error);
        toast({ title: "Error", description: result.error, variant: "destructive" });
      } else {
        addMessage('ai', result.aiMessage);
        setCurrentBookingDetails(result.updatedDetails);
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
    fetchInitialMessageAndFocus(); // This will add the initial AI message
    toast({ title: "Chat Reset", description: "Starting a new booking conversation." });
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signout();
      setCurrentUser(null); // Explicitly set user to null
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      // Reset chat and booking details on logout
      setMessages([]);
      setCurrentBookingDetails({});
      setShowBookingForm(false);
      fetchInitialMessageAndFocus(); // Fetch new initial message for logged-out state
    } catch (error) {
      console.error("Logout failed", error);
      toast({ title: "Logout Error", description: "Failed to log out. Please try again.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarFallbackName = (email?: string | null, displayName?: string | null): string => {
    if (displayName) {
      const names = displayName.split(' ');
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return displayName.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return "U";
  }

  return (
    <div className="flex flex-col items-center min-h-screen p-4 md:p-8 bg-background text-foreground relative">
      <Card className="w-full max-w-2xl shadow-2xl rounded-lg overflow-hidden border-primary/20">
        <div className="flex justify-between items-center p-2 border-b border-border">
            <div className="flex items-center gap-2"> {/* Placeholder for potential brand/logo */}
                {/* <img src="/logo.png" alt="Logo" className="h-8 w-8" /> */}
                {/* <span className="font-semibold text-lg">My App</span> */}
            </div>
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={currentUser.photoURL || undefined} alt={currentUser.displayName || currentUser.email || 'User'} />
                      <AvatarFallback>
                        {getAvatarFallbackName(currentUser.email, currentUser.displayName) || <UserIcon size={20}/>}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {currentUser.displayName || "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {currentUser.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button variant="outline" onClick={() => setIsAuthModalOpen(true)} disabled={isLoading}>
                Login / Signup
              </Button>
            )}
        </div>

        <CardHeader className="bg-card-foreground/5">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-semibold flex items-center gap-2 text-primary">
              <MessageSquare size={28} /> BookingRoom Assistant
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={handleStartOver} title="Start Over" disabled={isLoading}>
              <RotateCcw size={20} />
            </Button>
          </div>
          <CardDescription className="text-foreground/70">
            Chat with our AI to book your room. Type your request below.
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          <ScrollArea className="h-[calc(50vh-40px)] md:h-[calc(60vh-40px)] p-6" ref={scrollAreaRef}> {/* Adjusted height */}
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
              <Button onClick={handleEditDetails} variant="outline" className="border-primary text-primary hover:bg-primary/10" disabled={isLoading}>
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
              onKeyPress={(e) => e.key === 'Enter' && !isLoading && handleSendMessage()}
              className="flex-1 text-base py-3 px-4 border-border focus:border-primary ring-offset-background focus:ring-ring focus-visible:ring-2"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !userInput.trim()}
              className="px-6 py-3 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
              aria-label="Send message"
            >
              {isLoading && messages.length > 0 && messages[messages.length-1].sender === 'user' ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
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

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)} 
      />
    </div>
  );
}
