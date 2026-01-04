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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { FileUpload } from "@/components/ui/FileUpload";
import { CheckCircle2, Plane, Package, ChevronLeft, ChevronRight, Loader2, Sparkles, Copy, Check } from "lucide-react";
import { Link } from "wouter";

const wizardSchema = insertClaimSchema.extend({
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "يجب الموافقة على الشروط والأحكام" }),
  }),
});

type WizardData = z.infer<typeof wizardSchema>;

const fadeSlide = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
  transition: { duration: 0.3, ease: "easeOut" }
};

export default function ClaimWizard() {
  const [step, setStep] = useState(1);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const createClaim = useCreateClaim();

  const form = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      category: "flight",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      description: "",
      termsAccepted: false,
    },
    mode: "onChange",
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const category = watch("category");

  const onSubmit = (data: WizardData) => {
    createClaim.mutate(data, {
      onSuccess: (response) => {
        setClaimId(response.claimId);
        setStep(4);
      },
    });
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const copyToClipboard = () => {
    if (claimId) {
      navigator.clipboard.writeText(claimId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Success Screen
  if (step === 4 && claimId) {
    return (
      <div className="min-h-[80svh] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full text-center space-y-8"
        >
          <motion.div 
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: "spring" }}
            className="relative mx-auto w-24 h-24"
          >
            <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse" />
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">تم استلام طلبك بنجاح!</h2>
            <p className="text-muted-foreground">رقم المطالبة الخاص بك:</p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative group"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-3xl border-2 border-dashed border-primary/30">
              <span className="text-2xl md:text-3xl font-mono font-bold tracking-widest text-foreground">
                {claimId}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyToClipboard}
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </motion.div>

          <p className="text-sm text-muted-foreground px-4">
            احتفظ بهذا الرقم لمتابعة حالة الطلب. سنتواصل معك عبر الواتساب والبريد الإلكتروني.
          </p>

          <div className="flex flex-col gap-3 pt-4">
            <Link href="/track">
              <Button className="w-full h-14 text-lg rounded-2xl shadow-lg btn-gradient">
                تتبع حالة الطلب
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full h-14 text-lg rounded-2xl">
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: "نوع المطالبة" },
    { num: 2, label: "التفاصيل" },
    { num: 3, label: "التواصل" },
  ];

  return (
    <div className="min-h-[80svh] py-8 md:py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 right-8 left-8 h-1 bg-muted rounded-full -z-10" />
            <div 
              className="absolute top-5 right-8 h-1 bg-primary rounded-full -z-10 transition-all duration-500"
              style={{ width: `${((step - 1) / 2) * 100}%` }}
            />
            
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center gap-2">
                <div className={`
                  w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300
                  ${step >= s.num 
                    ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' 
                    : 'bg-muted text-muted-foreground'
                  }
                `}>
                  {step > s.num ? <Check className="w-5 h-5" /> : s.num}
                </div>
                <span className={`text-xs font-medium hidden sm:block transition-colors ${
                  step >= s.num ? 'text-primary' : 'text-muted-foreground'
                }`}>
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)}>
          <AnimatePresence mode="wait">
            {/* Step 1: Category Selection */}
            {step === 1 && (
              <motion.div key="step1" {...fadeSlide} className="space-y-8">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl md:text-3xl font-bold">اختر نوع المطالبة</h1>
                  <p className="text-muted-foreground">ما هو نوع الخدمة التي واجهت مشكلة فيها؟</p>
                </div>

                <RadioGroup 
                  onValueChange={(val) => setValue("category", val)} 
                  defaultValue={category}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {[
                    { value: "flight", icon: Plane, title: "طيران", desc: "تأخير، إلغاء، أمتعة" },
                    { value: "delivery", icon: Package, title: "توصيل", desc: "متاجر إلكترونية، تطبيقات" }
                  ].map((opt) => (
                    <Label 
                      key={opt.value}
                      className={`
                        cursor-pointer border-2 rounded-3xl p-6 transition-all duration-300 
                        hover:border-primary/50 hover:shadow-lg
                        ${category === opt.value 
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
                          : 'border-border bg-card'
                        }
                      `}
                    >
                      <RadioGroupItem value={opt.value} className="sr-only" />
                      <div className="flex flex-col items-center text-center gap-4">
                        <div className={`
                          p-4 rounded-2xl transition-all duration-300
                          ${category === opt.value 
                            ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg' 
                            : 'bg-muted text-muted-foreground'
                          }
                        `}>
                          <opt.icon className="h-8 w-8" />
                        </div>
                        <div>
                          <span className="block text-lg font-bold">{opt.title}</span>
                          <span className="text-sm text-muted-foreground">{opt.desc}</span>
                        </div>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>

                <div className="flex justify-end pt-4">
                  <Button type="button" onClick={nextStep} size="lg" className="h-14 px-8 text-lg rounded-2xl shadow-lg btn-gradient">
                    التالي
                    <ChevronLeft className="mr-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Incident Details */}
            {step === 2 && (
              <motion.div key="step2" {...fadeSlide} className="space-y-8">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl md:text-3xl font-bold">تفاصيل المشكلة</h1>
                  <p className="text-muted-foreground">زودنا بالمعلومات المطلوبة</p>
                </div>

                <div className="space-y-5 bg-card p-6 md:p-8 rounded-3xl border shadow-sm">
                  <div className="space-y-2">
                    <Label>نوع المشكلة *</Label>
                    <Input 
                      {...register("issueType")} 
                      placeholder="مثال: تأخير أكثر من 3 ساعات" 
                      className="h-12 rounded-xl"
                    />
                    {errors.issueType && <span className="text-destructive text-xs">{errors.issueType.message}</span>}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>{category === 'flight' ? 'شركة الطيران *' : 'المتجر / التطبيق *'}</Label>
                      <Input {...register("companyName")} className="h-12 rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label>{category === 'flight' ? 'رقم الرحلة / الحجز *' : 'رقم الطلب *'}</Label>
                      <Input {...register("referenceNumber")} className="h-12 rounded-xl" dir="ltr" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>تاريخ الحادثة *</Label>
                    <Input type="date" {...register("incidentDate")} className="h-12 rounded-xl" />
                  </div>

                  <div className="space-y-2">
                    <Label>وصف المشكلة *</Label>
                    <Textarea 
                      {...register("description")} 
                      placeholder="اشرح ما حدث بالتفصيل..." 
                      className="min-h-[120px] rounded-xl resize-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>المرفقات (اختياري)</Label>
                    <FileUpload onUploadComplete={(file) => console.log("Uploaded", file)} />
                  </div>
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={prevStep} size="lg" className="h-14 px-6 rounded-2xl">
                    <ChevronRight className="ml-2 h-5 w-5" />
                    السابق
                  </Button>
                  <Button type="button" onClick={nextStep} size="lg" className="h-14 px-8 rounded-2xl shadow-lg btn-gradient flex-1 sm:flex-none">
                    التالي
                    <ChevronLeft className="mr-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Contact Info */}
            {step === 3 && (
              <motion.div key="step3" {...fadeSlide} className="space-y-8">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl md:text-3xl font-bold">بيانات التواصل</h1>
                  <p className="text-muted-foreground">كيف نتواصل معك؟</p>
                </div>

                <div className="space-y-5 bg-card p-6 md:p-8 rounded-3xl border shadow-sm">
                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <Input {...register("customerName")} className="h-12 rounded-xl" />
                    {errors.customerName && <span className="text-destructive text-xs">{errors.customerName.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label>رقم الجوال *</Label>
                    <Input 
                      {...register("customerPhone")} 
                      type="tel" 
                      placeholder="05xxxxxxxx" 
                      className="h-12 rounded-xl" 
                      dir="ltr"
                    />
                    {errors.customerPhone && <span className="text-destructive text-xs">{errors.customerPhone.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input 
                      {...register("customerEmail")} 
                      type="email" 
                      className="h-12 rounded-xl" 
                      dir="ltr"
                    />
                  </div>

                  <div className="flex items-start gap-3 pt-4 p-4 bg-muted/50 rounded-2xl">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      {...register("termsAccepted")}
                      className="h-5 w-5 mt-0.5 rounded border-2 border-primary text-primary focus:ring-primary"
                    />
                    <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                      أوافق على <span className="text-primary underline font-medium">الشروط والأحكام</span> وسياسة الخصوصية وتوكيل منصة سند بالمطالبة نيابة عني.
                    </Label>
                  </div>
                  {errors.termsAccepted && <span className="text-destructive text-xs">{errors.termsAccepted.message}</span>}
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={prevStep} size="lg" className="h-14 px-6 rounded-2xl">
                    <ChevronRight className="ml-2 h-5 w-5" />
                    السابق
                  </Button>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="h-14 px-8 rounded-2xl shadow-lg btn-gradient flex-1 sm:flex-none gap-2"
                    disabled={createClaim.isPending}
                  >
                    {createClaim.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        إرسال المطالبة
                      </>
                    )}
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
