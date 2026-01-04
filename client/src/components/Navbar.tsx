import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ShieldCheck, User, LogOut, LayoutDashboard } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  
  // Don't show navbar on wizard steps to keep focus? 
  // No, showing it is good for branding.

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <span className="text-2xl font-bold font-cairo text-primary">سند</span>
          </Link>
          
          <div className="hidden md:flex gap-6">
            <Link href="/" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/' ? 'text-primary' : 'text-muted-foreground'}`}>
              الرئيسية
            </Link>
            <Link href="/track" className={`text-sm font-medium transition-colors hover:text-primary ${location === '/track' ? 'text-primary' : 'text-muted-foreground'}`}>
              تتبع طلبي
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {!user ? (
            <Link href="/api/login">
              <Button variant="outline" className="gap-2 font-tajawal">
                <User className="h-4 w-4" />
                تسجيل دخول الموظفين
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <Button variant={location.startsWith('/admin') ? "default" : "ghost"} className="gap-2 font-tajawal">
                  <LayoutDashboard className="h-4 w-4" />
                  لوحة التحكم
                </Button>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-8 w-8 rounded-full p-0">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold border border-primary/20">
                      {user.firstName?.[0] || "A"}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 font-tajawal">
                  <DropdownMenuItem onClick={() => logout()} className="text-destructive focus:text-destructive cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4 ml-2" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
