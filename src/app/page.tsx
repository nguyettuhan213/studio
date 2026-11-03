// src/app/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Send,
  Loader2,
  MessageSquare,
  Edit3,
  RotateCcw,
  LogOut,
  User as UserIcon,
  Sparkles,
  Layers,
} from "lucide-react";
import type { User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { Input as UiInput } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

import ChatMessageItem from "@/components/booking-room/chat-message-item";
import BookingDetailsForm from "@/components/booking-room/booking-details-form";

import AuthModal from "@/components/auth/auth-modal";
import { SidebarNavigation } from "@/components/navigation/sidebar";
import { observeAuthState, signout } from "@/services/auth-service";
import {
  processUserMessage,
  submitWorkflowRequest,
  getInitialBotMessage,
} from "./actions";
import { getWorkflowsAction } from "@/app/admin/actions";
import { validateExtractedValues } from "@/lib/workflow-utils";
import type { WorkflowConfig } from "@/types/workflow";

interface ChatMessage {
  id: string;
  sender: "user" | "ai";
  text: string;
  timestamp: Date;
}

export default function BookingRoomPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentBookingDetails, setCurrentBookingDetails] = useState<Record<string, any>>({});
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Dynamic workflows state
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [activeWorkflow, setActiveWorkflow] = useState<WorkflowConfig | null>(null);

  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const unsubscribe = observeAuthState((user) => {
      setCurrentUser(user);
      if (user) {
        setIsAuthModalOpen(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load configured workflows without forcing a default selection
  useEffect(() => {
    async function loadWorkflows() {
      try {
        const list = await getWorkflowsAction();
        setWorkflows(list);
      } catch (err) {
        console.error("Failed to load workflows:", err);
      }
    }
    loadWorkflows();
  }, []);

  const scrollToBottom = useCallback(() => {
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const addMessage = useCallback((sender: "user" | "ai", text: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString() + Math.random(),
        sender,
        text,
        timestamp: new Date(),
      },
    ]);
  }, []);

  const fetchInitialMessageAndFocus = useCallback(async () => {
    setIsLoading(true);
    try {
      const initialMessage = await getInitialBotMessage();
      addMessage("ai", initialMessage);
    } catch (error) {
      addMessage(
        "ai",
        "Xin lỗi, tôi không thể bắt đầu cuộc trò chuyện. Vui lòng làm mới trang."
      );
      console.error("Failed to get initial bot message", error);
      toast({
        title: "Lỗi Kết Nối",
        description: "Không thể tải tin nhắn ban đầu.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  }, [addMessage]);

  useEffect(() => {
    if (messages.length === 0) {
      fetchInitialMessageAndFocus();
    }
  }, [fetchInitialMessageAndFocus, messages.length]);

  const handleWorkflowChange = (newWorkflow: WorkflowConfig) => {
    if (activeWorkflow?.id === newWorkflow.id) return;
    setActiveWorkflow(newWorkflow);
    
    setShowBookingForm(true);
    addMessage(
      "ai",
      `Đã chuyển sang quy trình [${newWorkflow.name}]. Vui lòng cung cấp thông tin hoặc điền vào biểu mẫu bên cạnh.`
    );
    toast({
      title: "Đã chọn quy trình",
      description: `Đang thực hiện: ${newWorkflow.name}`,
    });
  };

  const handleSendMessage = async () => {
    if (!userInput.trim() || isLoading) return;
    const text = userInput;
    addMessage("user", text);
    setUserInput("");
    setIsLoading(true);

    try {
      const history = messages.slice(-6).map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      const result = await processUserMessage(
        text,
        currentBookingDetails,
        activeWorkflow?.id || null,
        history
      );

      if (result.error) {
        addMessage("ai", result.error);
        toast({
          title: "Lỗi",
          description: result.error,
          variant: "destructive",
        });
      } else {
        addMessage("ai", result.aiMessage);

        if (result.isWorkflowIdentified && result.workflowId) {
          const matched = workflows.find((w) => w.id === result.workflowId);
          if (matched) {
            const isSwitch = Boolean(activeWorkflow && activeWorkflow.id !== matched.id);
            const isFirst = !activeWorkflow;

            setActiveWorkflow(matched);
            setCurrentBookingDetails(result.updatedDetails);
            setShowBookingForm(true);

            if (isSwitch) {
              toast({
                title: "Chuyển quy trình",
                description: `Đã tự động chuyển sang quy trình: ${matched.name}`,
              });
            } else if (isFirst) {
              toast({
                title: "Nhận diện quy trình",
                description: `Đã nhận diện quy trình: ${matched.name}`,
              });
            }
          }
        } else {
          // If no workflow was identified, remain in null state and do not show form
          if (!activeWorkflow) {
            setShowBookingForm(false);
            setCurrentBookingDetails({});
          }
        }
      }
    } catch (error) {
      const errorMsg = "Đã xảy ra lỗi không mong muốn. Vui lòng thử lại.";
      addMessage("ai", errorMsg);
      toast({
        title: "Lỗi Xử Lý",
        description: errorMsg,
        variant: "destructive",
      });
      console.error("Failed to process message", error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleValidationForm = (detailsToConfirm: Record<string, any>) => {
    if (!activeWorkflow) return false;

    const result = validateExtractedValues(activeWorkflow, detailsToConfirm);
    if (!result.isValid) {
      toast({
        title: "Lỗi xác thực",
        description: result.errors[0] || "Thông tin chưa hợp lệ. Vui lòng kiểm tra lại.",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const handleConfirmBooking = async (detailsToConfirm: Record<string, any>) => {
    if (!activeWorkflow) {
      toast({
        title: "Lỗi",
        description: "Chưa xác định quy trình để gửi yêu cầu.",
        variant: "destructive",
      });
      return;
    }

    const validated = handleValidationForm(detailsToConfirm);
    if (!validated) return;

    setIsLoading(true);
    setShowBookingForm(false);
    addMessage(
      "ai",
      `Đang gửi yêu cầu [${activeWorkflow.name}] với các chi tiết đã cung cấp...`
    );
    try {
      const result = await submitWorkflowRequest(
        activeWorkflow.id,
        detailsToConfirm
      );
      addMessage("ai", result.aiMessage);
      if (result.validityResponse.isValid) {
        toast({
          title: "Thành Công!",
          description: `Yêu cầu [${activeWorkflow.name}] đã được gửi thành công.`,
        });
        // Clear details and reset the form for the next request
        setCurrentBookingDetails({});
        setShowBookingForm(true);
      } else {
        toast({
          title: "Xác Thực Thất Bại",
          description: result.aiMessage,
          variant: "destructive",
        });
        setShowBookingForm(true);
        setCurrentBookingDetails(detailsToConfirm);
      }
    } catch (error) {
      const errorMsg = "Đã xảy ra lỗi trong quá trình gửi. Vui lòng thử lại.";
      addMessage("ai", errorMsg);
      toast({
        title: "Lỗi Gửi Yêu Cầu",
        description: errorMsg,
        variant: "destructive",
      });
      setShowBookingForm(true);
      setCurrentBookingDetails(detailsToConfirm);
      console.error("Failed to confirm request", error);
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleEditDetails = () => {
    if (activeWorkflow) {
      setShowBookingForm(true);
    }
  };

  const handleStartOver = () => {
    setMessages([]);
    setActiveWorkflow(null);
    setCurrentBookingDetails({});
    setShowBookingForm(false);
    fetchInitialMessageAndFocus();
    toast({
      title: "Đặt Lại Cuộc Trò Chuyện",
      description: "Bắt đầu cuộc trò chuyện mới.",
    });
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signout();
      setCurrentUser(null);
      toast({
        title: "Đã Đăng Xuất",
        description: "Bạn đã đăng xuất thành công.",
      });
      setMessages([]);
      setActiveWorkflow(null);
      setCurrentBookingDetails({});
      setShowBookingForm(false);
      fetchInitialMessageAndFocus();
    } catch (error) {
      console.error("Logout failed", error);
      toast({
        title: "Lỗi Đăng Xuất",
        description: "Không thể đăng xuất. Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarFallbackName = (
    email?: string | null,
    displayName?: string | null
  ): string => {
    if (displayName) {
      const names = displayName.split(" ");
      if (names.length > 1) {
        return `${names[0][0]}${names[names.length - 1][0]}`.toUpperCase();
      }
      return displayName.substring(0, 2).toUpperCase();
    }
    if (email) {
      return email.substring(0, 2).toUpperCase();
    }
    return (<UserIcon size={20} />) as any;
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground relative">
      <SidebarNavigation />
      <Card className="flex-grow flex flex-col max-w-2xl shadow-2xl rounded-lg overflow-hidden border-primary/20 mx-auto my-auto">
        <CardHeader className="bg-card-foreground/5 pb-4">
          <div className="flex justify-between items-center">
            <CardTitle className="text-2xl font-semibold flex items-center gap-2 text-primary">
              <MessageSquare size={26} /> Trợ lý AI Đa Quy trình
            </CardTitle>
            <div className="flex items-center gap-2">
              {!showBookingForm && activeWorkflow && (
                <Button
                  onClick={handleEditDetails}
                  variant="ghost"
                  size="icon"
                  title="Xem lại & Xác nhận Chi tiết"
                  disabled={isLoading}
                >
                  <Edit3 size={20} />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={handleStartOver}
                title="Bắt đầu lại"
                disabled={isLoading}
              >
                <RotateCcw size={20} />
              </Button>
            </div>
          </div>

          {/* Workflow selector badge / dropdown - hidden until a workflow is identified */}
          {activeWorkflow && (
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/50 text-xs">
              <CardDescription className="text-foreground/70 flex items-center gap-1.5 font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Quy trình đã nhận diện:
              </CardDescription>

              <div className="flex items-center gap-1.5">
                <Layers className="h-3.5 w-3.5 text-muted-foreground" />
                <Select
                  value={activeWorkflow.id}
                  onValueChange={(val) => {
                    const selected = workflows.find((w) => w.id === val);
                    if (selected) {
                      handleWorkflowChange(selected);
                    }
                  }}
                >
                  <SelectTrigger className="h-7 text-xs font-medium px-2 bg-background border-primary/30">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {workflows.map((wf) => (
                      <SelectItem key={wf.id} value={wf.id} className="text-xs">
                        {wf.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea
            className="h-[calc(50vh-40px)] md:h-[calc(60vh-40px)] p-6"
            ref={scrollAreaRef}
          >
            {messages.map((msg) => (
              <ChatMessageItem
                key={msg.id}
                sender={msg.sender}
                text={msg.text}
                timestamp={msg.timestamp}
              />
            ))}
            {isLoading &&
              messages.length > 0 &&
              messages[messages.length - 1].sender === "user" && (
                <ChatMessageItem
                  sender="ai"
                  text="Đang nhận diện quy trình và trích xuất dữ liệu..."
                  timestamp={new Date()}
                />
              )}
          </ScrollArea>
        </CardContent>

        <div className="border-t border-border p-4 bg-card-foreground/5">
          <div className="flex items-center gap-3">
            <UiInput
              ref={inputRef}
              type="text"
              placeholder={
                activeWorkflow
                  ? `Nhập thông tin cho quy trình ${activeWorkflow.name.toLowerCase()}...`
                  : "Nhập yêu cầu của bạn (vd: đặt phòng, mượn thiết bị, hỗ trợ sự kiện...)..."
              }
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) =>
                e.key === "Enter" && !isLoading && handleSendMessage()
              }
              className="flex-1 text-base py-3 px-4 border-border focus:border-primary ring-offset-background focus:ring-ring focus-visible:ring-2"
              disabled={isLoading}
            />
            <Button
              onClick={handleSendMessage}
              disabled={isLoading || !userInput.trim()}
              className="px-6 py-3 text-base bg-primary hover:bg-primary/90 text-primary-foreground"
              aria-label="Gửi tin nhắn"
            >
              {isLoading &&
              messages.length > 0 &&
              messages[messages.length - 1].sender === "user" ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <Send size={20} />
              )}
            </Button>
          </div>
        </div>
      </Card>

      {activeWorkflow && showBookingForm && (
        <div className="flex flex-col max-w-2xl shadow-2xl rounded-lg overflow-hidden border-primary/20 mx-auto my-auto">
          <BookingDetailsForm
            initialDetails={currentBookingDetails}
            workflowConfig={activeWorkflow}
            onSubmit={handleConfirmBooking}
            onCancel={() => setShowBookingForm(false)}
            isLoading={isLoading}
          />
        </div>
      )}

      {/* User auth/avatar outside the card */}
      <div className="absolute top-4 right-4 z-10">
        {currentUser ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="relative h-10 w-10 rounded-full"
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={currentUser.photoURL || undefined}
                    alt={currentUser.displayName || currentUser.email || "User"}
                  />
                  <AvatarFallback>
                    {getAvatarFallbackName(
                      currentUser.email,
                      currentUser.displayName
                    )}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">
                    {currentUser.displayName || "Người dùng"}
                  </p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {currentUser.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Đăng xuất</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button
            variant="outline"
            onClick={() => setIsAuthModalOpen(true)}
            disabled={isLoading}
          >
            Đăng nhập / Đăng ký
          </Button>
        )}
      </div>
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </div>
  );
}
