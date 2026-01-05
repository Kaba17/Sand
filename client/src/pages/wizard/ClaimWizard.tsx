import { useState, useEffect } from "react";
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
import { Card, CardContent } from "@/components/ui/card";
import { 
  CheckCircle2, Plane, ChevronLeft, ChevronRight, Loader2, Sparkles, 
  Copy, Check, Clock, XCircle, AlertTriangle, Scale, Calculator, FileCheck
} from "lucide-react";
import { Link } from "wouter";

const SDR_TO_SAR = 5.1; // Default rate, can be fetched from settings

// Saudi phone pattern: starts with 05, 10 digits total
const saudiPhonePattern = /^05\d{8}$/;
// Flight number pattern: 2 alphanumeric chars (IATA code) + optional letter + 3-4 digits
// Examples: SV123, EK1234, F3123, 5F1234
// Also accepts 6-character booking reference numbers (like ABC123, KXYZ12)
const flightNumberPattern = /^([A-Z0-9]{2}[A-Z]?\d{3,4}|[A-Z0-9]{6})$/i;

const wizardSchema = insertClaimSchema.extend({
  customerPhone: z.string()
    .min(10, "رقم الجوال يجب أن يكون 10 أرقام")
    .max(10, "رقم الجوال يجب أن يكون 10 أرقام")
    .regex(saudiPhonePattern, "رقم الجوال يجب أن يبدأ بـ 05 ويكون 10 أرقام"),
  referenceNumber: z.string()
    .min(1, "رقم الرحلة أو الحجز مطلوب")
    .regex(flightNumberPattern, "أدخل رقم رحلة صحيح (مثال: SV123) أو رقم حجز (6 أحرف)"),
  incidentDate: z.string()
    .min(1, "تاريخ الرحلة مطلوب")
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(today.getDate() - 30);
      return selectedDate <= today && selectedDate >= thirtyDaysAgo;
    }, "التاريخ يجب أن يكون خلال آخر 30 يوم"),
  companyName: z.string().min(2, "اسم شركة الطيران مطلوب"),
  customerName: z.string().min(3, "الاسم الكامل مطلوب (3 أحرف على الأقل)"),
  description: z.string().min(10, "يرجى وصف المشكلة بالتفصيل (10 أحرف على الأقل)"),
  termsAccepted: z.literal(true, {
    errorMap: () => ({ message: "يجب الموافقة على الشروط والأحكام" }),
  }),
  consentGiven: z.literal(true, {
    errorMap: () => ({ message: "يجب الموافقة على التوكيل" }),
  }),
});

type WizardData = z.infer<typeof wizardSchema>;

const fadeSlide = {
  initial: { opacity: 0, x: 30 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -30 },
  transition: { duration: 0.3, ease: "easeOut" }
};

const DISRUPTION_TYPES = [
  { value: "delay", label: "تأخير الرحلة", icon: Clock, desc: "تأخرت رحلتي عن موعدها" },
  { value: "cancel", label: "إلغاء الرحلة", icon: XCircle, desc: "تم إلغاء رحلتي" },
  { value: "denied_boarding", label: "رفض الصعود", icon: AlertTriangle, desc: "رُفض صعودي للطائرة" },
  { value: "missed_connection", label: "فوات الاتصال", icon: Plane, desc: "فاتتني رحلتي التالية بسبب التأخير" },
];

function calculateEligibility(issueType: string, delayHours: number): { 
  status: string; 
  sdrAmount: number; 
  sarAmount: number;
  message: string;
} {
  if (issueType === "delay") {
    if (delayHours >= 6) {
      return {
        status: "likely_eligible",
        sdrAmount: 150,
        sarAmount: Math.round(150 * SDR_TO_SAR),
        message: "مؤهل للتعويض: 150 وحدة سحب خاصة"
      };
    } else if (delayHours >= 3) {
      return {
        status: "likely_eligible", 
        sdrAmount: 50,
        sarAmount: Math.round(50 * SDR_TO_SAR),
        message: "مؤهل للتعويض: 50 وحدة سحب خاصة"
      };
    } else {
      return {
        status: "not_eligible",
        sdrAmount: 0,
        sarAmount: 0,
        message: "التأخير أقل من 3 ساعات - قد لا تكون مؤهلاً للتعويض"
      };
    }
  } else if (issueType === "cancel") {
    return {
      status: "likely_eligible",
      sdrAmount: 150,
      sarAmount: Math.round(150 * SDR_TO_SAR),
      message: "مؤهل للتعويض: إلغاء الرحلة يستحق تعويضاً"
    };
  } else if (issueType === "denied_boarding") {
    return {
      status: "likely_eligible",
      sdrAmount: 150,
      sarAmount: Math.round(150 * SDR_TO_SAR),
      message: "مؤهل للتعويض: رفض الصعود يستحق تعويضاً"
    };
  } else if (issueType === "missed_connection") {
    return {
      status: "possibly_eligible",
      sdrAmount: 150,
      sarAmount: Math.round(150 * SDR_TO_SAR),
      message: "قد تكون مؤهلاً للتعويض حسب ظروف الرحلة"
    };
  }
  return { status: "unknown", sdrAmount: 0, sarAmount: 0, message: "" };
}

