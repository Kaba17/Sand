import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCreateClaim } from "@/hooks/use-claims";
import { insertClaimSchema } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileUpload } from "@/components/ui/FileUpload";
import { CheckCircle2, Plane, Package, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Link } from "wouter";

// Extended schema for frontend validation
const wizardSchema = insertClaimSchema.extend({
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "يجب الموافقة على الشروط والأحكام" }),
  }),
});

type WizardData = z.infer<typeof wizardSchema>;

export default function ClaimWizard() {
  const [step, setStep] = useState(1);
  const [claimId, setClaimId] = useState<string | null>(null);
  const createClaim = useCreateClaim();

  const form = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      category: "flight",
      status: "new",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      description: "",
      termsAccepted: false,
    },
    mode: "onChange",
  });

  const { register, handleSubmit, watch, setValue, formState: { errors, isValid } } = form;
  const category = watch("category");

  const onSubmit = (data: WizardData) => {
    createClaim.mutate(data, {
      onSuccess: (response) => {
        setClaimId(response.claimId);
        setStep(4); // Success step
      },
    });
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  if (step === 4 && claimId) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full p-8 text-center space-y-6 shadow-2xl border-primary/20">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10 text-green-600" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold font-cairo text-primary">تم استلام طلبك بنجاح!</h2>
            <p className="text-muted-foreground font-tajawal">رقم المطالبة الخاص بك هو:</p>
            <div className="bg-muted p-4 rounded-lg border-2 border-dashed border-primary/30 mt-4">
              <span className="text-3xl font-mono font-bold tracking-wider text-foreground">{claimId}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-4 font-tajawal">
              يرجى الاحتفاظ بهذا الرقم لمتابعة حالة الطلب. سنقوم بمراسلتك عبر الواتساب والبريد الإلكتروني بأي مستجدات.
            </p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Link href="/track">
              <Button className="w-full font-cairo">تتبع حالة الطلب</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full font-cairo">العودة للرئيسية</Button>
            </Link>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-12">
          <div className="flex justify-between mb-4 font-tajawal text-sm font-medium text-muted-foreground">
            <span className={step >= 1 ? "text-primary" : ""}>نوع المطالبة</span>
            <span className={step >= 2 ? "text-primary" : ""}>تفاصيل المشكلة</span>
            <span className={step >= 3 ? "text-primary" : ""}>بيانات التواصل</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-primary"
              initial={{ width: "0%" }}
              animate={{ width: `${((step - 1) / 2) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold font-cairo">اختر نوع المطالبة</h1>
                  <p className="text-muted-foreground font-tajawal">ما هو نوع الخدمة التي واجهت مشكلة فيها؟</p>
                </div>

                <RadioGroup 
                  onValueChange={(val) => setValue("category", val)} 
                  defaultValue={category}
                  className="grid grid-cols-1 md:grid-cols-2 gap-6"
                >
                  <Label 
                    className={`cursor-pointer border-2 rounded-2xl p-6 transition-all hover:border-primary/50 ${category === 'flight' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                  >
                    <RadioGroupItem value="flight" className="sr-only" />
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className={`p-4 rounded-full ${category === 'flight' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Plane className="h-8 w-8" />
                      </div>
                      <div>
                        <span className="block text-lg font-bold font-cairo">طيران</span>
                        <span className="text-sm text-muted-foreground font-tajawal mt-1">تأخير، إلغاء، أمتعة</span>
                      </div>
                    </div>
                  </Label>

                  <Label 
                    className={`cursor-pointer border-2 rounded-2xl p-6 transition-all hover:border-primary/50 ${category === 'delivery' ? 'border-primary bg-primary/5' : 'border-border bg-card'}`}
                  >
                    <RadioGroupItem value="delivery" className="sr-only" />
                    <div className="flex flex-col items-center text-center gap-4">
                      <div className={`p-4 rounded-full ${category === 'delivery' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>
                        <Package className="h-8 w-8" />
                      </div>
                      <div>
                        <span className="block text-lg font-bold font-cairo">توصيل</span>
                        <span className="text-sm text-muted-foreground font-tajawal mt-1">تطبيقات التوصيل، متاجر إلكترونية</span>
                      </div>
                    </div>
                  </Label>
                </RadioGroup>

                <div className="flex justify-end">
                  <Button type="button" onClick={nextStep} size="lg" className="px-8 font-cairo">
                    التالي
                    <ChevronLeft className="mr-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold font-cairo">تفاصيل المشكلة</h1>
                  <p className="text-muted-foreground font-tajawal">زودنا بتفاصيل أكثر لنتمكن من مساعدتك</p>
                </div>

                <div className="grid gap-6 bg-card p-6 rounded-2xl border shadow-sm">
                  <div className="space-y-2">
                    <Label className="font-tajawal">نوع المشكلة</Label>
                    <Input {...register("issueType")} placeholder="مثال: تأخير أكثر من 3 ساعات" className="font-tajawal" />
                    {errors.issueType && <span className="text-destructive text-xs">{errors.issueType.message}</span>}
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="font-tajawal">{category === 'flight' ? 'اسم شركة الطيران' : 'اسم التطبيق / المتجر'}</Label>
                      <Input {...register("companyName")} className="font-tajawal" />
                      {errors.companyName && <span className="text-destructive text-xs">{errors.companyName.message}</span>}
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="font-tajawal">{category === 'flight' ? 'رقم الرحلة / الحجز' : 'رقم الطلب'}</Label>
                      <Input {...register("referenceNumber")} className="font-tajawal" />
                      {errors.referenceNumber && <span className="text-destructive text-xs">{errors.referenceNumber.message}</span>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="font-tajawal">تاريخ الحادثة</Label>
                    <Input type="date" {...register("incidentDate")} className="font-tajawal" />
                    {errors.incidentDate && <span className="text-destructive text-xs">{errors.incidentDate.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-tajawal">وصف المشكلة</Label>
                    <Textarea 
                      {...register("description")} 
                      placeholder="اشرح ما حدث بالتفصيل..." 
                      className="h-32 font-tajawal" 
                    />
                    {errors.description && <span className="text-destructive text-xs">{errors.description.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-tajawal">المرفقات (صور، فواتير، تذاكر)</Label>
                    <FileUpload onUploadComplete={(file) => console.log("Uploaded", file)} />
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={prevStep} size="lg" className="px-8 font-cairo">
                    <ChevronRight className="ml-2 h-4 w-4" />
                    السابق
                  </Button>
                  <Button type="button" onClick={nextStep} size="lg" className="px-8 font-cairo">
                    التالي
                    <ChevronLeft className="mr-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-8"
              >
                <div className="text-center space-y-2">
                  <h1 className="text-3xl font-bold font-cairo">بيانات التواصل</h1>
                  <p className="text-muted-foreground font-tajawal">كيف يمكننا التواصل معك بخصوص التعويض؟</p>
                </div>

                <div className="grid gap-6 bg-card p-6 rounded-2xl border shadow-sm">
                  <div className="space-y-2">
                    <Label className="font-tajawal">الاسم الكامل</Label>
                    <Input {...register("customerName")} className="font-tajawal" />
                    {errors.customerName && <span className="text-destructive text-xs">{errors.customerName.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-tajawal">رقم الجوال</Label>
                    <Input {...register("customerPhone")} type="tel" placeholder="05xxxxxxxx" className="font-tajawal" />
                    {errors.customerPhone && <span className="text-destructive text-xs">{errors.customerPhone.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label className="font-tajawal">البريد الإلكتروني</Label>
                    <Input {...register("customerEmail")} type="email" className="font-tajawal" />
                    {errors.customerEmail && <span className="text-destructive text-xs">{errors.customerEmail.message}</span>}
                  </div>

                  <div className="flex items-center space-x-2 space-x-reverse pt-4">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      {...register("termsAccepted")}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <Label htmlFor="terms" className="text-sm font-tajawal cursor-pointer">
                      أوافق على <span className="text-primary underline">الشروط والأحكام</span> وسياسة الخصوصية وتوكيل منصة سند بالمطالبة نيابة عني.
                    </Label>
                  </div>
                  {errors.termsAccepted && <span className="text-destructive text-xs block">{errors.termsAccepted.message}</span>}
                </div>

                <div className="flex justify-between">
                  <Button type="button" variant="ghost" onClick={prevStep} size="lg" className="px-8 font-cairo">
                    <ChevronRight className="ml-2 h-4 w-4" />
                    السابق
                  </Button>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="px-8 font-cairo min-w-[140px]"
                    disabled={createClaim.isPending}
                  >
                    {createClaim.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "إرسال المطالبة"}
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
