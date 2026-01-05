import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { ShieldCheck, User, LogOut, LayoutDashboard, Menu, X, Bot, History } from "lucide-react";
import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet";

export function Navbar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/new", label: "ابدأ مطالبة" },
    { href: "/track", label: "تتبع طلبي" },
    { href: "/history", label: "سجل المطالبات", icon: History },
    { href: "/agent", label: "الوكيل الذكي", icon: Bot },
  ];

  return (
    <nav className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled 
        ? 'glass-nav border-b shadow-sm' 
        : 'bg-transparent'
    }`}>
      <div className="container flex h-16 md:h-20 items-center justify-between px-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <ShieldCheck className="h-8 w-8 md:h-10 md:w-10 text-primary transition-transform group-hover:scale-110" />
          <span className="text-2xl md:text-3xl font-black text-gradient">سند</span>
        </Link>
        
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link 
              key={link.href}
              href={link.href} 
              className={`relative flex items-center gap-1.5 text-sm font-medium transition-colors hover:text-primary py-2 ${
                location === link.href ? 'text-primary' : 'text-muted-foreground'
              }`}
            >
              {link.icon && <link.icon className="h-4 w-4" />}
              {link.label}
              {location === link.href && (
                <span className="absolute -bottom-1 right-0 left-0 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          ))}
        </div>

        {/* Desktop Auth */}
        <div className="hidden md:flex items-center gap-4">
          {!user ? (
            <Link href="/api/login">
              <Button variant="outline" className="gap-2 rounded-xl">
                <User className="h-4 w-4" />
                دخول الموظفين
              </Button>
            </Link>
          ) : (
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <Button 
                  variant={location.startsWith('/admin') ? "default" : "ghost"} 
                  className="gap-2 rounded-xl"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  لوحة التحكم
                </Button>
              </Link>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 w-10 rounded-full p-0">
                    <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold shadow-md">
                      {user.firstName?.[0] || "A"}
                    </div>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem 
                    onClick={() => logout()} 
                    className="text-destructive focus:text-destructive cursor-pointer"
                  >
                    <LogOut className="ml-2 h-4 w-4" />
                    تسجيل الخروج
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Mobile Menu */}
        <Sheet>
          <SheetTrigger asChild className="md:hidden">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Menu className="h-6 w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 p-0">
            <div className="flex flex-col h-full">
              {/* Mobile Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-8 w-8 text-primary" />
                  <span className="text-2xl font-black text-gradient">سند</span>
                </div>
                <SheetClose asChild>
                  <Button variant="ghost" size="icon" className="rounded-xl">
                    <X className="h-5 w-5" />
                  </Button>
                </SheetClose>
              </div>

              {/* Mobile Links */}
              <div className="flex-1 p-4 space-y-2">
                {navLinks.map((link) => (
                  <SheetClose key={link.href} asChild>
                    <Link href={link.href}>
                      <div className={`flex items-center gap-3 p-4 rounded-2xl transition-colors ${
                        location === link.href 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}>
                        {link.icon && <link.icon className="h-5 w-5" />}
                        <span className="font-medium text-lg">{link.label}</span>
                      </div>
                    </Link>
                  </SheetClose>
                ))}
                
                {user && (
                  <SheetClose asChild>
                    <Link href="/admin">
                      <div className={`flex items-center gap-3 p-4 rounded-2xl transition-colors ${
                        location.startsWith('/admin') 
                          ? 'bg-primary text-primary-foreground' 
                          : 'hover:bg-muted'
                      }`}>
                        <LayoutDashboard className="h-5 w-5" />
                        <span className="font-medium text-lg">لوحة التحكم</span>
                      </div>
                    </Link>
                  </SheetClose>
                )}
              </div>

              {/* Mobile Auth */}
              <div className="p-4 border-t mobile-safe-bottom">
                {!user ? (
                  <Link href="/api/login">
                    <Button className="w-full h-14 text-lg rounded-2xl gap-2">
                      <User className="h-5 w-5" />
                      دخول الموظفين
                    </Button>
                  </Link>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-2xl">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center text-white font-bold text-lg">
                        {user.firstName?.[0] || "A"}
                      </div>
                      <div>
                        <div className="font-bold">{user.firstName} {user.lastName}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                    </div>
                    <Button 
                      variant="destructive" 
                      className="w-full h-12 rounded-2xl gap-2"
                      onClick={() => logout()}
                    >
                      <LogOut className="h-5 w-5" />
                      تسجيل الخروج
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
