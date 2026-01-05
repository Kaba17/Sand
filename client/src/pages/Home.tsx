import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Plane, Package, ChevronLeft, Shield, Clock, Coins, FileText, Star, ArrowDown, CheckCircle, Timer } from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { useRef } from "react";

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.6 }
};

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
};

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"]
  });
  
  const y = useTransform(scrollYProgress, [0, 1], [0, 150]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <div className="min-h-screen overflow-hidden">
      {/* Hero Section */}
      <section ref={heroRef} className="relative min-h-[100svh] flex items-center justify-center overflow-hidden">
        {/* Animated Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-background to-background" />
                
        <div className="container relative z-10 px-4 py-20 md:py-0">
          <motion.div 
            style={{ opacity }}
            initial="initial"
            animate="animate"
            variants={staggerContainer}
            className="text-center max-w-4xl mx-auto space-y-8"
          >
            {/* Badge */}
            <motion.div variants={fadeUp} className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-medium">
              <Star className="w-4 h-4 fill-primary" />
              <span>موثوق من آلاف العملاء</span>
            </motion.div>
            
            {/* Main Heading */}
            <motion.h1 
              variants={fadeUp}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black leading-tight"
            >
              <span className="block">حقك</span>
              <span className="text-gradient">محفوظ معنا</span>
            </motion.h1>
            
            <motion.p 
              variants={fadeUp}
              className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-4"
            >
              هل واجهت مشاكل في رحلتك أو توصيل طلباتك؟
              منصة <span className="text-primary font-bold">سند</span> تساعدك في الحصول على التعويض المستحق بكل سهولة
            </motion.p>
            
            {/* CTA Buttons */}
            <motion.div 
              variants={fadeUp}
              className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
            >
              <Button 
                asChild
                size="lg" 
                data-testid="button-new-claim"
                className="w-full sm:w-auto h-14 px-8 text-lg font-bold rounded-2xl shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 hover:-translate-y-1 transition-all btn-gradient"
              >
                <Link href="/new">
                  ابدأ مطالبة جديدة
                  <ChevronLeft className="mr-2 h-5 w-5" />
                </Link>
              </Button>
              <Button 
                asChild
                size="lg" 
                variant="outline" 
                data-testid="button-track-claim"
                className="w-full sm:w-auto h-14 px-8 text-lg font-bold rounded-2xl border-2 hover:bg-muted/50"
              >
                <Link href="/track">
                  تتبع حالة الطلب
                </Link>
              </Button>
            </motion.div>
            
            {/* Trust Indicators */}
            <motion.div 
              variants={fadeUp}
              className="flex flex-wrap items-center justify-center gap-6 pt-8 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>بدون رسوم مقدمة</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>دعم على مدار الساعة</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span>نجاح مضمون أو مجاني</span>
              </div>
            </motion.div>
          </motion.div>
          
          {/* Scroll Indicator */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="absolute bottom-8 left-1/2 -translate-x-1/2"
          >
            <motion.div 
              animate={{ y: [0, 10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
              className="flex flex-col items-center gap-2 text-muted-foreground"
            >
              <span className="text-xs">اكتشف المزيد</span>
              <ArrowDown className="w-4 h-4" />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Service Cards */}
      <section className="py-20 md:py-32 bg-muted/30">
        <div className="container px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">خدماتنا</h2>
            <p className="text-muted-foreground text-lg">نساعدك في استرداد حقوقك من مختلف الخدمات</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* Flight Claims - Active */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="group relative bg-card rounded-3xl p-8 border shadow-sm card-hover overflow-hidden"
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center mb-6 shadow-lg">
                <Plane className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold mb-3">تعويضات الطيران</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">تأخير الرحلات، إلغاء الحجوزات، فقدان الأمتعة، ورفض الصعود.</p>
              
              <ul className="space-y-2">
                {["تعويض يصل لـ 600 يورو", "متابعة احترافية", "بدون رسوم مقدمة"].map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Delivery Claims - Coming Soon */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="relative bg-card rounded-3xl p-8 border shadow-sm overflow-hidden opacity-60"
            >
              <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 px-3 py-1.5 rounded-full text-sm font-bold">
                <Timer className="h-4 w-4" />
                قريباً
              </div>

              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-pink-400 flex items-center justify-center mb-6 shadow-lg">
                <Package className="h-8 w-8 text-white" />
              </div>
              
              <h3 className="text-2xl font-bold mb-3 text-muted-foreground">تعويضات التوصيل</h3>
              <p className="text-muted-foreground mb-6 leading-relaxed">تأخر الطلبات، تلف الشحنات، منتجات ناقصة، وأخطاء المتاجر.</p>
              
              <ul className="space-y-2">
                {["استرداد كامل المبلغ", "تعويض عن الأضرار", "حل سريع"].map((f, j) => (
                  <li key={j} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <CheckCircle className="w-4 h-4 text-muted-foreground/50 flex-shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-32">
        <div className="container px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center max-w-2xl mx-auto mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4">كيف تعمل المنصة؟</h2>
            <p className="text-muted-foreground text-lg">ثلاث خطوات بسيطة تفصلك عن استرجاع حقوقك</p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto relative">
            {/* Connecting Line - Desktop */}
            <div className="hidden md:block absolute top-24 right-[16%] left-[16%] h-0.5 bg-gradient-to-l from-primary/20 via-primary to-primary/20" />
            
            {[
              { icon: FileText, title: "قدم طلبك", desc: "أجب عن أسئلة بسيطة وارفع المستندات في دقائق معدودة.", num: "01" },
              { icon: Clock, title: "نحن نتابع", desc: "فريقنا يدرس الحالة ويتفاوض مع الشركات نيابة عنك.", num: "02" },
              { icon: Coins, title: "استلم تعويضك", desc: "بعد النجاح، نحول المبلغ لحسابك بعد خصم أتعابنا فقط.", num: "03" }
            ].map((step, i) => (
              <motion.div 
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 }}
                className="relative bg-card rounded-3xl p-8 text-center border shadow-sm card-hover"
              >
                <div className="absolute -top-4 right-8 bg-primary text-primary-foreground text-sm font-bold px-3 py-1 rounded-full">
                  {step.num}
                </div>
                <div className="w-20 h-20 mx-auto bg-gradient-to-br from-primary/10 to-primary/5 rounded-2xl flex items-center justify-center mb-6">
                  <step.icon className="h-10 w-10 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                <p className="text-muted-foreground leading-relaxed">{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-primary text-primary-foreground">
        <div className="container px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "5000+", label: "مطالبة ناجحة" },
              { value: "98%", label: "نسبة النجاح" },
              { value: "24/7", label: "دعم متواصل" },
              { value: "0", label: "رسوم مقدمة" }
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
              >
                <div className="text-3xl md:text-4xl font-black mb-2">{stat.value}</div>
                <div className="text-primary-foreground/80 text-sm">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32">
        <div className="container px-4">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative max-w-4xl mx-auto bg-gradient-to-br from-primary to-blue-600 rounded-3xl p-8 md:p-12 text-center text-white overflow-hidden shadow-2xl"
          >
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzMiAyIDIgNHMtMiA0LTIgNC0yLTItMi00eiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
            
            <div className="relative z-10">
              <Shield className="w-16 h-16 mx-auto mb-6 opacity-90" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">لا تتنازل عن حقوقك</h2>
              <p className="text-white/90 text-lg mb-8 max-w-2xl mx-auto">
                أكثر من 80% من المسافرين لا يطالبون بحقوقهم. كن من الأذكياء واستعد حقك الآن!
              </p>
              <Button 
                asChild
                size="lg" 
                variant="secondary" 
                data-testid="button-cta-new-claim"
                className="h-14 px-8 text-lg font-bold rounded-2xl shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all"
              >
                <Link href="/new">
                  ابدأ المطالبة الآن
                  <ChevronLeft className="mr-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
