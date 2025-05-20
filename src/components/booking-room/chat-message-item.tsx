// src/components/booking-room/chat-message-item.tsx
"use client";

import type { FC } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bot, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ChatMessageItemProps {
  sender: 'user' | 'ai';
  text: string;
  timestamp: Date;
}

const ChatMessageItem: FC<ChatMessageItemProps> = ({ sender, text, timestamp }) => {
  const isUser = sender === 'user';

  return (
    <div className={cn("flex items-start gap-3 mb-4", isUser ? "justify-end" : "justify-start")}>
      {!isUser && (
        <Avatar className="w-8 h-8 border border-primary/20">
          <AvatarFallback className="bg-primary/10 text-primary">
            <Bot size={18} />
          </AvatarFallback>
        </Avatar>
      )}
      <Card 
        className={cn(
          "max-w-[75%] p-0 shadow-md", 
          isUser ? "bg-primary text-primary-foreground rounded-br-none" : "bg-secondary text-secondary-foreground rounded-bl-none"
        )}
      >
        <CardContent className="p-3">
          <p className="text-sm whitespace-pre-wrap">{text}</p>
          <p className={cn("text-xs mt-1", isUser ? "text-primary-foreground/70 text-right" : "text-muted-foreground/70 text-left")}>
            {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </CardContent>
      </Card>
      {isUser && (
         <Avatar className="w-8 h-8 border border-accent/20">
          <AvatarFallback className="bg-accent/30 text-accent-foreground">
            <User size={18} />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default ChatMessageItem;
