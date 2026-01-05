import { useClaims } from "@/hooks/use-claims";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Eye, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

export default function AdminDashboard() {
  const { data: claims, isLoading } = useClaims();

  if (isLoading) {
    return <div className="h-screen flex items-center justify-center"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>;
  }

  return (
    <div className="container py-8 space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-cairo text-primary">لوحة التحكم</h1>
          <p className="text-muted-foreground font-tajawal">إدارة جميع المطالبات في مكان واحد</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="font-tajawal gap-2">
            <Filter className="h-4 w-4" />
            تصفية
          </Button>
          <Button className="font-tajawal bg-primary hover:bg-primary/90">تصدير التقرير</Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatsCard title="إجمالي المطالبات" value={claims?.length || 0} />
        <StatsCard title="قيد الانتظار" value={claims?.filter(c => c.status === 'new').length || 0} className="text-yellow-600 bg-yellow-50" />
        <StatsCard title="قيد المعالجة" value={claims?.filter(c => c.status === 'processing').length || 0} className="text-blue-600 bg-blue-50" />
        <StatsCard title="مغلقة / تسوية" value={claims?.filter(c => c.status === 'settled').length || 0} className="text-green-600 bg-green-50" />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="font-cairo text-lg">أحدث المطالبات</CardTitle>
          <div className="w-64">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="بحث برقم المطالبة..." className="pr-9 font-tajawal" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رقم المطالبة</TableHead>
                <TableHead className="text-right">العميل</TableHead>
                <TableHead className="text-right">النوع</TableHead>
                <TableHead className="text-right">التاريخ</TableHead>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-center">إجراءات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {claims?.map((claim) => (
                <TableRow key={claim.id} className="hover:bg-muted/50">
                  <TableCell className="font-mono font-medium">{claim.claimId}</TableCell>
                  <TableCell className="font-tajawal">{claim.customerName}</TableCell>
                  <TableCell className="font-tajawal">
                    طيران
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {format(new Date(claim.createdAt || new Date()), "yyyy/MM/dd", { locale: ar })}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={claim.status} />
                  </TableCell>
                  <TableCell className="text-center">
                    <Link href={`/admin/claims/${claim.id}`}>
                      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                        <Eye className="h-4 w-4 text-primary" />
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatsCard({ title, value, className = "" }: { title: string, value: number, className?: string }) {
  return (
    <Card className={`border-none shadow-sm ${className}`}>
      <CardContent className="p-6">
        <p className="text-sm font-medium font-tajawal text-muted-foreground mb-1">{title}</p>
        <h3 className="text-3xl font-bold font-mono">{value}</h3>
      </CardContent>
    </Card>
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
    processing: "معالجة",
    approved: "مقبولة",
    rejected: "مرفوضة",
    settled: "تسوية",
  };
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold font-tajawal ${styles[status]}`}>
      {labels[status] || status}
    </span>
  );
}
