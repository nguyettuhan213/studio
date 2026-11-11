// src/components/booking-room/booking-details-form.tsx
"use client";

import type { FC } from "react";
import React from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CheckCircle, Save, Info, ListFilter } from "lucide-react";
import type { FieldType } from "@/types/workflow";
import type { ApiWorkflow, ApiWorkflowField } from "@/types/api";
import { displayValue, type FieldValues } from "@/lib/field-store";

interface BookingDetailsFormProps {
  /** The shared field store (all workflows); only this workflow's fields are shown. */
  values: FieldValues;
  workflowConfig?: ApiWorkflow | null;
  /** Every edit is written straight to the shared store, so it survives chat turns and reopening. */
  onFieldChange: (name: string, value: string | number | undefined) => void;
  onSubmit: () => void;
  onCancel?: () => void;
  /** A request is in flight (shows "Đang gửi..."). */
  isLoading?: boolean;
  /** Read-only without loading text, e.g. while waiting for the post-submit Keep/Clear choice. */
  locked?: boolean;
}

const BookingDetailsForm: FC<BookingDetailsFormProps> = ({
  values,
  workflowConfig,
  onFieldChange,
  onSubmit,
  onCancel,
  isLoading,
  locked,
}) => {
  const disabled = isLoading || locked;
  const fields: ApiWorkflowField[] = workflowConfig?.fields || [];
  const layoutColumns = workflowConfig?.layout?.columns || 2;
  const submitText = workflowConfig?.layout?.submitButtonText || "Xác nhận & Gửi Yêu cầu";
  const cancelText = workflowConfig?.layout?.cancelButtonText || "Hủy";

  const handleFieldChange = (name: string, value: any, type?: FieldType) => {
    let finalValue = value;
    if (type === "number") {
      finalValue = value === "" || value === undefined ? undefined : Number(value);
    }
    onFieldChange(name, finalValue);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Card className="w-full shadow-xl border-primary/20">
      <CardHeader>
        <CardTitle className="text-xl flex items-center gap-2">
          <CheckCircle className="text-primary" /> Chi tiết{" "}
          {workflowConfig?.name ? `[${workflowConfig.name}]` : "Yêu cầu"}
        </CardTitle>
        <CardDescription>
          {workflowConfig?.description ||
            "Vui lòng kiểm tra và hoàn thiện các trường thông tin bên dưới trước khi xác nhận."}
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-6 max-h-[60vh] overflow-y-auto p-6">
          <div
            className={`grid grid-cols-1 ${
              layoutColumns === 2 ? "md:grid-cols-2" : "grid-cols-1"
            } gap-x-6 gap-y-5`}
          >
            {fields.map((field) => {
              const displaySettings = field.displaySettings || {};
              const component = displaySettings.component || "input";
              const colSpan = displaySettings.colSpan || (component === "textarea" ? 2 : 1);
              const isFullWidth = colSpan === 2 && layoutColumns === 2;
              const fieldOptions = field.resolvedOptions || displaySettings.options;
              const isSelect = field.type === "option" || component === "select";
              const label = field.label || field.displayName || field.name;
              const current = displayValue(values, field);
              const placeholder =
                displaySettings.placeholder ||
                field.placeholder ||
                (isSelect
                  ? `Chọn ${label.toLowerCase()}`
                  : `Nhập ${label.toLowerCase()}...`);

              return (
                <div
                  key={field.name}
                  className={isFullWidth ? "md:col-span-2 space-y-1" : "space-y-1"}
                >
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor={field.name}
                      className="text-sm font-medium text-foreground/80 flex items-center gap-1"
                    >
                      <span>{label}</span>
                      {field.required && (
                        <span className="text-red-500 font-bold">*</span>
                      )}
                    </Label>
                    <span className="text-[11px] text-muted-foreground font-normal flex items-center gap-1">
                      {field.type === "option" ? (
                        <>
                          <ListFilter className="h-3 w-3 text-amber-500" />
                          <span>Lựa chọn (option)</span>
                        </>
                      ) : field.type === "number" ? (
                        "Số (number)"
                      ) : (
                        "Văn bản (text)"
                      )}
                    </span>
                  </div>

                  {/* Field description helper text */}
                  {field.description && (
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Info className="h-3 w-3 shrink-0 text-muted-foreground/70" />
                      {field.description}
                    </p>
                  )}

                  {/* Dynamic field rendering */}
                  {component === "textarea" ? (
                    <Textarea
                      id={field.name}
                      name={field.name}
                      value={current?.toString() || ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value, field.type)
                      }
                      rows={3}
                      className="mt-1 bg-background/50 border-border focus:border-primary text-sm"
                      disabled={disabled}
                      placeholder={placeholder}
                    />
                  ) : isSelect && Array.isArray(fieldOptions) && fieldOptions.length > 0 ? (
                    <Select
                      value={current?.toString() || ""}
                      onValueChange={(val) =>
                        handleFieldChange(field.name, val, field.type)
                      }
                      disabled={disabled}
                    >
                      <SelectTrigger className="mt-1 bg-background/50 border-border focus:border-primary text-sm">
                        <SelectValue placeholder={placeholder} />
                      </SelectTrigger>
                      <SelectContent className="max-h-[250px]">
                        {fieldOptions.map((option) => (
                          <SelectItem key={option} value={option} className="text-sm">
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <UiInput
                      id={field.name}
                      name={field.name}
                      type={field.type === "number" ? "number" : "text"}
                      value={current ?? ""}
                      onChange={(e) =>
                        handleFieldChange(field.name, e.target.value, field.type)
                      }
                      className="mt-1 bg-background/50 border-border focus:border-primary text-sm"
                      disabled={disabled}
                      min={field.valueHandling?.min}
                      max={field.valueHandling?.max}
                      placeholder={placeholder}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end gap-3 pt-6 border-t border-border">
          {onCancel && (
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={disabled}
            >
              {cancelText}
            </Button>
          )}
          <Button
            type="submit"
            disabled={disabled}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {isLoading ? "Đang gửi..." : submitText}
            {!isLoading && <Save size={18} className="ml-2" />}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default BookingDetailsForm;
