import { ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="bg-muted/30 border-t mt-auto">
      <div className="container py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold font-cairo text-primary">سند</span>
            </div>
            <p className="text-sm text-muted-foreground font-tajawal leading-relaxed">
              نساعدك في الحصول على تعويضاتك المستحقة عن مشاكل الطيران والتوصيل. نحن سندك القانوني.
            </p>
          </div>
          
          <div>
            <h3 className="font-bold mb-4 font-cairo">روابط سريعة</h3>
            <ul className="space-y-2 text-sm font-tajawal">
              <li><a href="/" className="text-muted-foreground hover:text-primary transition-colors">الرئيسية</a></li>
              <li><a href="/new" className="text-muted-foreground hover:text-primary transition-colors">تقديم مطالبة</a></li>
              <li><a href="/track" className="text-muted-foreground hover:text-primary transition-colors">تتبع حالة الطلب</a></li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-4 font-cairo">تواصل معنا</h3>
            <ul className="space-y-2 text-sm font-tajawal">
              <li className="text-muted-foreground">support@sanad.sa</li>
              <li className="text-muted-foreground">الرياض، المملكة العربية السعودية</li>
            </ul>
          </div>
          
          <div>
            <h3 className="font-bold mb-4 font-cairo">قانوني</h3>
            <ul className="space-y-2 text-sm font-tajawal">
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">سياسة الخصوصية</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">الشروط والأحكام</a></li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t text-center text-sm text-muted-foreground font-tajawal">
          © {new Date().getFullYear()} سند للمطالبات. جميع الحقوق محفوظة.
        </div>
      </div>
    </footer>
  );
}
