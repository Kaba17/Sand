import { useRoute } from "wouter";
import { useClaim, useUpdateClaim, useAddTimelineEvent, useAddCommunication } from "@/hooks/use-claims";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowRight, Send, Save, Phone, Mail, FileText } from "lucide-react";
import { useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

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
              {claim.category === 'flight' ? 'طيران' : 'توصيل'}
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
            <CardHeader><CardTitle className="font-cairo">المرفقات</CardTitle></CardHeader>
            <CardContent>
              {claim.attachments && claim.attachments.length > 0 ? (
                <div className="space-y-2">
                  {claim.attachments.map((file: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded hover:bg-muted/50 transition-colors">
                      <FileText className="h-5 w-5 text-primary" />
                      <a href={file.filePath} target="_blank" className="text-sm hover:underline flex-1 truncate font-tajawal">
                        {file.fileName}
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground font-tajawal">لا توجد مرفقات.</p>
              )}
            </CardContent>
          </Card>

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
