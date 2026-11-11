// src/components/booking-room/submission-results.tsx
"use client";

import { useState, type FC } from "react";
import {
  CircleCheck,
  CircleMinus,
  CircleX,
  Download,
  FileText,
  Loader2,
  Mail,
  Paperclip,
  Workflow,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { api, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";
import type { ActionResult, EmailPreview, GeneratedFile, SubmitActionsReport } from "@/types/api";

const TYPES: Record<string, { label: string; icon: typeof Workflow }> = {
  word_document: { label: "Tạo tài liệu Word", icon: FileText },
  email: { label: "Soạn email", icon: Mail },
  n8n: { label: "Luồng xử lý n8n", icon: Workflow },
};

const STATUSES: Record<ActionResult["status"], { label: string; icon: typeof Workflow; className: string }> = {
  success: { label: "Thành công", icon: CircleCheck, className: "text-green-600" },
  failed: { label: "Thất bại", icon: CircleX, className: "text-destructive" },
  skipped: { label: "Bỏ qua", icon: CircleMinus, className: "text-muted-foreground" },
};

const OVERALL: Record<SubmitActionsReport["status"], { text: string; variant: "secondary" | "destructive" | "outline" }> = {
  success: { text: "Hoàn tất", variant: "secondary" },
  partial_success: { text: "Hoàn tất một phần", variant: "outline" },
  failed: { text: "Không thành công", variant: "destructive" },
};

const formatSize = (bytes: number) =>
  bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(bytes < 10 * 1024 ? 1 : 0)} KB`;

const FileDownload: FC<{ file: GeneratedFile }> = ({ file }) => {
  const [busy, setBusy] = useState(false);
  const download = async () => {
    setBusy(true);
    try {
      await api.downloadFile(file.downloadUrl, file.fileName);
    } catch (error) {
      toast({
        title: "Không thể tải tệp",
        description: error instanceof ApiError ? error.message : "Vui lòng thử lại.",
        variant: "destructive",
      });
    } finally {
      setBusy(false);
    }
  };
  const expires = new Date(file.expiresAt);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button size="sm" variant="outline" onClick={download} disabled={busy} className="max-w-full">
        {busy ? <Loader2 className="animate-spin" size={14} /> : <Download size={14} />}
        <span className="truncate">{file.fileName}</span>
      </Button>
      <span className="text-xs text-muted-foreground">
        {formatSize(file.size)}
        {!isNaN(expires.getTime()) && ` · liên kết hết hạn ${expires.toLocaleString("vi-VN")}`}
      </span>
    </div>
  );
};

const Recipients: FC<{ label: string; list: string[] }> = ({ label, list }) =>
  list.length === 0 ? null : (
    <div className="flex gap-2">
      <span className="w-14 shrink-0 text-muted-foreground">{label}</span>
      <span className="break-all">{list.join(", ")}</span>
    </div>
  );

const EmailPreviewView: FC<{ email: EmailPreview }> = ({ email }) => (
  <div className="space-y-2 rounded-md border bg-background p-3 text-sm">
    <p className="text-xs text-muted-foreground">Bản xem trước — email chưa được gửi.</p>
    <Recipients label="Đến" list={email.to} />
    <Recipients label="CC" list={email.cc} />
    <Recipients label="BCC" list={email.bcc} />
    <div className="flex gap-2">
      <span className="w-14 shrink-0 text-muted-foreground">Tiêu đề</span>
      <span className="font-medium">{email.subject || "(không có tiêu đề)"}</span>
    </div>
    {email.bodyFormat === "html" ? (
      // Empty sandbox: no scripts, forms, navigation or same-origin access.
      <iframe
        sandbox=""
        srcDoc={email.body}
        title="Nội dung email"
        className="h-64 w-full rounded border bg-white"
      />
    ) : (
      <pre className="max-h-64 overflow-auto whitespace-pre-wrap rounded border bg-muted/40 p-2 font-sans">
        {email.body}
      </pre>
    )}
    {email.attachments.length > 0 && (
      <div className="space-y-1">
        <span className="flex items-center gap-1 text-muted-foreground">
          <Paperclip size={14} /> Tệp đính kèm
        </span>
        {email.attachments.map((file) => (
          <FileDownload key={file.fileId} file={file} />
        ))}
      </div>
    )}
  </div>
);

const ActionRow: FC<{ result: ActionResult }> = ({ result }) => {
  const type = TYPES[result.type] ?? { label: result.type, icon: Workflow };
  const status = STATUSES[result.status] ?? STATUSES.failed;
  const TypeIcon = type.icon;
  const StatusIcon = status.icon;

  return (
    <li className="space-y-2 border-t pt-2 first:border-t-0 first:pt-0">
      <div className="flex items-center gap-2 text-sm">
        <TypeIcon size={16} className="shrink-0 text-primary" />
        <span className="font-medium">{type.label}</span>
        <span className={cn("ml-auto flex items-center gap-1 text-xs", status.className)}>
          <StatusIcon size={14} /> {status.label}
        </span>
      </div>
      {result.status === "failed" && result.error && (
        <p className="text-xs text-destructive">{result.error.message}</p>
      )}
      {result.status === "skipped" && result.reason && (
        <p className="text-xs text-muted-foreground">{result.reason}</p>
      )}
      {result.output?.kind === "word_document" && <FileDownload file={result.output.file} />}
      {result.output?.kind === "email" && <EmailPreviewView email={result.output} />}
    </li>
  );
};

/** Post-submission action results, shown under the submission's chat message. */
const SubmissionResults: FC<{ report: SubmitActionsReport }> = ({ report }) => {
  const overall = OVERALL[report.status] ?? OVERALL.failed;
  return (
    <Card className="mb-4 ml-11 max-w-[85%] shadow-sm">
      <CardContent className="space-y-3 p-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-semibold">Tác vụ sau khi gửi</span>
          <Badge variant={overall.variant}>{overall.text}</Badge>
        </div>
        <ul className="space-y-2">
          {report.results.map((result, i) => (
            <ActionRow key={`${result.id}-${i}`} result={result} />
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default SubmissionResults;
