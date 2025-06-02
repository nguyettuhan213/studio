// src/components/booking-room/booking-details-form.tsx
"use client";

import type { FC } from "react";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input as UiInput } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { ParsedBookingDetails } from "@/app/actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Save } from "lucide-react";

interface BookingDetailsFormProps {
  initialDetails: ParsedBookingDetails;
  onSubmit: (details: ParsedBookingDetails) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

const BookingDetailsForm: FC<BookingDetailsFormProps> = ({
  initialDetails,
  onSubmit,
  onCancel,
  isLoading,
}) => {
  const [formData, setFormData] =
    useState<ParsedBookingDetails>(initialDetails);

  useEffect(() => {
    setFormData(initialDetails);
  }, [initialDetails]);

  const handleChange = (name: keyof ParsedBookingDetails, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [name]:
        name === "estimated_number_of_attendees"
          ? value === ""
            ? undefined
            : parseInt(value, 10)
          : value,
    }));
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      [name]:
        name === "estimated_number_of_attendees"
          ? value === ""
            ? undefined
            : parseInt(value, 10)
          : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const detailFields: Array<{
    key: keyof ParsedBookingDetails;
    label: string;
    type?: string;
    component?: "textarea" | "select";
    options?: string[];
    required?: boolean;
  }> = [
    { key: "room", label: "Phòng", required: true },
    { key: "date", label: "Ngày", type: "text", required: true },
    { key: "time", label: "Thời gian", required: true },
    { key: "purpose", label: "Mục đích Đặt phòng", component: "textarea" },
    {
      key: "estimated_number_of_attendees",
      label: "Số người dự kiến",
      type: "number",
    },
    {
      key: "special_requirements",
      label: "Yêu cầu Đặc biệt",
      component: "textarea",
    },
    { key: "target_email", label: "Email Nhận thông báo", type: "email" },
    { key: "cc_email", label: "Email CC (Tùy chọn)", type: "email" },
    { key: "requestorName", label: "Tên Người yêu cầu", required: true },
    {
      key: "requestorMail",
      label: "Email Người yêu cầu",
      type: "email",
      required: true,
    },
    { key: "requestorMSSV", label: "MSSV/ID Người yêu cầu", required: true },
    { key: "requestorRole", label: "Vai trò Người yêu cầu", required: true },
    {
      key: "requestorDept",
      label: "Khoa/Phòng ban Người yêu cầu",
      component: "select",
      options: [
        "Khoa Giáo dục Quốc phòng & An ninh",
        "Khoa Giáo dục Thể chất",
        "Khoa Lý luận Chính trị",
        "Trường Cơ khí",
        "Trường Công nghệ Thông tin và Truyền thông",
        "Trường Điện - Điện tử",
        "Trường Hoá và Khoa học sự sống",
        "Trường Vật liệu",
        "Trường Kinh tế",
        "Khoa Toán - Tin",
        "Khoa Vật lý Kỹ thuật",
        "Khoa Ngoại ngữ",
        "Khoa Khoa học và Công nghệ Giáo dục",
      ],
      required: true,
    },

    { key: "CLB", label: "Câu lạc bộ/Tổ chức", required: true },
  ];

  return (
    <Card className="w-full shadow-xl border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <CheckCircle className="text-primary" /> Chi tiết Đặt phòng
        </CardTitle>
        <CardDescription>
          Vui lòng xác minh thông tin dưới đây. Bạn có thể thay đổi nếu cần
          trước khi gửi.
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 max-h-[60vh] overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            {detailFields.map((field) => (
              <div
                key={field.key}
                className={
                  field.component === "textarea" ? "md:col-span-2" : ""
                }
              >
                <Label
                  htmlFor={field.key}
                  className="text-sm font-medium text-foreground/80"
                >
                  {field.label}{" "}
                  {field.required && (
                    <span className="text-red-500 ml-1">*</span>
                  )}
                </Label>
                {field.component === "textarea" ? (
                  <Textarea
                    id={field.key}
                    name={field.key}
                    value={formData[field.key]?.toString() || ""}
                    onChange={handleInputChange}
                    rows={3}
                    className="mt-1 bg-background/50 border-border focus:border-primary"
                    disabled={isLoading}
                  />
                ) : field.component === "select" ? (
                  <Select
                    value={formData[field.key]?.toString() || ""}
                    onValueChange={(value) => handleChange(field.key, value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="mt-1 bg-background/50 border-border focus:border-primary">
                      <SelectValue placeholder={`Chọn ${field.label}`} />
                    </SelectTrigger>
                    <SelectContent>
                      {field.options?.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                ) : (
                  <UiInput
                    id={field.key}
                    name={field.key}
                    type={field.type || "text"}
                    value={formData[field.key]?.toString() || ""}
                    onChange={handleInputChange}
                    className="mt-1 bg-background/50 border-border focus:border-primary"
                    disabled={isLoading}
                    min={field.type === "number" ? 1 : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-6 border-t border-border">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isLoading}
            >
              Hủy
            </Button>
          )}
          <Button
            type="submit"
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? "Đang gửi..." : "Xác nhận & Gửi Yêu cầu"}
            {!isLoading && <Save size={18} className="ml-2" />}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default BookingDetailsForm;
