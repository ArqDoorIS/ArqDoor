import React from "react";
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

// Usa a mesma logo da landing pra ter consistência visual entre landing e app
const logoSrc = "/images/landing/logo.png";

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
        className={`flex items-center gap-1 text-sm transition-colors ${
          isActive
            ? "text-amber-600 font-semibold"
            : "text-gray-700 hover:text-amber-500"
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

  const handleLogout = async () => {
    await logout();
    navigate("/auth");
  };

  return (
    <nav className={`fixed top-0 w-full z-50 h-16 border-b border-zinc-200 bg-white/90 backdrop-blur shadow-sm transition-all`}>
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
                <Button variant="ghost" size="icon" aria-label="Messages">
                  <MessageCircle className="h-5 w-5 text-gray-700" />
                  {unreadCount > 0 && (
                    <span 
                      className={`absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-red-500 text-white font-bold border-2 border-white ${
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
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.perfil || undefined} className="object-cover" />
                    <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
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
                        backgroundColor: disponivel ? '#22c55e' : '#d1d5db',
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
              <Button variant="default" onClick={() => navigate("/auth")}>Login</Button>
              <Button variant="link" onClick={() => navigate("/auth/register")}>Cadastrar</Button>
            </>
          )}
        </div>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-6 w-6" />
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="mt-6 space-y-4">
                <Link href="/home">
                  <div className="text-gray-700 hover:text-amber-500">Início</div>
                </Link>
                {user?.type === "contratante" && (
                  <Link href="/services">
                    <div className="text-gray-700 hover:text-amber-500">Serviços</div>
                  </Link>
                )}
                {user?.type === "contratante" && (
                  <Link href="/connections">
                    <div className="text-gray-700 hover:text-amber-500">Conexões</div>
                  </Link>
                )}
                {user?.type === "prestador" && (
                  <Link href="/demands">
                    <div className="text-gray-700 hover:text-amber-500">Demandas</div>
                  </Link>
                )}
                {isLoggedIn && user?.type === "prestador" && (
                  <Link href="/convites">
                    <div className="text-gray-700 hover:text-amber-500">Convites</div>
                  </Link>
                )}
                {isLoggedIn && (
                  <Link href="/kanban">
                    <div className="flex items-center gap-1 text-gray-700 hover:text-amber-500">
                      <LayoutDashboard className="h-4 w-4" /> Kanban
                    </div>
                  </Link>
                )}
                {isLoggedIn && (
                  <Link href="/messages">
                    <div className="relative flex items-center gap-1 text-gray-700 hover:text-amber-500">
                      <MessageCircle className="h-5 w-5" /> 
                      Mensagens
                      {unreadCount > 0 && (
                        <span className="ml-2 bg-red-100 text-red-600 text-xs font-bold px-2 py-0.5 rounded-full">
                          {unreadCount > 10 ? "10+" : unreadCount}
                        </span>
                      )}
                    </div>
                  </Link>
                )}
                {isLoggedIn && user ? (
                  <Link href="/profile">
                    <div className="text-gray-700 hover:text-amber-500">Perfil</div>
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
