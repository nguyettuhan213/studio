"use client";

import React, { useEffect, useState } from "react";
import {
  Sliders,
  Plus,
  Trash2,
  Edit,
  Save,
  RotateCcw,
  CheckCircle,
  AlertCircle,
  Layers,
  Hash,
  Type,
  Check,
  X,
  ChevronDown,
  ChevronUp,
  Settings,
  HelpCircle,
  ListFilter,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { SidebarNavigation } from "@/components/navigation/sidebar";
import {
  getWorkflowsAction,
  saveWorkflowAction,
  deleteWorkflowAction,
  resetWorkflowsAction,
  getFieldDefinitionsAction,
} from "@/app/admin/actions";
import {
  getAllPredefinedOptionKeys,
  isValidPredefinedOptionKey,
  getPredefinedOptions,
} from "@/config/predefined-options";
import type {
  WorkflowConfig,
  RawWorkflowConfig,
  WorkflowFieldConfig,
  FieldType,
  FieldComponentType,
  WorkflowLayoutConfig,
  FieldDefinitionsConfig,
} from "@/types/workflow";

export default function AdminWorkflowsPage() {
  const [workflows, setWorkflows] = useState<WorkflowConfig[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isNewWorkflow, setIsNewWorkflow] = useState(false);

  // Predefined options metadata
  const predefinedOptionList = getAllPredefinedOptionKeys();

  // Form state for editing/creating a workflow
  const [currentId, setCurrentId] = useState("");
  const [currentName, setCurrentName] = useState("");
  const [currentDescription, setCurrentDescription] = useState("");
  const [currentLayout, setCurrentLayout] = useState<WorkflowLayoutConfig>({
    columns: 2,
    submitButtonText: "Xác nhận & Gửi Yêu cầu",
    cancelButtonText: "Hủy bỏ",
  });
  const [currentFields, setCurrentFields] = useState<WorkflowFieldConfig[]>([]);
  const [expandedFieldIndices, setExpandedFieldIndices] = useState<Record<number, boolean>>({});
  const [isSaving, setIsSaving] = useState(false);

  const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinitionsConfig>({});

  const fetchWorkflows = async () => {
    setIsLoading(true);
    try {
      const [data, defs] = await Promise.all([
        getWorkflowsAction(),
        getFieldDefinitionsAction(),
      ]);
      setWorkflows(data);
      setFieldDefinitions(defs || {});
    } catch (error: any) {
      toast({
        title: "Lỗi tải dữ liệu",
        description: error.message || "Không thể tải danh sách quy trình.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleOpenCreate = () => {
    setIsNewWorkflow(true);
    setCurrentId("");
    setCurrentName("");
    setCurrentDescription("");
    setCurrentLayout({
      columns: 2,
      submitButtonText: "Xác nhận & Gửi Yêu cầu",
      cancelButtonText: "Hủy bỏ",
    });
    setCurrentFields([
      {
        name: "title",
        displayName: "Tiêu đề yêu cầu",
        description: "Mô tả vắn tắt yêu cầu",
        type: "text",
        required: true,
        displaySettings: {
          component: "input",
          colSpan: 1,
          placeholder: "Nhập tiêu đề...",
        },
      },
    ]);
    setExpandedFieldIndices({ 0: true });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (wf: WorkflowConfig) => {
    setIsNewWorkflow(false);
    setCurrentId(wf.id);
    setCurrentName(wf.name);
    setCurrentDescription(wf.description);
    setCurrentLayout({
      columns: wf.layout?.columns || 2,
      submitButtonText: wf.layout?.submitButtonText || "Xác nhận & Gửi Yêu cầu",
      cancelButtonText: wf.layout?.cancelButtonText || "Hủy bỏ",
    });
    setCurrentFields(JSON.parse(JSON.stringify(wf.fields)));
    setExpandedFieldIndices({});
    setIsDialogOpen(true);
  };

  const toggleExpandField = (index: number) => {
    setExpandedFieldIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  };

  const handleAddField = () => {
    const newIdx = currentFields.length;
    const availableDefKeys = Object.keys(fieldDefinitions);
    const defaultDefKey = availableDefKeys[0] || "";
    const sharedDef = defaultDefKey ? fieldDefinitions[defaultDefKey] : undefined;

    setCurrentFields((prev) => [
      ...prev,
      {
        name: defaultDefKey || `field_${Date.now().toString().slice(-4)}`,
        fieldDefinitionKey: defaultDefKey,
        displayName: sharedDef?.label || "Trường mới",
        description: sharedDef?.description || "",
        type: sharedDef?.type || "text",
        required: false,
        displaySettings: {
          component: sharedDef?.type === "option" ? "select" : "input",
          colSpan: 1,
          placeholder: sharedDef?.placeholder || "",
        },
      },
    ]);
    setExpandedFieldIndices((prev) => ({ ...prev, [newIdx]: true }));
  };

  const handleRemoveField = (index: number) => {
    if (currentFields.length <= 1) {
      toast({
        title: "Không thể xóa",
        description: "Mỗi quy trình phải có ít nhất 1 trường cấu hình.",
        variant: "destructive",
      });
      return;
    }
    setCurrentFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleFieldChange = (
    index: number,
    key: keyof WorkflowFieldConfig,
    value: any
  ) => {
    setCurrentFields((prev) => {
      const updated = [...prev];
      const target = { ...updated[index], [key]: value };

      // When fieldDefinitionKey changes, auto-populate shared metadata if available
      if (key === "fieldDefinitionKey" && value && fieldDefinitions[value]) {
        const shared = fieldDefinitions[value];
        if (!target.name || Object.keys(fieldDefinitions).includes(target.name)) {
          target.name = value;
        }
        target.displayName = shared.label;
        target.type = shared.type;
        target.displaySettings = {
          ...(target.displaySettings || {}),
          component: shared.type === "option" ? "select" : target.displaySettings?.component || "input",
          placeholder: shared.placeholder || "",
        };
      }

      // If switching to 'option', default to select component and first optionKey if not set
      if (key === "type" && value === "option") {
        if (!target.optionKey && predefinedOptionList.length > 0) {
          target.optionKey = predefinedOptionList[0].key;
        }
        target.displaySettings = {
          ...(target.displaySettings || {}),
          component: "select",
        };
      }

      updated[index] = target;
      return updated;
    });
  };

  const handleDisplaySettingsChange = (
    index: number,
    key: string,
    value: any
  ) => {
    setCurrentFields((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        displaySettings: {
          ...(updated[index].displaySettings || {}),
          [key]: value,
        },
      };
      return updated;
    });
  };

  const handleValueHandlingChange = (
    index: number,
    key: string,
    value: any
  ) => {
    setCurrentFields((prev) => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        valueHandling: {
          ...(updated[index].valueHandling || {}),
          [key]: value,
        },
      };
      return updated;
    });
  };

  const handleSaveWorkflow = async () => {
    if (!currentId.trim() || !currentName.trim()) {
      toast({
        title: "Thiếu thông tin",
        description: "Mã định danh (ID) và Tên quy trình không được để trống.",
        variant: "destructive",
      });
      return;
    }

    if (currentFields.length === 0) {
      toast({
        title: "Thiếu trường dữ liệu",
        description: "Quy trình phải có ít nhất 1 trường dữ liệu.",
        variant: "destructive",
      });
      return;
    }

    // Check for duplicate field names and validate option references
    const names = new Set<string>();
    for (const f of currentFields) {
      const trimmed = f.name.trim();
      const defKey = f.fieldDefinitionKey || f.name;
      const label = (f.label || f.displayName || fieldDefinitions[defKey]?.label || "").trim();
      if (!trimmed || !label) {
        toast({
          title: "Thông tin trường chưa hợp lệ",
          description: "Mọi trường phải có Tên định danh và Tên hiển thị.",
          variant: "destructive",
        });
        return;
      }
      if (names.has(trimmed)) {
        toast({
          title: "Trùng lặp tên trường",
          description: `Tên định danh "${trimmed}" bị trùng lặp.`,
          variant: "destructive",
        });
        return;
      }
      names.add(trimmed);

      if (f.type === "option") {
        if (!f.optionKey || !isValidPredefinedOptionKey(f.optionKey)) {
          toast({
            title: "Khóa tùy chọn không hợp lệ",
            description: `Trường "${label}" có kiểu "option" nhưng khóa tùy chọn "${f.optionKey || ""}" không hợp lệ.`,
            variant: "destructive",
          });
          return;
        }
      }
    }

    const workflowToSave: RawWorkflowConfig = {
      id: currentId.trim().toLowerCase().replace(/\s+/g, "_"),
      name: currentName.trim(),
      description: currentDescription.trim(),
      layout: currentLayout,
      fields: currentFields.map((f) => {
        const defKey = (f.fieldDefinitionKey || f.name).trim();
        const sharedDef = fieldDefinitions[defKey];
        const fieldLabel = (f.label || f.displayName || sharedDef?.label || f.name).trim();

        const cleaned: WorkflowFieldConfig = {
          name: f.name.trim(),
          fieldDefinitionKey: defKey,
          label: fieldLabel,
          displayName: fieldLabel,
          type: f.type || sharedDef?.type || "text",
          required: Boolean(f.required),
        };
        if (f.type === "option" && f.optionKey) {
          cleaned.optionKey = f.optionKey.trim();
        }
        if (f.description?.trim()) {
          cleaned.description = f.description.trim();
        }
        if (f.displaySettings) {
          cleaned.displaySettings = {
            component:
              f.type === "option"
                ? "select"
                : f.displaySettings.component || "input",
            colSpan: f.displaySettings.colSpan || 1,
            placeholder: f.displaySettings.placeholder || sharedDef?.placeholder || "",
            options: f.displaySettings.options || [],
          };
        }
        if (f.valueHandling) {
          cleaned.valueHandling = f.valueHandling;
        }
        return cleaned;
      }),
    };

    setIsSaving(true);
    try {
      const res = await saveWorkflowAction(workflowToSave, isNewWorkflow);
      if (res.success) {
        toast({
          title: "Thành công!",
          description: `Đã lưu cấu hình quy trình "${workflowToSave.name}".`,
        });
        setIsDialogOpen(false);
        fetchWorkflows();
      } else {
        toast({
          title: "Lỗi lưu quy trình",
          description: res.error || "Không thể lưu quy trình.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Đã xảy ra lỗi khi lưu.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteWorkflow = async (id: string, name: string) => {
    if (workflows.length <= 1) {
      toast({
        title: "Không thể xóa",
        description: "Hệ thống cần duy trì ít nhất một quy trình hoạt động.",
        variant: "destructive",
      });
      return;
    }

    if (!confirm(`Bạn có chắc chắn muốn xóa quy trình "${name}" (ID: ${id})?`)) {
      return;
    }

    try {
      const res = await deleteWorkflowAction(id);
      if (res.success) {
        toast({
          title: "Đã xóa quy trình",
          description: `Đã xóa quy trình "${name}".`,
        });
        fetchWorkflows();
      } else {
        toast({
          title: "Lỗi xóa quy trình",
          description: res.error || "Không thể xóa quy trình.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message || "Đã xảy ra lỗi khi xóa.",
        variant: "destructive",
      });
    }
  };

  const handleResetDefaults = async () => {
    if (
      !confirm(
        "Bạn có chắc muốn khôi phục danh sách quy trình về mặc định (Đặt phòng, Mượn thiết bị, Hỗ trợ sự kiện)?"
      )
    ) {
      return;
    }

    try {
      const res = await resetWorkflowsAction();
      if (res.success) {
        toast({
          title: "Đã khôi phục mặc định",
          description: "Các quy trình đã được đặt lại về cấu hình chuẩn.",
        });
        fetchWorkflows();
      } else {
        toast({
          title: "Lỗi khôi phục",
          description: res.error || "Không thể khôi phục mặc định.",
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Lỗi",
        description: err.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <SidebarNavigation />
      <div className="flex-1 max-w-6xl mx-auto p-6 md:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 text-primary">
              <Sliders className="h-8 w-8" /> Quản lý Cấu hình Quy trình
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              Cấu hình các loại quy trình (Workflow Types), bố cục giao diện (UI layout), các trường kiểu text, number và các trường tùy chọn tham chiếu hằng số (option).
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={handleResetDefaults}
              className="flex items-center gap-2"
              title="Khôi phục danh sách quy trình chuẩn"
            >
              <RotateCcw className="h-4 w-4" /> Mặc định
            </Button>
            <Button
              onClick={handleOpenCreate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
            >
              <Plus className="h-4 w-4" /> Thêm quy trình mới
            </Button>
          </div>
        </div>

        {/* Workflow List */}
        {isLoading ? (
          <div className="py-20 text-center text-muted-foreground">
            Đang tải cấu hình quy trình...
          </div>
        ) : workflows.length === 0 ? (
          <div className="py-20 text-center text-muted-foreground">
            Chưa có quy trình nào được cấu hình. Nhấp &ldquo;Thêm quy trình mới&rdquo; để bắt đầu.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {workflows.map((wf) => {
              const requiredCount = wf.fields.filter((f) => f.required).length;
              const optionalCount = wf.fields.length - requiredCount;
              return (
                <Card
                  key={wf.id}
                  className="shadow-md border-border/80 hover:border-primary/50 transition-colors"
                >
                  <CardHeader className="flex flex-row items-start justify-between pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-xl font-bold">
                          {wf.name}
                        </CardTitle>
                        <span className="text-xs bg-muted px-2.5 py-0.5 rounded-full font-mono text-muted-foreground">
                          ID: {wf.id}
                        </span>
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-medium">
                          Bố cục: {wf.layout?.columns || 2} cột
                        </span>
                      </div>
                      <CardDescription className="mt-1.5 text-sm">
                        {wf.description || "Chưa có mô tả."}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenEdit(wf)}
                        className="flex items-center gap-1.5"
                      >
                        <Edit className="h-4 w-4" /> Chỉnh sửa
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteWorkflow(wf.id, wf.name)}
                        className="text-destructive hover:bg-destructive/10"
                        title="Xóa quy trình"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-xs text-muted-foreground mb-3 flex items-center gap-4">
                      <span>
                        <strong>Tổng cộng:</strong> {wf.fields.length} trường
                      </span>
                      <span>
                        <strong>Bắt buộc:</strong> {requiredCount}
                      </span>
                      <span>
                        <strong>Tùy chọn:</strong> {optionalCount}
                      </span>
                      <span>
                        <strong>Nút gửi:</strong> {wf.layout?.submitButtonText || "Xác nhận & Gửi Yêu cầu"}
                      </span>
                    </div>

                    {/* Field Tags */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {wf.fields.map((f) => (
                        <div
                          key={f.name}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs bg-card-foreground/5"
                        >
                          {f.type === "number" ? (
                            <Hash className="h-3 w-3 text-blue-500" />
                          ) : f.type === "option" ? (
                            <ListFilter className="h-3 w-3 text-amber-500" />
                          ) : (
                            <Type className="h-3 w-3 text-green-500" />
                          )}
                          <span className="font-medium">{f.displayName}</span>
                          <span className="text-muted-foreground font-mono text-[10px]">
                            ({f.name})
                          </span>
                          {f.type === "option" && f.optionKey && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1 rounded font-mono">
                              option: {f.optionKey}
                            </span>
                          )}
                          {f.displaySettings?.component && (
                            <span className="text-[10px] bg-muted px-1 rounded text-muted-foreground">
                              {f.displaySettings.component}
                            </span>
                          )}
                          {f.required ? (
                            <span className="text-[10px] bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300 px-1 rounded font-semibold">
                              Bắt buộc
                            </span>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">
                              Tùy chọn
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Modal: Create / Edit Workflow */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl">
                {isNewWorkflow
                  ? "Thêm Quy trình mới"
                  : `Chỉnh sửa Quy trình: ${currentName}`}
              </DialogTitle>
              <DialogDescription>
                Cấu hình thông tin quy trình, bố cục giao diện và các trường dữ liệu kiểu văn bản, số, hoặc tùy chọn tham chiếu hằng số.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* ID & Name */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wfId" className="text-sm font-medium">
                    Mã quy trình (ID - slug) *
                  </Label>
                  <Input
                    id="wfId"
                    value={currentId}
                    onChange={(e) => setCurrentId(e.target.value)}
                    disabled={!isNewWorkflow}
                    placeholder="ví dụ: equipment_booking"
                    className="mt-1.5 font-mono text-sm"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Mã duy nhất, viết thường không dấu cách (vd: room_booking).
                  </p>
                </div>
                <div>
                  <Label htmlFor="wfName" className="text-sm font-medium">
                    Tên hiển thị quy trình *
                  </Label>
                  <Input
                    id="wfName"
                    value={currentName}
                    onChange={(e) => setCurrentName(e.target.value)}
                    placeholder="ví dụ: Mượn thiết bị"
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="wfDesc" className="text-sm font-medium">
                  Mô tả quy trình (Dùng để AI nhận diện ý định người dùng) *
                </Label>
                <Textarea
                  id="wfDesc"
                  value={currentDescription}
                  onChange={(e) => setCurrentDescription(e.target.value)}
                  rows={2}
                  placeholder="Mô tả mục đích, ngữ cảnh quy trình để AI nhận diện chính xác khi người dùng yêu cầu..."
                  className="mt-1.5"
                />
              </div>

              {/* Basic UI Layout Settings */}
              <div className="p-4 bg-muted/30 rounded-lg border space-y-3">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <Settings className="h-4 w-4 text-primary" /> Cấu hình Bố cục Giao diện (UI Layout)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs text-muted-foreground">Số cột hiển thị</Label>
                    <Select
                      value={String(currentLayout.columns || 2)}
                      onValueChange={(val) =>
                        setCurrentLayout((prev) => ({
                          ...prev,
                          columns: Number(val) as 1 | 2,
                        }))
                      }
                    >
                      <SelectTrigger className="mt-1 h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">1 cột (Single column)</SelectItem>
                        <SelectItem value="2">2 cột (Two columns)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nút gửi biểu mẫu</Label>
                    <Input
                      value={currentLayout.submitButtonText || ""}
                      onChange={(e) =>
                        setCurrentLayout((prev) => ({
                          ...prev,
                          submitButtonText: e.target.value,
                        }))
                      }
                      placeholder="Xác nhận & Gửi Yêu cầu"
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Nút hủy bỏ</Label>
                    <Input
                      value={currentLayout.cancelButtonText || ""}
                      onChange={(e) =>
                        setCurrentLayout((prev) => ({
                          ...prev,
                          cancelButtonText: e.target.value,
                        }))
                      }
                      placeholder="Hủy bỏ"
                      className="mt-1 h-9 text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Dynamic Fields Section */}
              <div className="border-t pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-base flex items-center gap-2">
                      <Layers className="h-4 w-4" /> Danh sách trường cấu hình ({currentFields.length})
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Hỗ trợ kiểu &apos;text&apos;, &apos;number&apos;, và &apos;option&apos; (tham chiếu hằng số định sẵn như validDepartments).
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddField}
                    className="flex items-center gap-1.5 text-primary border-primary/30"
                  >
                    <Plus className="h-3.5 w-3.5" /> Thêm trường
                  </Button>
                </div>

                <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
                  {currentFields.map((field, index) => {
                    const isExpanded = Boolean(expandedFieldIndices[index]);
                    return (
                      <div
                        key={index}
                        className="p-3 bg-muted/40 rounded-lg border space-y-3 transition-all"
                      >
                        {/* Primary row */}
                        <div className="flex flex-col md:flex-row md:items-center gap-3">
                          {/* Shared definition key selector */}
                          {Object.keys(fieldDefinitions).length > 0 && (
                            <div className="w-48">
                              <Label className="text-xs text-muted-foreground">
                                Khóa chung (fieldDefinitionKey)
                              </Label>
                              <Select
                                value={field.fieldDefinitionKey || ""}
                                onValueChange={(val) =>
                                  handleFieldChange(index, "fieldDefinitionKey", val)
                                }
                              >
                                <SelectTrigger className="mt-1 h-9 text-xs">
                                  <SelectValue placeholder="Chọn định nghĩa..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {Object.keys(fieldDefinitions).map((k) => (
                                    <SelectItem key={k} value={k} className="text-xs">
                                      {k} ({fieldDefinitions[k].label})
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Name / Key */}
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">
                              Tên định danh (key) *
                            </Label>
                            <Input
                              value={field.name}
                              onChange={(e) =>
                                handleFieldChange(index, "name", e.target.value)
                              }
                              placeholder="room, requestorDept..."
                              className="mt-1 font-mono text-xs h-9"
                            />
                          </div>

                          {/* Display Name */}
                          <div className="flex-1">
                            <Label className="text-xs text-muted-foreground">
                              Tên hiển thị (Label) *
                            </Label>
                            <Input
                              value={field.displayName || field.label || ""}
                              onChange={(e) =>
                                handleFieldChange(index, "displayName", e.target.value)
                              }
                              placeholder="Phòng, Khoa viện..."
                              className="mt-1 text-xs h-9"
                            />
                          </div>

                          {/* Type: text | number | option */}
                          <div className="w-36">
                            <Label className="text-xs text-muted-foreground">
                              Kiểu dữ liệu *
                            </Label>
                            <Select
                              value={field.type}
                              onValueChange={(val: FieldType) =>
                                handleFieldChange(index, "type", val)
                              }
                            >
                              <SelectTrigger className="mt-1 h-9 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="text">Văn bản (text)</SelectItem>
                                <SelectItem value="number">Số (number)</SelectItem>
                                <SelectItem value="option">Tùy chọn (option)</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {/* Option Key selector when type is option */}
                          {field.type === "option" && (
                            <div className="w-56">
                              <Label className="text-xs text-muted-foreground flex items-center gap-1">
                                <ListFilter className="h-3 w-3 text-amber-500" /> Khóa hằng số *
                              </Label>
                              <Select
                                value={field.optionKey || ""}
                                onValueChange={(val) =>
                                  handleFieldChange(index, "optionKey", val)
                                }
                              >
                                <SelectTrigger className="mt-1 h-9 text-xs border-amber-500/50">
                                  <SelectValue placeholder="Chọn danh mục..." />
                                </SelectTrigger>
                                <SelectContent>
                                  {predefinedOptionList.map((p) => (
                                    <SelectItem key={p.key} value={p.key} className="text-xs">
                                      <span className="font-medium">{p.key}</span>
                                      <span className="text-muted-foreground ml-1">
                                        ({p.count} mục)
                                      </span>
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          )}

                          {/* Required */}
                          <div className="w-24 flex flex-col items-center justify-center pt-2">
                            <Label className="text-xs text-muted-foreground mb-1">
                              Bắt buộc?
                            </Label>
                            <Button
                              type="button"
                              variant={field.required ? "default" : "outline"}
                              size="sm"
                              onClick={() =>
                                handleFieldChange(index, "required", !field.required)
                              }
                              className={`h-7 px-2.5 text-xs flex items-center gap-1 ${
                                field.required
                                  ? "bg-red-600 hover:bg-red-700 text-white"
                                  : "text-muted-foreground"
                              }`}
                            >
                              {field.required ? (
                                <>
                                  <Check className="h-3 w-3" /> Có
                                </>
                              ) : (
                                <>
                                  <X className="h-3 w-3" /> Không
                                </>
                              )}
                            </Button>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-1 pt-4 md:pt-0">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleExpandField(index)}
                              className="h-8 w-8 text-muted-foreground"
                              title="Tùy chỉnh hiển thị & xử lý giá trị"
                            >
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveField(index)}
                              className="text-destructive hover:bg-destructive/10 h-8 w-8"
                              title="Xóa trường này"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Collapsible Display Settings & Value Handling */}
                        {isExpanded && (
                          <div className="pt-2 border-t border-border/60 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                            {/* Field Description */}
                            <div className="md:col-span-2">
                              <Label className="text-[11px] text-muted-foreground">
                                Mô tả / Hướng dẫn điền trường này
                              </Label>
                              <Input
                                value={field.description || ""}
                                onChange={(e) =>
                                  handleFieldChange(index, "description", e.target.value)
                                }
                                placeholder="Hiển thị gợi ý dưới nhãn của trường..."
                                className="mt-1 h-8 text-xs"
                              />
                            </div>

                            {/* Component type */}
                            <div>
                              <Label className="text-[11px] text-muted-foreground">
                                Loại giao diện (Component)
                              </Label>
                              <Select
                                value={
                                  field.type === "option"
                                    ? "select"
                                    : field.displaySettings?.component || "input"
                                }
                                disabled={field.type === "option"}
                                onValueChange={(val: FieldComponentType) =>
                                  handleDisplaySettingsChange(index, "component", val)
                                }
                              >
                                <SelectTrigger className="mt-1 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="input">Hộp nhập ngắn (Input)</SelectItem>
                                  <SelectItem value="textarea">Văn bản dài (Textarea)</SelectItem>
                                  <SelectItem value="select">Danh sách chọn (Select dropdown)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* ColSpan */}
                            <div>
                              <Label className="text-[11px] text-muted-foreground">
                                Độ rộng cột
                              </Label>
                              <Select
                                value={String(field.displaySettings?.colSpan || 1)}
                                onValueChange={(val) =>
                                  handleDisplaySettingsChange(index, "colSpan", Number(val))
                                }
                              >
                                <SelectTrigger className="mt-1 h-8 text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="1">1 nửa hàng (Col-Span 1)</SelectItem>
                                  <SelectItem value="2">Toàn hàng (Col-Span 2 Full)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            {/* Placeholder */}
                            <div>
                              <Label className="text-[11px] text-muted-foreground">
                                Văn bản gợi ý (Placeholder)
                              </Label>
                              <Input
                                value={field.displaySettings?.placeholder || ""}
                                onChange={(e) =>
                                  handleDisplaySettingsChange(index, "placeholder", e.target.value)
                                }
                                placeholder="Gợi ý mờ trong ô..."
                                className="mt-1 h-8 text-xs"
                              />
                            </div>

                            {/* Value handling */}
                            {field.type === "number" ? (
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <Label className="text-[11px] text-muted-foreground">Giá trị Min</Label>
                                  <Input
                                    type="number"
                                    value={field.valueHandling?.min ?? ""}
                                    onChange={(e) =>
                                      handleValueHandlingChange(
                                        index,
                                        "min",
                                        e.target.value === "" ? undefined : Number(e.target.value)
                                      )
                                    }
                                    placeholder="Min"
                                    className="mt-1 h-8 text-xs"
                                  />
                                </div>
                                <div>
                                  <Label className="text-[11px] text-muted-foreground">Giá trị Max</Label>
                                  <Input
                                    type="number"
                                    value={field.valueHandling?.max ?? ""}
                                    onChange={(e) =>
                                      handleValueHandlingChange(
                                        index,
                                        "max",
                                        e.target.value === "" ? undefined : Number(e.target.value)
                                      )
                                    }
                                    placeholder="Max"
                                    className="mt-1 h-8 text-xs"
                                  />
                                </div>
                              </div>
                            ) : field.type === "option" ? (
                              <div>
                                <Label className="text-[11px] text-muted-foreground">
                                  Xem trước các giá trị từ hằng số &quot;{field.optionKey}&quot;
                                </Label>
                                <p className="mt-1 text-[11px] text-muted-foreground bg-muted p-2 rounded max-h-16 overflow-y-auto">
                                  {getPredefinedOptions(field.optionKey)?.join(", ") || "Chưa chọn khóa"}
                                </p>
                              </div>
                            ) : (
                              <div>
                                <Label className="text-[11px] text-muted-foreground">
                                  Giá trị mặc định
                                </Label>
                                <Input
                                  value={field.valueHandling?.defaultValue?.toString() || ""}
                                  onChange={(e) =>
                                    handleValueHandlingChange(index, "defaultValue", e.target.value)
                                  }
                                  placeholder="Mặc định nếu chưa nhập..."
                                  className="mt-1 h-8 text-xs"
                                />
                              </div>
                            )}

                            {/* Select options (if component === 'select' and type === 'text') */}
                            {field.type === "text" && field.displaySettings?.component === "select" && (
                              <div className="md:col-span-2">
                                <Label className="text-[11px] text-muted-foreground">
                                  Các lựa chọn tùy chỉnh (phân tách bởi dấu phẩy)
                                </Label>
                                <Input
                                  value={
                                    Array.isArray(field.displaySettings.options)
                                      ? field.displaySettings.options.join(", ")
                                      : ""
                                  }
                                  onChange={(e) => {
                                    const opts = e.target.value
                                      .split(",")
                                      .map((s) => s.trim())
                                      .filter(Boolean);
                                    handleDisplaySettingsChange(index, "options", opts);
                                  }}
                                  placeholder="Lựa chọn 1, Lựa chọn 2, Lựa chọn 3..."
                                  className="mt-1 h-8 text-xs"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <DialogFooter className="border-t pt-4">
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button
                onClick={handleSaveWorkflow}
                disabled={isSaving}
                className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2"
              >
                {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
                <Save className="h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
