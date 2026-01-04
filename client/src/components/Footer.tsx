import { Link } from "wouter";
import { ShieldCheck, Heart } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-card border-t py-12 mt-auto">
      <div className="container px-4">
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <span className="text-2xl font-black text-gradient">سند</span>
            </Link>
            <p className="text-muted-foreground text-sm leading-relaxed">
              منصة سند متخصصة في مساعدتك للحصول على التعويضات المستحقة من شركات الطيران ومتاجر التوصيل.
            </p>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-lg">روابط سريعة</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><Link href="/new" className="hover:text-primary transition-colors">ابدأ مطالبة جديدة</Link></li>
              <li><Link href="/track" className="hover:text-primary transition-colors">تتبع حالة الطلب</Link></li>
              <li><Link href="/" className="hover:text-primary transition-colors">الأسئلة الشائعة</Link></li>
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="font-bold text-lg">تواصل معنا</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>البريد: support@sanad.sa</li>
              <li>واتساب: 966500000000+</li>
              <li>متاحين على مدار الساعة</li>
            </ul>
          </div>
        </div>

        <div className="border-t pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} سند للمطالبات - جميع الحقوق محفوظة</p>
          <p className="flex items-center gap-1">
            صنع بـ <Heart className="h-4 w-4 text-red-500 fill-red-500" /> في السعودية
          </p>
        </div>
      </div>
    </footer>
  );
}
