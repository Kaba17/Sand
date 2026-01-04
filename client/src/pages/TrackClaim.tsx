import { useState } from "react";
import { useTrackClaim } from "@/hooks/use-claims";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Search, Loader2, CheckCircle, Clock, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function TrackClaim() {
  const [claimId, setClaimId] = useState("");
  const [phone, setPhone] = useState("");
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data, isLoading, error, refetch } = useTrackClaim(claimId, phone);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (claimId && phone) {
      refetch();
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold font-cairo text-primary">تتبع حالة المطالبة</h1>
          <p className="text-muted-foreground font-tajawal">أدخل رقم المطالبة ورقم الجوال للاطلاع على آخر المستجدات</p>
        </div>

        <Card className="shadow-lg border-primary/10">
          <CardContent className="pt-6">
            <form onSubmit={handleSearch} className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="font-tajawal">رقم المطالبة</Label>
                  <Input 
                    value={claimId} 
                    onChange={e => setClaimId(e.target.value)} 
                    placeholder="SAN-202X-XXXX"
                    className="font-mono text-left"
                    dir="ltr"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-tajawal">رقم الجوال</Label>
                  <Input 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                    placeholder="05xxxxxxxx"
                    className="font-mono text-left"
                    dir="ltr"
                  />
                </div>
              </div>
              <Button type="submit" className="w-full font-cairo text-lg h-12" disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin" /> : <><Search className="ml-2 h-5 w-5" /> بحث</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {error && (
          <div className="p-4 rounded-lg bg-destructive/10 text-destructive flex items-center gap-2 font-tajawal">
            <AlertCircle className="h-5 w-5" />
            <span>لم يتم العثور على مطالبة بهذه البيانات. يرجى التأكد والمحاولة مرة أخرى.</span>
          </div>
        )}

        {data && (
          <Card className="animate-in fade-in slide-in-from-bottom-4 duration-500 shadow-xl border-primary/20 overflow-hidden">
            <div className="bg-primary/5 p-6 border-b border-primary/10 flex justify-between items-center">
              <div>
                <h2 className="text-xl font-bold font-cairo text-primary">تفاصيل المطالبة</h2>
                <p className="text-sm text-muted-foreground font-mono mt-1">{data.claim.claimId}</p>
              </div>
              <StatusBadge status={data.claim.status} />
            </div>
            
            <CardContent className="p-0">
              <div className="p-6 grid grid-cols-2 gap-4 border-b">
                <div>
                  <p className="text-sm text-muted-foreground font-tajawal">الشركة</p>
                  <p className="font-medium">{data.claim.companyName}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground font-tajawal">تاريخ الإنشاء</p>
                  <p className="font-medium font-mono text-sm">
                    {format(new Date(data.claim.createdAt || new Date()), "dd MMMM yyyy", { locale: ar })}
                  </p>
                </div>
              </div>

              <div className="p-6">
                <h3 className="font-bold font-cairo mb-6">سجل النشاطات</h3>
                <div className="relative border-r-2 border-primary/20 mr-2 space-y-8">
                  {data.timeline.map((event, idx) => (
                    <div key={idx} className="relative pr-6">
                      <div className="absolute -right-[9px] top-0 h-4 w-4 rounded-full bg-primary border-4 border-background" />
                      <div className="space-y-1">
                        <span className="text-xs text-muted-foreground font-mono">
                          {format(new Date(event.createdAt || new Date()), "yyyy/MM/dd HH:mm", { locale: ar })}
                        </span>
                        <p className="text-sm font-medium font-tajawal">{event.message}</p>
                      </div>
                    </div>
                  ))}
                  {data.timeline.length === 0 && (
                    <p className="text-sm text-muted-foreground pr-6 font-tajawal">لا توجد تحديثات حتى الآن.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    new: "bg-blue-100 text-blue-700",
    processing: "bg-yellow-100 text-yellow-700",
    approved: "bg-green-100 text-green-700",
    rejected: "bg-red-100 text-red-700",
    settled: "bg-purple-100 text-purple-700",
  };

  const labels: Record<string, string> = {
    new: "جديد",
    processing: "قيد المعالجة",
    approved: "مقبولة",
    rejected: "مرفوضة",
    settled: "تمت التسوية",
  };

  return (
    <span className={`px-3 py-1 rounded-full text-xs font-bold font-tajawal ${styles[status] || styles.new}`}>
      {labels[status] || status}
    </span>
  );
}
