import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Loader2, Save, Settings, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

export default function AdminSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [sdrToSar, setSdrToSar] = useState<string>("");

  const { data: settings, isLoading } = useQuery({
    queryKey: ["/api/admin/settings"],
    queryFn: async () => {
      const res = await fetch("/api/admin/settings");
      if (!res.ok) throw new Error("Failed to fetch settings");
      return res.json();
    },
  });

  useState(() => {
    if (settings?.SDR_TO_SAR) {
      setSdrToSar(settings.SDR_TO_SAR);
    }
  });

  const updateSettingMutation = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return await apiRequest("POST", "/api/admin/settings", { key, value });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/settings"] });
      toast({ title: "تم حفظ الإعدادات بنجاح" });
    },
    onError: () => {
      toast({ title: "فشل في حفظ الإعدادات", variant: "destructive" });
    },
  });

  const handleSave = () => {
    updateSettingMutation.mutate({ key: "SDR_TO_SAR", value: sdrToSar });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto" dir="rtl">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold font-cairo flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          إعدادات النظام
        </h1>
        <p className="text-muted-foreground font-tajawal">
          إدارة إعدادات المنصة والحسابات
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-cairo flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            إعدادات التعويضات
          </CardTitle>
          <CardDescription className="font-tajawal">
            تحديد قيم التحويل وحساب التعويضات
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              سعر تحويل SDR إلى SAR
            </Label>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Input
                  type="number"
                  step="0.01"
                  value={sdrToSar || settings?.SDR_TO_SAR || "5.1"}
                  onChange={(e) => setSdrToSar(e.target.value)}
                  className="h-12 rounded-xl text-lg font-mono"
                  dir="ltr"
                  data-testid="input-sdr-to-sar"
                />
              </div>
              <span className="text-muted-foreground text-sm">
                1 SDR = {sdrToSar || settings?.SDR_TO_SAR || "5.1"} ر.س
              </span>
            </div>
            <p className="text-xs text-muted-foreground">
              وحدة السحب الخاصة (SDR) تُستخدم في حساب التعويضات حسب لوائح الهيئة العامة للطيران المدني
            </p>
          </div>

          <div className="bg-muted/50 p-4 rounded-xl space-y-2">
            <h4 className="font-medium text-sm">جدول التعويضات المرجعي:</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>تأخير 3-6 ساعات: 50 SDR = {Math.round(50 * parseFloat(sdrToSar || settings?.SDR_TO_SAR || "5.1"))} ر.س</li>
              <li>تأخير أكثر من 6 ساعات: 150 SDR = {Math.round(150 * parseFloat(sdrToSar || settings?.SDR_TO_SAR || "5.1"))} ر.س</li>
              <li>إلغاء / رفض صعود: 150 SDR = {Math.round(150 * parseFloat(sdrToSar || settings?.SDR_TO_SAR || "5.1"))} ر.س</li>
            </ul>
          </div>

          <Button
            onClick={handleSave}
            disabled={updateSettingMutation.isPending}
            className="w-full h-12 rounded-xl font-tajawal"
            data-testid="button-save-settings"
          >
            {updateSettingMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin ml-2" />
            ) : (
              <Save className="h-5 w-5 ml-2" />
            )}
            حفظ الإعدادات
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
