import { useState } from "react";
import { useTrackClaim } from "@/hooks/use-claims";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Search, Loader2, AlertCircle, Clock, CheckCircle2, XCircle, FileText, Building2, Calendar, Banknote } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { motion } from "framer-motion";

export default function TrackClaim() {
  const [claimId, setClaimId] = useState("");
  const [phone, setPhone] = useState("");

  const { data, isLoading, error, refetch } = useTrackClaim(claimId, phone);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (claimId && phone) {
      refetch();
    }
  };

  return (
    <div className="min-h-[80svh] py-8 md:py-16 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">تتبع حالة المطالبة</h1>
          <p className="text-muted-foreground">أدخل رقم المطالبة ورقم الجوال للاطلاع على آخر المستجدات</p>
        </motion.div>

        {/* Search Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <Card className="shadow-xl border-primary/10 overflow-hidden">
            <CardContent className="p-6 md:p-8">
              <form onSubmit={handleSearch} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>رقم المطالبة</Label>
                    <Input 
                      value={claimId} 
                      onChange={e => setClaimId(e.target.value)} 
                      placeholder="SAN-202X-XXXX"
                      className="h-12 rounded-xl font-mono text-left"
                      dir="ltr"
                      data-testid="input-claim-id"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الجوال</Label>
                    <Input 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      placeholder="05xxxxxxxx"
                      className="h-12 rounded-xl font-mono text-left"
                      dir="ltr"
                      data-testid="input-phone"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full h-14 text-lg rounded-2xl shadow-lg btn-gradient" 
                  disabled={isLoading || !claimId || !phone}
                  data-testid="button-search"
                >
                  {isLoading ? (
                    <Loader2 className="animate-spin h-5 w-5" />
                  ) : (
                    <>
                      <Search className="ml-2 h-5 w-5" />
                      بحث
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </motion.div>

        {/* Error State */}
        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-4 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <span className="text-sm">لم يتم العثور على مطالبة بهذه البيانات. يرجى التأكد والمحاولة مرة أخرى.</span>
          </motion.div>
        )}

        {/* Results */}
        {data && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Card className="shadow-xl border-primary/10 overflow-hidden">
              {/* Header */}
              <div className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent p-6 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold">تفاصيل المطالبة</h2>
                  <p className="text-sm text-muted-foreground font-mono mt-1">{data.claim.claimId}</p>
                </div>
                <StatusBadge status={data.claim.status} />
              </div>
              
              <CardContent className="p-0">
                {/* Info Grid */}
                <div className="p-6 grid grid-cols-1 sm:grid-cols-3 gap-4 border-b">
                  <InfoItem 
                    icon={Building2} 
                    label="الشركة" 
                    value={data.claim.companyName} 
                  />
                  <InfoItem 
                    icon={FileText} 
                    label="نوع المشكلة" 
                    value={issueTypeLabels[data.claim.issueType || ""] || data.claim.issueType || ""} 
                  />
                  <InfoItem 
                    icon={Calendar} 
                    label="تاريخ الإنشاء" 
                    value={format(new Date(data.claim.createdAt || new Date()), "dd MMM yyyy", { locale: ar })} 
                  />
                </div>

                {/* Estimated Compensation */}
                {data.claim.estimatedSarAmount && data.claim.estimatedSarAmount > 0 && (
                  <div className="p-6 border-b bg-emerald-50 dark:bg-emerald-950/30">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-xl bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center flex-shrink-0">
                        <Banknote className="h-6 w-6 text-emerald-600 dark:text-emerald-300" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">التعويض المتوقع</p>
                        <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
                          {data.claim.estimatedSarAmount.toLocaleString("ar-SA")} ريال
                        </p>
                        {data.claim.estimatedSdrAmount && (
                          <p className="text-xs text-emerald-600 dark:text-emerald-400">
                            ({data.claim.estimatedSdrAmount} وحدة سحب خاصة)
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline */}
                <div className="p-6">
                  <h3 className="font-bold mb-6 flex items-center gap-2">
                    <Clock className="h-5 w-5 text-primary" />
                    سجل النشاطات
                  </h3>
                  
                  <div className="relative border-r-2 border-primary/20 mr-2 space-y-6">
                    {data.timeline.map((event, idx) => (
                      <motion.div 
                        key={idx} 
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="relative pr-6"
                      >
                        <div className="absolute -right-[9px] top-1 h-4 w-4 rounded-full bg-primary shadow-lg shadow-primary/30" />
                        <div className="bg-muted/50 p-4 rounded-2xl">
                          <span className="text-xs text-muted-foreground font-mono block mb-1">
                            {format(new Date(event.createdAt || new Date()), "yyyy/MM/dd - HH:mm", { locale: ar })}
                          </span>
                          <p className="text-sm font-medium">{event.message}</p>
                        </div>
                      </motion.div>
                    ))}
                    
                    {data.timeline.length === 0 && (
                      <p className="text-sm text-muted-foreground pr-6">لا توجد تحديثات حتى الآن.</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium text-sm">{value}</p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    new: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: Clock, label: "جديد" },
    need_info: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", icon: AlertCircle, label: "بحاجة لمعلومات" },
    in_review: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", icon: FileText, label: "قيد المراجعة" },
    processing: { bg: "bg-cyan-100 dark:bg-cyan-900/30", text: "text-cyan-700 dark:text-cyan-400", icon: Clock, label: "قيد المعالجة" },
    submitted: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400", icon: FileText, label: "مرسلة للشركة" },
    waiting_response: { bg: "bg-orange-100 dark:bg-orange-900/30", text: "text-orange-700 dark:text-orange-400", icon: Clock, label: "بانتظار الرد" },
    resolved: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", icon: CheckCircle2, label: "تمت التسوية" },
    rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: XCircle, label: "مرفوضة" },
  };

  const { bg, text, icon: Icon, label } = config[status] || config.new;

  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${bg} ${text}`}>
      <Icon className="h-4 w-4" />
      {label}
    </span>
  );
}

const issueTypeLabels: Record<string, string> = {
  delay: "تأخير الرحلة",
  cancel: "إلغاء الرحلة",
  denied_boarding: "رفض الصعود",
  missed_connection: "فوات الاتصال",
  lost_baggage: "فقدان الأمتعة",
  damaged_baggage: "تلف الأمتعة",
};
