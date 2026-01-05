import { useRoute } from "wouter";
import { useClaim, useUpdateClaim, useAddTimelineEvent, useAddCommunication } from "@/hooks/use-claims";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, Send, Save, Phone, Mail, FileText, Plane, CheckCircle, XCircle, Clock, AlertTriangle, Upload, Bot, FileSearch, Edit, MessageSquareMore, Shield, ShieldAlert, ShieldX, Sparkles, ScanSearch, Eye, Calculator, SendHorizontal, DollarSign } from "lucide-react";
import { useState, useCallback } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";

export default function AdminClaimDetails() {
  const [match, params] = useRoute("/admin/claims/:id");
  const id = parseInt(params?.id || "0");
  const { data: claim, isLoading } = useClaim(id);
  const updateClaim = useUpdateClaim();
  const addEvent = useAddTimelineEvent();
  const addComm = useAddCommunication();

  const [note, setNote] = useState("");
  const [commMessage, setCommMessage] = useState("");
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [airlineResponse, setAirlineResponse] = useState("");
  const [documentVerificationResults, setDocumentVerificationResults] = useState<any>(null);
  const [singleDocResult, setSingleDocResult] = useState<any>(null);
  const [verifyingAttachmentId, setVerifyingAttachmentId] = useState<number | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const verifyFlightMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/claims/${id}/verify-flight`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.claims.get.path, id] });
      toast({ title: "تم التحقق من حالة الرحلة" });
    },
    onError: () => {
      toast({ title: "فشل التحقق", variant: "destructive" });
    },
  });

  const uploadBoardingPassMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch(`/api/claims/${id}/boarding-pass`, {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Upload failed");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.claims.get.path, id] });
      toast({ title: "تم رفع بطاقة الصعود بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل رفع الملف", variant: "destructive" });
    },
  });

  const handleBoardingPassUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadBoardingPassMutation.mutate(file);
    }
  }, [uploadBoardingPassMutation]);

  const verifyDocumentMutation = useMutation({
    mutationFn: async (attachmentId: number) => {
      setVerifyingAttachmentId(attachmentId);
      const attachment = claim?.attachments?.find((a: any) => a.id === attachmentId);
      const result = await apiRequest("POST", `/api/claims/${id}/verify-document/${attachmentId}`);
      return { ...result, fileName: attachment?.fileName || "مستند" };
    },
    onSuccess: (data: any) => {
      setVerifyingAttachmentId(null);
      setSingleDocResult(data);
      queryClient.invalidateQueries({ queryKey: [api.claims.get.path, id] });
      toast({ title: "تم التحقق من المستند بنجاح" });
    },
    onError: () => {
      setVerifyingAttachmentId(null);
      toast({ title: "فشل في التحقق من المستند", variant: "destructive" });
    },
  });

  const verifyAllDocumentsMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/claims/${id}/verify-all-documents`);
    },
    onSuccess: (data: any) => {
      setDocumentVerificationResults(data);
      queryClient.invalidateQueries({ queryKey: [api.claims.get.path, id] });
      toast({ title: `تم التحقق من ${data.summary?.total || 0} مستند(ات)` });
    },
    onError: () => {
      toast({ title: "فشل في التحقق من المستندات", variant: "destructive" });
    },
  });

  const aiAgentMutation = useMutation({
    mutationFn: async (mode: "analyze" | "draft" | "followup") => {
      const flightVerification = claim?.flightVerification;
      const claimData = {
        airline: flightVerification?.airline || claim?.companyName || "",
        flightNumber: flightVerification?.flightNumber || claim?.referenceNumber || "",
        date: flightVerification?.scheduledDeparture 
          ? format(new Date(flightVerification.scheduledDeparture), "yyyy-MM-dd")
          : claim?.incidentDate ? format(new Date(claim.incidentDate), "yyyy-MM-dd") : "",
        from: flightVerification?.departureAirport || claim?.flightFrom || "",
        to: flightVerification?.arrivalAirport || claim?.flightTo || "",
        disruptionType: claim?.issueType || "delay",
        delayMinutes: flightVerification?.delayMinutes || undefined,
        reasonText: claim?.description || "",
      };
      const evidenceText = (claim?.attachments || []).map((a: any) => a.fileName).join(", ");
      return await apiRequest("POST", "/api/ai/flight-agent", {
        claimId: id,
        mode,
        claimData,
        evidenceText,
        airlineResponseText: mode === "followup" ? airlineResponse : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.claims.get.path, id] });
      toast({ title: "تم تنفيذ طلب وكيل سند الذكي" });
    },
    onError: () => {
      toast({ title: "فشل في تنفيذ الطلب", variant: "destructive" });
    },
  });

  const markSubmittedMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/claims/${id}/mark-submitted`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.claims.get.path, id] });
      toast({ title: "تم تسجيل المطالبة كمرسلة لشركة الطيران" });
    },
    onError: () => {
      toast({ title: "فشل في تحديث حالة الإرسال", variant: "destructive" });
    },
  });

  if (isLoading || !claim) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;

  const handleStatusChange = (newStatus: string) => {
    setStatus(newStatus);
    updateClaim.mutate({ id, status: newStatus });
    addEvent.mutate({ 
      claimId: id, 
      eventType: "status_change", 
      message: `تم تغيير حالة المطالبة إلى ${newStatus}` 
    });
  };

  const handleAddNote = () => {
    if (!note.trim()) return;
    addEvent.mutate({ 
      claimId: id, 
      eventType: "note", 
      message: note 
    }, { onSuccess: () => setNote("") });
  };

  const handleSendComm = () => {
    if (!commMessage.trim()) return;
    // Simulate sending email/sms
    addComm.mutate({
      claimId: id,
      method: "email",
      recipient: claim.customerEmail || "N/A",
      sentAt: new Date(),
    });
    addEvent.mutate({
      claimId: id,
      eventType: "info_request",
      message: `تم إرسال رسالة للعميل: ${commMessage.substring(0, 50)}...`
    }, { onSuccess: () => setCommMessage("") });
  };

  return (
    <div className="container py-8 space-y-6">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" onClick={() => window.history.back()}>
          <ArrowRight className="h-5 w-5 ml-2" />
          عودة
        </Button>
        <div>
          <h1 className="text-2xl font-bold font-cairo flex items-center gap-3">
            المطالبة #{claim.claimId}
            <span className="text-sm px-3 py-1 bg-primary/10 text-primary rounded-full font-normal">
              طيران
            </span>
          </h1>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader><CardTitle className="font-cairo">بيانات العميل والمشكلة</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 gap-6 font-tajawal">
              <div>
                <label className="text-xs text-muted-foreground">اسم العميل</label>
                <p className="font-medium">{claim.customerName}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">رقم الجوال</label>
                <p className="font-medium font-mono dir-ltr text-right">{claim.customerPhone}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">الشركة / الجهة</label>
                <p className="font-medium">{claim.companyName}</p>
              </div>
              <div>
                <label className="text-xs text-muted-foreground">المرجع / رقم الرحلة</label>
                <p className="font-medium font-mono">{claim.referenceNumber}</p>
              </div>
              <div className="col-span-2 bg-muted/30 p-4 rounded-lg">
                <label className="text-xs text-muted-foreground">الوصف</label>
                <p className="mt-1 leading-relaxed">{claim.description}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-2">
              <CardTitle className="font-cairo">المرفقات</CardTitle>
              {claim.attachments && claim.attachments.filter((f: any) => f.mimeType?.startsWith("image/")).length > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => verifyAllDocumentsMutation.mutate()}
                  disabled={verifyAllDocumentsMutation.isPending}
                  data-testid="button-verify-all-docs"
                  className="font-tajawal"
                >
                  {verifyAllDocumentsMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  ) : (
                    <ScanSearch className="h-4 w-4 ml-2" />
                  )}
                  تحقق من جميع المستندات
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {claim.attachments && claim.attachments.length > 0 ? (
                <div className="space-y-2">
                  {claim.attachments.map((file: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50 transition-colors">
                      <FileText className="h-5 w-5 text-primary" />
                      <a href={`/${file.filePath}`} target="_blank" className="text-sm hover:underline flex-1 truncate font-tajawal">
                        {file.fileName}
                      </a>
                      {file.mimeType?.startsWith("image/") && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => verifyDocumentMutation.mutate(file.id)}
                          disabled={verifyingAttachmentId === file.id}
                          data-testid={`button-verify-doc-${file.id}`}
                          title="تحقق من المستند بالذكاء الاصطناعي"
                        >
                          {verifyingAttachmentId === file.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <ScanSearch className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                      <a href={`/${file.filePath}`} target="_blank" data-testid={`link-view-doc-${file.id}`}>
                        <Button size="icon" variant="ghost" title="عرض" data-testid={`button-view-doc-${file.id}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground font-tajawal">لا توجد مرفقات.</p>
              )}

              {/* Single Document Verification Result */}
              {singleDocResult && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3" data-testid="single-doc-result">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium font-cairo">
                      <ScanSearch className="h-5 w-5 text-primary" />
                      نتيجة التحقق: {singleDocResult.fileName}
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setSingleDocResult(null)}
                      data-testid="button-close-single-result"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="p-3 bg-background rounded border text-sm font-tajawal">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">
                        النوع: {
                          singleDocResult.verification?.documentType === 'boarding_pass' ? 'بطاقة صعود' :
                          singleDocResult.verification?.documentType === 'ticket' ? 'تذكرة' :
                          singleDocResult.verification?.documentType === 'receipt' ? 'إيصال' :
                          singleDocResult.verification?.documentType === 'invoice' ? 'فاتورة' :
                          singleDocResult.verification?.documentType === 'id_document' ? 'وثيقة هوية' :
                          singleDocResult.verification?.documentType === 'other' ? 'مستند آخر' : 'غير معروف'
                        }
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        (singleDocResult.verification?.confidence || 0) >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
                        (singleDocResult.verification?.confidence || 0) >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                        'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                      }`}>
                        ثقة {singleDocResult.verification?.confidence || 0}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground space-y-1">
                      {singleDocResult.verification?.verificationNotes && (
                        <p>{singleDocResult.verification.verificationNotes}</p>
                      )}
                      {singleDocResult.verification?.extractedData?.flightNumber && (
                        <p>رقم الرحلة: {singleDocResult.verification.extractedData.flightNumber}</p>
                      )}
                      {singleDocResult.verification?.extractedData?.passengerName && (
                        <p>اسم المسافر: {singleDocResult.verification.extractedData.passengerName}</p>
                      )}
                      {singleDocResult.verification?.extractedData?.flightDate && (
                        <p>تاريخ الرحلة: {singleDocResult.verification.extractedData.flightDate}</p>
                      )}
                      {singleDocResult.verification?.warnings?.length > 0 && (
                        <div className="flex items-center gap-1 text-amber-600 mt-1">
                          <AlertTriangle className="h-3 w-3" />
                          <span>{singleDocResult.verification.warnings.join(", ")}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Batch Verification Results */}
              {documentVerificationResults && (
                <div className="mt-4 p-4 bg-muted/30 rounded-lg space-y-3" data-testid="batch-doc-results">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm font-medium font-cairo">
                      <ScanSearch className="h-5 w-5 text-primary" />
                      نتائج التحقق من المستندات
                      <span className="text-muted-foreground">
                        ({documentVerificationResults.summary?.successful || 0}/{documentVerificationResults.summary?.total || 0} ناجح)
                      </span>
                    </div>
                    <Button 
                      size="sm" 
                      variant="ghost" 
                      onClick={() => setDocumentVerificationResults(null)}
                      data-testid="button-close-batch-results"
                    >
                      <XCircle className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {documentVerificationResults.results?.map((result: any, idx: number) => (
                      <div key={idx} className="p-3 bg-background rounded border text-sm font-tajawal">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium truncate">{result.fileName}</span>
                          <span className={`px-2 py-0.5 rounded text-xs ${
                            result.verification.confidence >= 70 ? 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400' :
                            result.verification.confidence >= 40 ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400' :
                            'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400'
                          }`}>
                            ثقة {result.verification.confidence}%
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground space-y-1">
                          <p>النوع: {
                            result.verification.documentType === 'boarding_pass' ? 'بطاقة صعود' :
                            result.verification.documentType === 'ticket' ? 'تذكرة' :
                            result.verification.documentType === 'receipt' ? 'إيصال' :
                            result.verification.documentType === 'invoice' ? 'فاتورة' :
                            result.verification.documentType === 'id_document' ? 'وثيقة هوية' :
                            result.verification.documentType === 'other' ? 'مستند آخر' : 'غير معروف'
                          }</p>
                          {result.verification.verificationNotes && (
                            <p>{result.verification.verificationNotes}</p>
                          )}
                          {result.verification.extractedData?.flightNumber && (
                            <p>رقم الرحلة: {result.verification.extractedData.flightNumber}</p>
                          )}
                          {result.verification.extractedData?.passengerName && (
                            <p>اسم المسافر: {result.verification.extractedData.passengerName}</p>
                          )}
                          {result.verification.warnings?.length > 0 && (
                            <div className="flex items-center gap-1 text-amber-600 mt-1">
                              <AlertTriangle className="h-3 w-3" />
                              <span>{result.verification.warnings.join(", ")}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Flight Verification Card - Only for flight claims */}
          {claim.category === "flight" && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader className="bg-blue-50 dark:bg-blue-950/30">
                <CardTitle className="font-cairo flex items-center gap-2">
                  <Plane className="h-5 w-5 text-blue-500" />
                  التحقق من الرحلة
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {claim.flightVerification ? (
                  <div className="space-y-4">
                    {/* Flight Info */}
                    <div className="grid grid-cols-2 gap-4 text-sm font-tajawal">
                      <div>
                        <label className="text-xs text-muted-foreground">رقم الرحلة</label>
                        <p className="font-mono font-medium">{claim.flightVerification.flightNumber || "-"}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">شركة الطيران</label>
                        <p className="font-medium">{claim.flightVerification.airline || "-"}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">من</label>
                        <p className="font-mono">{claim.flightVerification.departureAirport || "-"}</p>
                      </div>
                      <div>
                        <label className="text-xs text-muted-foreground">إلى</label>
                        <p className="font-mono">{claim.flightVerification.arrivalAirport || "-"}</p>
                      </div>
                    </div>

                    {/* Verification Status */}
                    <div className="border-t pt-4">
                      <label className="text-xs text-muted-foreground block mb-2">حالة التحقق</label>
                      <div className="flex items-center gap-2">
                        {claim.flightVerification.verificationStatus === "verified" && (
                          <>
                            {claim.flightVerification.flightStatus === "delayed" && (
                              <div className="flex items-center gap-2 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-2 rounded-lg">
                                <AlertTriangle className="h-5 w-5" />
                                <span className="font-tajawal">تأخير {claim.flightVerification.delayMinutes} دقيقة</span>
                              </div>
                            )}
                            {claim.flightVerification.flightStatus === "cancelled" && (
                              <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
                                <XCircle className="h-5 w-5" />
                                <span className="font-tajawal">الرحلة ملغاة</span>
                              </div>
                            )}
                            {claim.flightVerification.flightStatus === "on_time" && (
                              <div className="flex items-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg">
                                <CheckCircle className="h-5 w-5" />
                                <span className="font-tajawal">في الموعد</span>
                              </div>
                            )}
                          </>
                        )}
                        {claim.flightVerification.verificationStatus === "pending" && (
                          <div className="flex items-center gap-2 text-blue-600 bg-blue-50 dark:bg-blue-950/30 px-3 py-2 rounded-lg">
                            <Clock className="h-5 w-5" />
                            <span className="font-tajawal">بانتظار التحقق</span>
                          </div>
                        )}
                        {claim.flightVerification.verificationStatus === "error" && (
                          <div className="flex items-center gap-2 text-gray-600 bg-gray-50 dark:bg-gray-950/30 px-3 py-2 rounded-lg">
                            <AlertTriangle className="h-5 w-5" />
                            <span className="font-tajawal">لم نتمكن من التحقق</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Verify Button */}
                    {claim.flightVerification.verificationStatus === "pending" && (
                      <Button 
                        onClick={() => verifyFlightMutation.mutate()}
                        disabled={verifyFlightMutation.isPending}
                        className="w-full font-tajawal"
                      >
                        {verifyFlightMutation.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin ml-2" />
                        ) : (
                          <CheckCircle className="h-4 w-4 ml-2" />
                        )}
                        التحقق من حالة الرحلة
                      </Button>
                    )}

                    {/* OCR Confidence */}
                    {claim.flightVerification.ocrConfidence !== null && (
                      <div className="text-xs text-muted-foreground font-tajawal">
                        دقة القراءة: {claim.flightVerification.ocrConfidence}%
                        {claim.flightVerification.verificationSource && (
                          <span className="mr-2">| المصدر: {claim.flightVerification.verificationSource}</span>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-6 space-y-4">
                    <div className="text-muted-foreground font-tajawal text-sm">
                      لم يتم رفع بطاقة صعود بعد
                    </div>
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleBoardingPassUpload}
                        disabled={uploadBoardingPassMutation.isPending}
                      />
                      <Button 
                        variant="outline" 
                        className="font-tajawal"
                        disabled={uploadBoardingPassMutation.isPending}
                        asChild
                      >
                        <span>
                          {uploadBoardingPassMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin ml-2" />
                          ) : (
                            <Upload className="h-4 w-4 ml-2" />
                          )}
                          رفع بطاقة الصعود
                        </span>
                      </Button>
                    </label>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="font-cairo">سجل النشاطات (Timeline)</CardTitle></CardHeader>
            <CardContent>
              <div className="relative border-r-2 border-muted mr-2 space-y-6">
                {claim.timelineEvents?.map((event: any, idx: number) => (
                  <div key={idx} className="relative pr-6">
                    <div className="absolute -right-[9px] top-0 h-4 w-4 rounded-full bg-muted border-4 border-background" />
                    <div className="space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-sm font-tajawal">{event.eventType}</span>
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(event.createdAt), "yyyy/MM/dd HH:mm")}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground font-tajawal bg-muted/30 p-2 rounded">
                        {event.message}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 space-y-3 pt-4 border-t">
                <Textarea 
                  placeholder="إضافة ملاحظة داخلية..." 
                  className="font-tajawal" 
                  value={note}
                  onChange={e => setNote(e.target.value)}
                />
                <Button size="sm" onClick={handleAddNote} disabled={addEvent.isPending} className="font-tajawal">
                  <Save className="ml-2 h-4 w-4" />
                  حفظ الملاحظة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions Column */}
        <div className="space-y-6">
          {/* Compensation Calculator - Only for flight claims */}
          {claim.category === "flight" && (claim.estimatedSdrAmount || claim.estimatedSarAmount) && (
            <Card className="border-amber-200 dark:border-amber-800">
              <CardHeader className="bg-amber-50 dark:bg-amber-950/30 pb-3">
                <CardTitle className="font-cairo text-sm flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Calculator className="h-4 w-4" />
                  التعويض المتوقع
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div className="bg-muted/40 p-3 rounded-lg">
                    <label className="text-xs text-muted-foreground font-tajawal block mb-1">SDR</label>
                    <p className="text-xl font-bold font-mono text-amber-600">{claim.estimatedSdrAmount || "-"}</p>
                  </div>
                  <div className="bg-muted/40 p-3 rounded-lg">
                    <label className="text-xs text-muted-foreground font-tajawal block mb-1">ريال سعودي</label>
                    <p className="text-xl font-bold font-mono text-green-600">{claim.estimatedSarAmount || "-"}</p>
                  </div>
                </div>
                
                {/* Eligibility Status */}
                {claim.eligibilityStatus && (
                  <div className="flex items-center justify-center gap-2 pt-2">
                    {claim.eligibilityStatus === "likely_eligible" && (
                      <div className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-1 rounded-full text-xs font-tajawal">
                        <CheckCircle className="h-3 w-3" />
                        مؤهل للتعويض
                      </div>
                    )}
                    {claim.eligibilityStatus === "maybe_eligible" && (
                      <div className="flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-3 py-1 rounded-full text-xs font-tajawal">
                        <AlertTriangle className="h-3 w-3" />
                        يحتاج مراجعة
                      </div>
                    )}
                    {claim.eligibilityStatus === "not_eligible" && (
                      <div className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-950/30 px-3 py-1 rounded-full text-xs font-tajawal">
                        <XCircle className="h-3 w-3" />
                        غير مؤهل
                      </div>
                    )}
                  </div>
                )}

                {/* Mark as Submitted Button */}
                {!claim.submittedToAirlineAt ? (
                  <Button
                    variant="default"
                    size="sm"
                    className="w-full font-tajawal"
                    onClick={() => markSubmittedMutation.mutate()}
                    disabled={markSubmittedMutation.isPending}
                    data-testid="button-mark-submitted"
                  >
                    {markSubmittedMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin ml-2" />
                    ) : (
                      <SendHorizontal className="h-4 w-4 ml-2" />
                    )}
                    تسجيل كمرسلة لشركة الطيران
                  </Button>
                ) : (
                  <div className="flex items-center justify-center gap-2 text-green-600 bg-green-50 dark:bg-green-950/30 px-3 py-2 rounded-lg text-sm font-tajawal">
                    <CheckCircle className="h-4 w-4" />
                    تم الإرسال: {format(new Date(claim.submittedToAirlineAt), "dd/MM/yyyy")}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-primary/20 shadow-md">
            <CardHeader className="bg-primary/5 pb-4"><CardTitle className="font-cairo text-primary text-lg">إجراءات سريعة</CardTitle></CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium font-tajawal">حالة المطالبة</label>
                <Select value={status || claim.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="font-tajawal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="font-tajawal">
                    <SelectItem value="new">جديد</SelectItem>
                    <SelectItem value="processing">قيد المعالجة</SelectItem>
                    <SelectItem value="approved">مقبولة مبدئياً</SelectItem>
                    <SelectItem value="settled">تمت التسوية (إغلاق)</SelectItem>
                    <SelectItem value="rejected">مرفوضة</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border-t pt-4 space-y-3">
                <label className="text-sm font-medium font-tajawal flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  مراسلة العميل
                </label>
                <Textarea 
                  placeholder="نص الرسالة..." 
                  className="h-24 font-tajawal text-sm"
                  value={commMessage}
                  onChange={e => setCommMessage(e.target.value)}
                />
                <Button size="sm" className="w-full font-tajawal" onClick={handleSendComm} disabled={addComm.isPending}>
                  <Send className="ml-2 h-4 w-4" />
                  إرسال
                </Button>
              </div>
            </CardContent>
          </Card>
          
          {/* AI Agent Panel - Only for flight claims */}
          {claim.category === "flight" && (
            <Card className="border-emerald-200 dark:border-emerald-800">
              <CardHeader className="bg-emerald-50 dark:bg-emerald-950/30 pb-3">
                <CardTitle className="font-cairo text-sm flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
                  <Bot className="h-4 w-4" />
                  وكيل سند الذكي
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {/* 3 Action Buttons */}
                <div className="grid grid-cols-1 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-tajawal justify-start gap-2"
                    onClick={() => aiAgentMutation.mutate("analyze")}
                    disabled={aiAgentMutation.isPending}
                    data-testid="button-ai-analyze"
                  >
                    {aiAgentMutation.isPending && aiAgentMutation.variables === "analyze" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <FileSearch className="h-4 w-4 text-blue-500" />
                    )}
                    تحليل القضية
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="font-tajawal justify-start gap-2"
                    onClick={() => aiAgentMutation.mutate("draft")}
                    disabled={aiAgentMutation.isPending}
                    data-testid="button-ai-draft"
                  >
                    {aiAgentMutation.isPending && aiAgentMutation.variables === "draft" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Edit className="h-4 w-4 text-purple-500" />
                    )}
                    صياغة المطالبة
                  </Button>
                  <div className="space-y-2">
                    <Textarea
                      placeholder="رد شركة الطيران (للمتابعة)..."
                      className="font-tajawal text-xs h-16"
                      value={airlineResponse}
                      onChange={e => setAirlineResponse(e.target.value)}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-tajawal justify-start gap-2 w-full"
                      onClick={() => aiAgentMutation.mutate("followup")}
                      disabled={aiAgentMutation.isPending}
                      data-testid="button-ai-followup"
                    >
                      {aiAgentMutation.isPending && aiAgentMutation.variables === "followup" ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <MessageSquareMore className="h-4 w-4 text-amber-500" />
                      )}
                      متابعة / تصعيد
                    </Button>
                  </div>
                </div>

                {/* AI Output Display */}
                {claim.aiOutput && (
                  <div className="space-y-3 border-t pt-4">
                    {/* Case Strength Badge */}
                    {claim.aiOutput.caseStrength && (
                      <div className="flex items-center gap-2">
                        {claim.aiOutput.caseStrength === "strong" && (
                          <div className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-950/30 px-2 py-1 rounded text-xs font-tajawal">
                            <Shield className="h-3 w-3" />
                            قضية قوية
                          </div>
                        )}
                        {claim.aiOutput.caseStrength === "medium" && (
                          <div className="flex items-center gap-1 text-amber-600 bg-amber-50 dark:bg-amber-950/30 px-2 py-1 rounded text-xs font-tajawal">
                            <ShieldAlert className="h-3 w-3" />
                            قضية متوسطة
                          </div>
                        )}
                        {claim.aiOutput.caseStrength === "weak" && (
                          <div className="flex items-center gap-1 text-red-600 bg-red-50 dark:bg-red-950/30 px-2 py-1 rounded text-xs font-tajawal">
                            <ShieldX className="h-3 w-3" />
                            قضية ضعيفة
                          </div>
                        )}
                      </div>
                    )}

                    {/* Summary */}
                    {claim.aiOutput.summary && (
                      <div className="bg-muted/40 p-3 rounded-lg">
                        <label className="text-xs text-muted-foreground font-tajawal flex items-center gap-1 mb-1">
                          <Sparkles className="h-3 w-3" />
                          ملخص التحليل
                        </label>
                        <p className="text-sm font-tajawal whitespace-pre-wrap">{claim.aiOutput.summary}</p>
                      </div>
                    )}

                    {/* Eligibility Reasoning */}
                    {claim.aiOutput.eligibilityReasoning && (
                      <div className="bg-muted/40 p-3 rounded-lg">
                        <label className="text-xs text-muted-foreground font-tajawal mb-1 block">تحليل الأهلية</label>
                        <p className="text-sm font-tajawal whitespace-pre-wrap">{claim.aiOutput.eligibilityReasoning}</p>
                      </div>
                    )}

                    {/* Claim Draft */}
                    {claim.aiOutput.claimDraft && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800">
                        <label className="text-xs text-emerald-700 dark:text-emerald-400 font-tajawal flex items-center gap-1 mb-1">
                          <Edit className="h-3 w-3" />
                          مسودة المطالبة
                        </label>
                        <p className="text-sm font-tajawal whitespace-pre-wrap leading-relaxed">{claim.aiOutput.claimDraft}</p>
                      </div>
                    )}

                    {/* Next Action */}
                    {claim.aiOutput.nextAction && (
                      <div className="bg-blue-50 dark:bg-blue-950/20 p-2 rounded border border-blue-200 dark:border-blue-800">
                        <label className="text-xs text-blue-700 dark:text-blue-400 font-tajawal mb-1 block">الخطوة التالية</label>
                        <p className="text-sm font-tajawal">{claim.aiOutput.nextAction}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader><CardTitle className="font-cairo text-sm">بيانات داخلية</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm font-tajawal">
              <div className="flex justify-between">
                <span className="text-muted-foreground">ID:</span>
                <span className="font-mono">{claim.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">تم الإنشاء:</span>
                <span className="font-mono">{format(new Date(claim.createdAt || new Date()), "dd/MM/yyyy")}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