export default function ClaimWizard() {
  const [step, setStep] = useState(1);
  const [claimId, setClaimId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [eligibility, setEligibility] = useState<ReturnType<typeof calculateEligibility> | null>(null);
  const [delayHours, setDelayHours] = useState<number>(0);
  const createClaim = useCreateClaim();

  const form = useForm<WizardData>({
    resolver: zodResolver(wizardSchema),
    defaultValues: {
      category: "flight",
      customerName: "",
      customerPhone: "",
      customerEmail: "",
      description: "",
      issueType: "",
      companyName: "",
      referenceNumber: "",
      flightFrom: "",
      flightTo: "",
    },
    mode: "onChange",
  });

  const { register, handleSubmit, watch, setValue, formState: { errors } } = form;
  const issueType = watch("issueType");

  useEffect(() => {
    if (issueType && step === 3) {
      const result = calculateEligibility(issueType, delayHours);
      setEligibility(result);
      setValue("eligibilityStatus", result.status);
      setValue("estimatedSdrAmount", result.sdrAmount);
      setValue("estimatedSarAmount", result.sarAmount);
    }
  }, [issueType, delayHours, step, setValue]);

  const onSubmit = (data: WizardData) => {
    // API handles date string conversion automatically
    const submitData = {
      ...data,
      delayHours: delayHours,
    };
    createClaim.mutate(submitData as any, {
      onSuccess: (response) => {
        setClaimId(response.claimId);
        setStep(5);
      },
      onError: (error) => {
        console.error("Claim submission error:", error);
      },
    });
  };

  const nextStep = () => setStep(s => Math.min(s + 1, 5));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const copyToClipboard = () => {
    if (claimId) {
      navigator.clipboard.writeText(claimId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Success Screen (Step 5)
  if (step === 5 && claimId) {
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
            <div className="relative w-24 h-24 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
              <CheckCircle2 className="w-12 h-12 text-white" />
            </div>
          </motion.div>

          <div className="space-y-2">
            <h2 className="text-2xl md:text-3xl font-bold">تم استلام مطالبتك!</h2>
            <p className="text-muted-foreground">رقم المطالبة الخاص بك:</p>
          </div>

          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="relative group"
          >
            <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-6 rounded-3xl border-2 border-dashed border-primary/30">
              <span className="text-2xl md:text-3xl font-mono font-bold tracking-widest text-foreground" data-testid="text-claim-id">
                {claimId}
              </span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={copyToClipboard}
              className="absolute left-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid="button-copy-claim-id"
            >
              {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          </motion.div>

          <p className="text-sm text-muted-foreground px-4">
            احتفظ بهذا الرقم لمتابعة حالة المطالبة. سنتواصل معك قريباً.
          </p>

          <div className="flex flex-col gap-3 pt-4">
            <Link href="/track">
              <Button className="w-full h-14 text-lg rounded-2xl shadow-lg btn-gradient" data-testid="button-track-new-claim">
                تتبع حالة المطالبة
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full h-14 text-lg rounded-2xl" data-testid="button-back-home">
                العودة للرئيسية
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  const steps = [
    { num: 1, label: "بيانات الرحلة" },
    { num: 2, label: "نوع المشكلة" },
    { num: 3, label: "تحليل الأهلية" },
    { num: 4, label: "المستندات والتوكيل" },
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
              style={{ width: `${((step - 1) / 3) * 100}%` }}
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
            {/* Step 1: Flight Details */}
            {step === 1 && (
              <motion.div key="step1" {...fadeSlide} className="space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl flex items-center justify-center mb-4">
                    <Plane className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold">بيانات الرحلة</h1>
                  <p className="text-muted-foreground">أدخل معلومات رحلتك الأساسية</p>
                </div>

                <div className="space-y-5 bg-card p-6 md:p-8 rounded-3xl border shadow-sm">
                  <div className="space-y-2">
                    <Label>شركة الطيران *</Label>
                    <Input 
                      {...register("companyName")} 
                      placeholder="مثال: الخطوط السعودية" 
                      className={`h-12 rounded-xl ${errors.companyName ? 'border-destructive' : ''}`}
                      data-testid="input-airline"
                    />
                    {errors.companyName && <span className="text-destructive text-xs">{errors.companyName.message}</span>}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم الرحلة / الحجز *</Label>
                      <Input 
                        {...register("referenceNumber")} 
                        placeholder="SV123" 
                        className={`h-12 rounded-xl ${errors.referenceNumber ? 'border-destructive' : ''}`}
                        dir="ltr"
                        data-testid="input-flight-number"
                      />
                      {errors.referenceNumber && <span className="text-destructive text-xs">{errors.referenceNumber.message}</span>}
                    </div>
                    <div className="space-y-2">
                      <Label>تاريخ الرحلة *</Label>
                      <Input 
                        type="date" 
                        {...register("incidentDate")} 
                        className={`h-12 rounded-xl ${errors.incidentDate ? 'border-destructive' : ''}`}
                        data-testid="input-flight-date"
                        max={new Date().toISOString().split('T')[0]}
                      />
                      {errors.incidentDate && <span className="text-destructive text-xs">{errors.incidentDate.message}</span>}
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>من (مطار المغادرة)</Label>
                      <Input 
                        {...register("flightFrom")} 
                        placeholder="RUH - الرياض" 
                        className="h-12 rounded-xl"
                        data-testid="input-flight-from"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>إلى (مطار الوصول)</Label>
                      <Input 
                        {...register("flightTo")} 
                        placeholder="JED - جدة" 
                        className="h-12 rounded-xl"
                        data-testid="input-flight-to"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    type="button" 
                    onClick={nextStep} 
                    size="lg" 
                    className="h-14 px-8 text-lg rounded-2xl shadow-lg btn-gradient"
                    data-testid="button-next-step1"
                  >
                    التالي
                    <ChevronLeft className="mr-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Disruption Type */}
            {step === 2 && (
              <motion.div key="step2" {...fadeSlide} className="space-y-8">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl md:text-3xl font-bold">ما المشكلة التي واجهتها؟</h1>
                  <p className="text-muted-foreground">اختر نوع المشكلة التي حدثت في رحلتك</p>
                </div>

                <RadioGroup 
                  onValueChange={(val) => setValue("issueType", val)} 
                  defaultValue={issueType}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-4"
                >
                  {DISRUPTION_TYPES.map((type) => (
                    <Label 
                      key={type.value}
                      className={`
                        cursor-pointer border-2 rounded-3xl p-6 transition-all duration-300 
                        hover:border-primary/50 hover:shadow-lg
                        ${issueType === type.value 
                          ? 'border-primary bg-primary/5 shadow-lg shadow-primary/10' 
                          : 'border-border bg-card'
                        }
                      `}
                    >
                      <RadioGroupItem value={type.value} className="sr-only" />
                      <div className="flex flex-col items-center text-center gap-3">
                        <div className={`
                          p-3 rounded-xl transition-all duration-300
                          ${issueType === type.value 
                            ? 'bg-gradient-to-br from-primary to-blue-600 text-white shadow-lg' 
                            : 'bg-muted text-muted-foreground'
                          }
                        `}>
                          <type.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <span className="block font-bold">{type.label}</span>
                          <span className="text-xs text-muted-foreground">{type.desc}</span>
                        </div>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>

                {issueType === "delay" && (
                  <div className="bg-card p-6 rounded-3xl border shadow-sm space-y-4">
                    <Label className="text-lg font-medium">كم كانت مدة التأخير؟</Label>
                    <div className="flex flex-wrap gap-3">
                      {[
                        { hours: 1, label: "أقل من 3 ساعات" },
                        { hours: 4, label: "3-6 ساعات" },
                        { hours: 7, label: "أكثر من 6 ساعات" },
                      ].map((option) => (
                        <Button
                          key={option.hours}
                          type="button"
                          variant={delayHours === option.hours ? "default" : "outline"}
                          onClick={() => setDelayHours(option.hours)}
                          className="rounded-xl"
                          data-testid={`button-delay-${option.hours}`}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex justify-between gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={prevStep} size="lg" className="h-14 px-6 rounded-2xl" data-testid="button-prev-step2">
                    <ChevronRight className="ml-2 h-5 w-5" />
                    السابق
                  </Button>
                  <Button 
                    type="button" 
                    onClick={nextStep} 
                    size="lg" 
                    className="h-14 px-8 rounded-2xl shadow-lg btn-gradient flex-1 sm:flex-none"
                    disabled={!issueType || (issueType === "delay" && delayHours === 0)}
                    data-testid="button-next-step2"
                  >
                    التالي
                    <ChevronLeft className="mr-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 3: Eligibility Preview */}
            {step === 3 && (
              <motion.div key="step3" {...fadeSlide} className="space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl flex items-center justify-center mb-4">
                    <Calculator className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold">تحليل الأهلية</h1>
                  <p className="text-muted-foreground">بناءً على المعلومات المقدمة</p>
                </div>

                {eligibility && (
                  <Card className={`${
                    eligibility.status === "likely_eligible" ? "border-green-500 bg-green-50 dark:bg-green-950/20" :
                    eligibility.status === "possibly_eligible" ? "border-amber-500 bg-amber-50 dark:bg-amber-950/20" :
                    "border-red-500 bg-red-50 dark:bg-red-950/20"
                  }`}>
                    <CardContent className="p-6 space-y-6">
                      <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${
                          eligibility.status === "likely_eligible" ? "bg-green-500" :
                          eligibility.status === "possibly_eligible" ? "bg-amber-500" :
                          "bg-red-500"
                        }`}>
                          {eligibility.status === "likely_eligible" ? (
                            <CheckCircle2 className="h-8 w-8 text-white" />
                          ) : eligibility.status === "possibly_eligible" ? (
                            <AlertTriangle className="h-8 w-8 text-white" />
                          ) : (
                            <XCircle className="h-8 w-8 text-white" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-xl font-bold">
                            {eligibility.status === "likely_eligible" ? "مؤهل للتعويض!" :
                             eligibility.status === "possibly_eligible" ? "قد تكون مؤهلاً" :
                             "غير مؤهل"}
                          </h3>
                          <p className="text-muted-foreground">{eligibility.message}</p>
                        </div>
                      </div>

                      {eligibility.sdrAmount > 0 && (
                        <div className="bg-background rounded-2xl p-6 space-y-4">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <Scale className="h-5 w-5" />
                            <span className="font-medium">التعويض المتوقع</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div className="p-4 bg-muted/50 rounded-xl">
                              <div className="text-2xl font-bold text-primary">{eligibility.sdrAmount} SDR</div>
                              <div className="text-xs text-muted-foreground">وحدة سحب خاصة</div>
                            </div>
                            <div className="p-4 bg-muted/50 rounded-xl">
                              <div className="text-2xl font-bold text-green-600">{eligibility.sarAmount} ر.س</div>
                              <div className="text-xs text-muted-foreground">تقريباً</div>
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground bg-muted/30 p-4 rounded-xl">
                        <AlertTriangle className="h-4 w-4 inline ml-1" />
                        <strong>تنويه:</strong> الأهلية النهائية تعتمد على سبب التأخير (استثناءات: ظروف جوية، أمن الطيران). هذا تقدير أولي.
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="flex justify-between gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={prevStep} size="lg" className="h-14 px-6 rounded-2xl" data-testid="button-prev-step3">
                    <ChevronRight className="ml-2 h-5 w-5" />
                    السابق
                  </Button>
                  <Button 
                    type="button" 
                    onClick={nextStep} 
                    size="lg" 
                    className="h-14 px-8 rounded-2xl shadow-lg btn-gradient flex-1 sm:flex-none"
                    data-testid="button-next-step3"
                  >
                    متابعة
                    <ChevronLeft className="mr-2 h-5 w-5" />
                  </Button>
                </div>
              </motion.div>
            )}

            {/* Step 4: Evidence + Consent */}
            {step === 4 && (
              <motion.div key="step4" {...fadeSlide} className="space-y-8">
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-400 rounded-2xl flex items-center justify-center mb-4">
                    <FileCheck className="h-8 w-8 text-white" />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold">المستندات والتوكيل</h1>
                  <p className="text-muted-foreground">أكمل بياناتك للمتابعة</p>
                </div>

                <div className="space-y-5 bg-card p-6 md:p-8 rounded-3xl border shadow-sm">
                  <div className="space-y-2">
                    <Label>الاسم الكامل *</Label>
                    <Input 
                      {...register("customerName")} 
                      className={`h-12 rounded-xl ${errors.customerName ? 'border-destructive' : ''}`}
                      placeholder="الاسم الثلاثي"
                      data-testid="input-customer-name"
                    />
                    {errors.customerName && <span className="text-destructive text-xs">{errors.customerName.message}</span>}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>رقم الجوال *</Label>
                      <Input 
                        {...register("customerPhone")} 
                        type="tel" 
                        placeholder="05xxxxxxxx" 
                        className={`h-12 rounded-xl ${errors.customerPhone ? 'border-destructive' : ''}`}
                        dir="ltr"
                        maxLength={10}
                        data-testid="input-customer-phone"
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
                        data-testid="input-customer-email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>وصف المشكلة *</Label>
                    <Textarea 
                      {...register("description")} 
                      placeholder="اشرح ما حدث بالتفصيل..." 
                      className={`min-h-[100px] rounded-xl resize-none ${errors.description ? 'border-destructive' : ''}`}
                      data-testid="input-description"
                    />
                    {errors.description && <span className="text-destructive text-xs">{errors.description.message}</span>}
                  </div>

                  <div className="space-y-2">
                    <Label>المرفقات (بطاقة الصعود، التذكرة، إلخ)</Label>
                    <FileUpload onUploadComplete={(file) => console.log("Uploaded", file)} />
                  </div>
                </div>

                {/* Consent Section */}
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 p-6 rounded-3xl space-y-4">
                  <h3 className="font-bold text-lg flex items-center gap-2">
                    <Scale className="h-5 w-5 text-amber-600" />
                    التوكيل والموافقة
                  </h3>
                  
                  <div className="flex items-start gap-3 p-4 bg-background rounded-2xl">
                    <input 
                      type="checkbox" 
                      id="consent" 
                      {...register("consentGiven")}
                      className="h-5 w-5 mt-0.5 rounded border-2 border-primary text-primary focus:ring-primary"
                      data-testid="checkbox-consent"
                    />
                    <Label htmlFor="consent" className="text-sm cursor-pointer leading-relaxed">
                      أفوّض منصة <span className="text-primary font-bold">سند</span> بالتقدم بمطالبتي والتفاوض مع شركة الطيران نيابة عني، 
                      وأدرك أن الحصول على التعويض غير مضمون ويعتمد على ظروف الرحلة وقرار الناقل الجوي.
                    </Label>
                  </div>
                  {errors.consentGiven && <span className="text-destructive text-xs">{errors.consentGiven.message}</span>}

                  <div className="flex items-start gap-3 p-4 bg-background rounded-2xl">
                    <input 
                      type="checkbox" 
                      id="terms" 
                      {...register("termsAccepted")}
                      className="h-5 w-5 mt-0.5 rounded border-2 border-primary text-primary focus:ring-primary"
                      data-testid="checkbox-terms"
                    />
                    <Label htmlFor="terms" className="text-sm cursor-pointer leading-relaxed">
                      أوافق على <span className="text-primary underline font-medium">الشروط والأحكام</span> وسياسة الخصوصية.
                    </Label>
                  </div>
                  {errors.termsAccepted && <span className="text-destructive text-xs">{errors.termsAccepted.message}</span>}
                </div>

                <div className="flex justify-between gap-4 pt-4">
                  <Button type="button" variant="outline" onClick={prevStep} size="lg" className="h-14 px-6 rounded-2xl" data-testid="button-prev-step4">
                    <ChevronRight className="ml-2 h-5 w-5" />
                    السابق
                  </Button>
                  <Button 
                    type="submit" 
                    size="lg" 
                    className="h-14 px-8 rounded-2xl shadow-lg btn-gradient flex-1 sm:flex-none gap-2"
                    disabled={createClaim.isPending}
                    data-testid="button-submit-claim"
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
