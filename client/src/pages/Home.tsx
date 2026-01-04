import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plane, Package, ChevronLeft, ArrowRight, Shield, Clock, Coins } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-background pt-24 pb-32">
        <div className="container relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-6 text-right"
            >
              <h1 className="text-5xl md:text-6xl font-black text-foreground leading-tight font-cairo">
                حقك <span className="text-primary">محفوظ</span><br/>
                ومطالبتك <span className="text-accent">مضمونة</span>
              </h1>
              <p className="text-xl text-muted-foreground font-tajawal leading-relaxed max-w-lg">
                هل واجهت مشاكل في رحلتك أو توصيل طلباتك؟
                منصة سند تساعدك في الحصول على التعويض المستحق بكل سهولة وموثوقية.
              </p>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <Link href="/new">
                  <Button size="lg" className="h-14 px-8 text-lg font-cairo shadow-lg shadow-primary/25 hover:shadow-xl hover:-translate-y-1 transition-all">
                    ابدأ مطالبة جديدة
                    <ChevronLeft className="mr-2 h-5 w-5" />
                  </Button>
                </Link>
                <Link href="/track">
                  <Button size="lg" variant="outline" className="h-14 px-8 text-lg font-cairo border-2 hover:bg-background/50">
                    تتبع حالة الطلب
                  </Button>
                </Link>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative"
            >
              <div className="relative z-10 grid grid-cols-2 gap-4">
                <div className="space-y-4 mt-8">
                  <div className="bg-white p-6 rounded-2xl shadow-xl border border-primary/10">
                    <Plane className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-bold font-cairo mb-2">تعويضات الطيران</h3>
                    <p className="text-muted-foreground font-tajawal">تأخير الرحلات، إلغاء الحجز، وفقدان الأمتعة.</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-xl border border-accent/20 bg-gradient-to-br from-accent/5 to-transparent">
                    <Coins className="h-10 w-10 text-accent mb-4" />
                    <h3 className="text-xl font-bold font-cairo mb-2">رسوم شفافة</h3>
                    <p className="text-muted-foreground font-tajawal">لا تدفع أي رسوم إلا بعد نجاح مطالبتك.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-primary p-6 rounded-2xl shadow-xl text-primary-foreground">
                    <Shield className="h-10 w-10 mb-4 text-white/90" />
                    <h3 className="text-xl font-bold font-cairo mb-2">خبراء قانونيون</h3>
                    <p className="text-primary-foreground/80 font-tajawal">فريق متخصص يتابع قضيتك حتى النهاية.</p>
                  </div>
                  <div className="bg-white p-6 rounded-2xl shadow-xl border border-primary/10">
                    <Package className="h-10 w-10 text-primary mb-4" />
                    <h3 className="text-xl font-bold font-cairo mb-2">تعويضات التوصيل</h3>
                    <p className="text-muted-foreground font-tajawal">تأخر الطلبات، تلف الشحنات، وأخطاء المتاجر.</p>
                  </div>
                </div>
              </div>
              
              {/* Decorative elements */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/5 rounded-full blur-3xl -z-10" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 bg-white">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold font-cairo mb-4">كيف تعمل منصة سند؟</h2>
            <p className="text-muted-foreground font-tajawal">خطوات بسيطة تفصلك عن استرجاع حقوقك</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* Connecting Line */}
            <div className="hidden md:block absolute top-12 right-0 left-0 h-0.5 bg-gradient-to-l from-transparent via-primary/20 to-transparent" />

            {[
              {
                icon: FileText,
                title: "قدم طلبك",
                desc: "أجب عن بعض الأسئلة البسيطة وارفع المستندات المطلوبة في دقائق."
              },
              {
                icon: Clock,
                title: "نحن نتابع",
                desc: "يقوم فريقنا القانوني بدراسة الحالة والتفاوض مع الشركات نيابة عنك."
              },
              {
                icon: Coins,
                title: "استلم تعويضك",
                desc: "بمجرد نجاح المطالبة، نقوم بتحويل المبلغ لحسابك بعد خصم أتعابنا."
              }
            ].map((step, i) => (
              <div key={i} className="relative bg-background rounded-2xl p-8 text-center border hover:border-primary/30 transition-all hover:shadow-lg group z-10">
                <div className="w-16 h-16 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform duration-300">
                  <step.icon className="h-8 w-8" />
                </div>
                <h3 className="text-xl font-bold font-cairo mb-3">{step.title}</h3>
                <p className="text-muted-foreground font-tajawal">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1556761175-5973dc0f32e7?q=80&w=2000&auto=format&fit=crop')] opacity-10 mix-blend-overlay bg-cover bg-center">
          {/* Unsplash: Meeting/Handshake representing agreement */}
        </div>
        <div className="container relative z-10 text-center">
          <h2 className="text-3xl md:text-4xl font-bold font-cairo mb-6">لا تتنازل عن حقوقك</h2>
          <p className="text-xl text-primary-foreground/90 font-tajawal mb-8 max-w-2xl mx-auto">
            أكثر من 80% من المسافرين والمستهلكين لا يطالبون بحقوقهم. كن من الـ 20% الأذكياء واستعد حقك الآن.
          </p>
          <Link href="/new">
            <Button size="lg" variant="secondary" className="h-14 px-8 text-lg font-cairo shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all text-primary">
              ابدأ المطالبة الآن
              <ChevronLeft className="mr-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

// Importing icons here to fix reference in map function
import { FileText } from "lucide-react";
