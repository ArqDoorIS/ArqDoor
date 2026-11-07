import React, { useEffect, useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Menu, Home, Newspaper, Image, User, LogOut, MessageCircle, Link2, Users, LayoutDashboard } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/use-auth";
import { useUnreadCount } from "@/hooks/use-unread-count";
import { useDisponibilidade } from "@/hooks/use-disponibilidade";
import { getInitials } from "@/lib/utils";

// Header laranja nas telas logadas: logo branca, texto branco e nada em laranja por cima.
// Spec 2026-11-webapp-cores-do-app, decisão 5.
const logoSrc = "/images/landing/logo_branca.png";
const BOTAO_NO_HEADER = "text-white hover:bg-white/15 hover:text-white focus-visible:ring-white focus-visible:ring-offset-brand";

type NavLinkProps = {
  href: string;
  location: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
};

const NavLink = ({ href, location, icon: Icon, children }: NavLinkProps) => {
  const isActive = location === href;
  return (
    <Link href={href}>
      <div
        aria-current={isActive ? "page" : undefined}
        className={`flex items-center gap-1 text-sm text-white transition-colors ${
          isActive
            ? "font-semibold underline decoration-2 underline-offset-8"
            : "font-medium hover:text-brand-soft"
        }`}
      >
        <Icon className="w-4 h-4" /> {children}
      </div>
    </Link>
  );
};

const Navbar = () => {
  const [location, navigate] = useLocation();
  const { user, isLoggedIn, logout } = useAuth();
  const unreadCount = useUnreadCount();
  const { disponivel, toggleDisponibilidade, salvando } = useDisponibilidade();
  // Menu do celular controlado: sem isto ele continuava aberto por cima da página nova
  // depois de tocar num link (spec 2026-11-site-ganhos-rapidos).
  const [menuAberto, setMenuAberto] = useState(false);
  useEffect(() => {
    setMenuAberto(false);
  }, [location]);

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <nav className="fixed top-0 w-full z-50 h-16 bg-brand">
      <div className="container mx-auto px-4 h-full flex items-center justify-between">
        {/* Logo */}
        <Link href="/">
          <div className="flex items-center">
            {/* Logo já contém o nome "ArqDoor", texto extra removido */}
            <img src={logoSrc} alt="ArqDoor" className="h-8 w-auto" />
          </div>
        </Link>

        <div className="hidden md:block w-full max-w-md mx-8">
          {/* SearchBar removed */}
        </div>

        <div className="hidden md:flex items-center space-x-6">

          {isLoggedIn && (
            <>
              <NavLink href="/home" location={location} icon={Home}>
                {user?.type === "prestador" ? "Painel" : "Início"}
              </NavLink>
              {user?.type === "contratante" && (
                <NavLink href="/services" location={location} icon={Newspaper}>Serviços</NavLink>
              )}
              {user?.type === "contratante" && (
                <NavLink href="/connections" location={location} icon={Users}>Conexões</NavLink>
              )}
              {user?.type === "prestador" && (
                <NavLink href="/demands" location={location} icon={Image}>Demandas</NavLink>
              )}
              {user?.type === "prestador" && (
                <NavLink href="/convites" location={location} icon={Link2}>Convites</NavLink>
              )}
              <NavLink href="/kanban" location={location} icon={LayoutDashboard}>Kanban</NavLink>
            </>
          )}
          {isLoggedIn && (
            <Link href="/messages">
              <div className="relative">
                <Button variant="ghost" size="icon" aria-label="Messages" className={BOTAO_NO_HEADER}>
                  <MessageCircle className="h-5 w-5 text-white" />
                  {unreadCount > 0 && (
                    <span 
                      className={`absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-white text-brand-dark font-bold border-2 border-brand ${
                        unreadCount > 10 ? "h-3 w-3 p-0" : "h-5 w-5 text-[10px]"
                      }`}
                    >
                      {unreadCount <= 10 ? unreadCount : ""}
                    </span>
                  )}
                </Button>
              </div>
            </Link>
          )}
          {isLoggedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className={`relative h-8 w-8 rounded-full ${BOTAO_NO_HEADER}`}>
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.perfil || undefined} className="object-cover" />
                    <AvatarFallback className="bg-white text-brand-dark font-semibold">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href="/profile">
                    <User className="mr-2 h-4 w-4" /> <span>Perfil</span>
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {/* Chave de disponibilidade para trabalho (CA-01) */}
                <DropdownMenuItem
                  asChild
                  onSelect={(e) => e.preventDefault()}
                >
                  <button
                    role="switch"
                    aria-checked={disponivel}
                    aria-label="Disponível para trabalho"
                    disabled={salvando}
                    onClick={toggleDisponibilidade}
                    className="flex w-full cursor-pointer items-center gap-2 px-2 py-1.5 text-sm outline-none"
                  >
                    {/* Track */}
                    <span
                      className="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors"
                      style={{
                        backgroundColor: disponivel ? '#4caf50' : '#bbb0aa',
                      }}
                      aria-hidden="true"
                    >
                      {/* Thumb */}
                      <span
                        className="inline-block h-4 w-4 rounded-full bg-white shadow transition-transform"
                        style={{
                          transform: disponivel ? 'translateX(18px)' : 'translateX(2px)',
                        }}
                      />
                    </span>
                    <span>Disponível para trabalho</span>
                  </button>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" /> <span>Desconectar</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button
                variant="default"
                className="bg-white text-brand-dark hover:bg-brand-soft focus-visible:ring-white focus-visible:ring-offset-brand"
                onClick={() => navigate("/auth")}
              >
                Login
              </Button>
              {/* `/auth/register` não existia e caía no login. */}
              <Button
                variant="link"
                className="text-white focus-visible:ring-white focus-visible:ring-offset-brand"
                onClick={() => navigate("/auth?cadastro=1")}
              >
                Cadastrar
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <Sheet open={menuAberto} onOpenChange={setMenuAberto}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Abrir menu" className={BOTAO_NO_HEADER}>
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="mt-6 space-y-4">
                <Link href="/home">
                  <div className="text-ink hover:text-brand">Início</div>
                </Link>
                {user?.type === "contratante" && (
                  <Link href="/services">
                    <div className="text-ink hover:text-brand">Serviços</div>
                  </Link>
                )}
                {user?.type === "contratante" && (
                  <Link href="/connections">
                    <div className="text-ink hover:text-brand">Conexões</div>
                  </Link>
                )}
                {user?.type === "prestador" && (
                  <Link href="/demands">
                    <div className="text-ink hover:text-brand">Demandas</div>
                  </Link>
                )}
                {isLoggedIn && user?.type === "prestador" && (
                  <Link href="/convites">
                    <div className="text-ink hover:text-brand">Convites</div>
                  </Link>
                )}
                {isLoggedIn && (
                  <Link href="/kanban">
                    <div className="flex items-center gap-1 text-ink hover:text-brand">
                      <LayoutDashboard className="h-4 w-4" /> Kanban
                    </div>
                  </Link>
                )}
                {isLoggedIn && (
                  <Link href="/messages">
                    <div className="relative flex items-center gap-1 text-ink hover:text-brand">
                      <MessageCircle className="h-5 w-5" /> 
                      Mensagens
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-danger-bg text-danger-dark text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadCount > 10 ? "10+" : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                )}
                {isLoggedIn && user ? (
                  <Link href="/profile">
                    <div className="text-ink hover:text-brand">Perfil</div>
                  </Link>
                ) : (
                  <Button onClick={() => navigate("/auth")}>Login</Button>
                )}
                {isLoggedIn && <Button onClick={handleLogout}>Logout</Button>}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
