import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, 
  Loader2, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  FileText, 
  Plane,
  Package,
  ArrowLeft,
  Calendar,
  Building2,
  AlertCircle,
  History,
  Filter
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { motion } from "framer-motion";
import { Link } from "wouter";
import type { Claim } from "@shared/schema";

export default function MyClaimsHistory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [claimIdSearch, setClaimIdSearch] = useState("");
  const [searchedPhone, setSearchedPhone] = useState("");
  const [searchedClaimId, setSearchedClaimId] = useState("");

  const { data: claims, isLoading, error, refetch } = useQuery<Claim[]>({
    queryKey: [`/api/claims/history/${searchedPhone}?verifyClaimId=${searchedClaimId}`],
    enabled: !!searchedPhone && !!searchedClaimId,
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (phoneSearch.trim() && claimIdSearch.trim()) {
      setSearchedPhone(phoneSearch.trim());
      setSearchedClaimId(claimIdSearch.trim());
    }
  };

  const filteredClaims = claims?.filter(claim => {
    const matchesSearch = searchQuery === "" || 
      claim.claimId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.companyName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      claim.customerName?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || claim.status === statusFilter;
    const matchesType = typeFilter === "all" || claim.category === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  }) || [];

  const statusConfig: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    new: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-700 dark:text-blue-400", icon: Clock, label: "جديد" },
    need_info: { bg: "bg-yellow-100 dark:bg-yellow-900/30", text: "text-yellow-700 dark:text-yellow-400", icon: AlertCircle, label: "بحاجة لمعلومات" },
    in_review: { bg: "bg-purple-100 dark:bg-purple-900/30", text: "text-purple-700 dark:text-purple-400", icon: FileText, label: "قيد المراجعة" },
    submitted: { bg: "bg-indigo-100 dark:bg-indigo-900/30", text: "text-indigo-700 dark:text-indigo-400", icon: FileText, label: "تم الإرسال" },
    resolved: { bg: "bg-green-100 dark:bg-green-900/30", text: "text-green-700 dark:text-green-400", icon: CheckCircle2, label: "تمت التسوية" },
    rejected: { bg: "bg-red-100 dark:bg-red-900/30", text: "text-red-700 dark:text-red-400", icon: XCircle, label: "مرفوضة" },
  };

  return (
    <div className="min-h-[80svh] py-8 md:py-16 px-4">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-4"
        >
          <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mb-4">
            <History className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">سجل المطالبات</h1>
          <p className="text-muted-foreground">اطلع على جميع مطالباتك السابقة وحالتها</p>
        </motion.div>

        {/* Phone & Claim ID Search Form */}
        {!searchedPhone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="shadow-xl border-primary/10 overflow-hidden">
              <CardContent className="p-6 md:p-8">
                <form onSubmit={handleSearch} className="space-y-5">
                  <p className="text-sm text-muted-foreground text-center mb-4">
                    للوصول إلى سجل مطالباتك، يرجى إدخال رقم الجوال ورقم أي مطالبة سابقة للتحقق
                  </p>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium">رقم الجوال</label>
                      <Input 
                        value={phoneSearch} 
                        onChange={e => setPhoneSearch(e.target.value)} 
                        placeholder="05xxxxxxxx"
                        className="h-12 rounded-xl font-mono text-left"
                        dir="ltr"
                        data-testid="input-phone-search"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">رقم المطالبة للتحقق</label>
                      <Input 
                        value={claimIdSearch} 
                        onChange={e => setClaimIdSearch(e.target.value)} 
                        placeholder="SAN-202X-XXXX"
                        className="h-12 rounded-xl font-mono text-left"
                        dir="ltr"
                        data-testid="input-claimid-search"
                      />
                    </div>
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full h-14 text-lg rounded-2xl shadow-lg btn-gradient" 
                    disabled={!phoneSearch.trim() || !claimIdSearch.trim()}
                    data-testid="button-search-claims"
                  >
                    <Search className="ml-2 h-5 w-5" />
                    عرض المطالبات
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Claims List */}
        {searchedPhone && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Filters */}
            <Card className="shadow-lg border-primary/10">
              <CardContent className="p-4 md:p-6">
                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Filter className="h-4 w-4" />
                    <span className="text-sm font-medium">تصفية:</span>
                  </div>
                  <div className="flex flex-wrap gap-3 flex-1">
                    <Input
                      placeholder="بحث برقم المطالبة أو الشركة..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full md:w-64 h-9"
                      data-testid="input-filter-search"
                    />
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40 h-9" data-testid="select-status-filter">
                        <SelectValue placeholder="الحالة" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الحالات</SelectItem>
                        <SelectItem value="new">جديد</SelectItem>
                        <SelectItem value="in_review">قيد المراجعة</SelectItem>
                        <SelectItem value="need_info">بحاجة لمعلومات</SelectItem>
                        <SelectItem value="submitted">تم الإرسال</SelectItem>
                        <SelectItem value="resolved">تمت التسوية</SelectItem>
                        <SelectItem value="rejected">مرفوضة</SelectItem>
                      </SelectContent>
                    </Select>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-40 h-9" data-testid="select-type-filter">
                        <SelectValue placeholder="النوع" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">كل الأنواع</SelectItem>
                        <SelectItem value="flight">رحلات طيران</SelectItem>
                        <SelectItem value="delivery">توصيل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => { setSearchedPhone(""); setSearchedClaimId(""); }}
                    data-testid="button-change-phone"
                  >
                    تغيير البيانات
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Loading State */}
            {isLoading && (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Error State */}
            {error && (
              <Card className="border-destructive/20 bg-destructive/5">
                <CardContent className="p-6 text-center">
                  <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                  <p className="text-destructive font-medium">حدث خطأ أثناء جلب المطالبات</p>
                  <Button variant="outline" className="mt-4" onClick={() => refetch()}>
                    إعادة المحاولة
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Empty State */}
            {!isLoading && !error && filteredClaims.length === 0 && (
              <Card className="border-muted">
                <CardContent className="p-8 text-center">
                  <div className="w-16 h-16 mx-auto bg-muted rounded-2xl flex items-center justify-center mb-4">
                    <FileText className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">لا توجد مطالبات</h3>
                  <p className="text-muted-foreground text-sm mb-6">
                    {claims && claims.length > 0 
                      ? "لا توجد مطالبات تطابق معايير البحث"
                      : "لم يتم العثور على مطالبات مرتبطة بهذا الرقم"}
                  </p>
                  <Link href="/new">
                    <Button className="btn-gradient" data-testid="button-new-claim">
                      تقديم مطالبة جديدة
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Claims Grid */}
            {!isLoading && !error && filteredClaims.length > 0 && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  عرض {filteredClaims.length} من {claims?.length} مطالبة
                </p>
                {filteredClaims.map((claim, idx) => {
                  const statusInfo = statusConfig[claim.status] || statusConfig.new;
                  const StatusIcon = statusInfo.icon;
                  const TypeIcon = claim.category === "flight" ? Plane : Package;

                  return (
                    <motion.div
                      key={claim.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                    >
                      <Card className="shadow-md border-primary/5 hover-elevate transition-all" data-testid={`card-claim-${claim.id}`}>
                        <CardContent className="p-0">
                          <div className="flex flex-col md:flex-row">
                            {/* Main Info */}
                            <div className="flex-1 p-4 md:p-6">
                              <div className="flex items-start justify-between gap-4 mb-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                                    <TypeIcon className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-mono text-sm text-muted-foreground">{claim.claimId}</p>
                                    <h3 className="font-bold">{claim.companyName}</h3>
                                  </div>
                                </div>
                                <Badge className={`${statusInfo.bg} ${statusInfo.text} border-0`}>
                                  <StatusIcon className="h-3 w-3 ml-1" />
                                  {statusInfo.label}
                                </Badge>
                              </div>

                              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <FileText className="h-4 w-4" />
                                  <span>{claim.issueType}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Calendar className="h-4 w-4" />
                                  <span>{format(new Date(claim.createdAt || new Date()), "dd MMM yyyy", { locale: ar })}</span>
                                </div>
                                <div className="flex items-center gap-2 text-muted-foreground">
                                  <Building2 className="h-4 w-4" />
                                  <span>{claim.category === "flight" ? "رحلة طيران" : "توصيل"}</span>
                                </div>
                              </div>
                            </div>

                            {/* Action */}
                            <div className="border-t md:border-t-0 md:border-r p-4 md:p-6 flex items-center justify-center bg-muted/30">
                              <Link href={`/track?id=${claim.claimId}&phone=${searchedPhone}`}>
                                <Button variant="ghost" size="sm" data-testid={`button-view-claim-${claim.id}`}>
                                  عرض التفاصيل
                                  <ArrowLeft className="h-4 w-4 mr-2" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
