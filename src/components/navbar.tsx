"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { PenLine, BookOpen, Search, User, LogOut, Settings, ChevronDown, LayoutDashboard } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { data: session } = useSession();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="border-b border-parchment-400 bg-parchment-100/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <BookOpen
              className="w-6 h-6 text-cinnabar-600 group-hover:text-cinnabar-700 transition-colors"
            />
            <span className="text-xl font-serif text-ink-800 font-semibold tracking-wide">
              墨香论坛
            </span>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-6">
            <Link
              href="/forum"
              className="text-sm font-sans text-ink-600 hover:text-cinnabar-600 transition-colors"
            >
              论坛首页
            </Link>
            <Link
              href="/categories"
              className="text-sm font-sans text-ink-600 hover:text-cinnabar-600 transition-colors"
            >
              版块分类
            </Link>
          </nav>

          {/* Right side */}
          <div className="flex items-center gap-3">
            <Link
              href="/search"
              className="text-ink-500 hover:text-cinnabar-600 transition-colors p-1"
            >
              <Search className="w-4 h-4" />
            </Link>

            {session ? (
              <>
                <Link href="/post/create" className="btn-primary flex items-center gap-1">
                  <PenLine className="w-3.5 h-3.5" />
                  <span>发帖</span>
                </Link>

                <div className="relative">
                  <button
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 text-ink-600 hover:text-ink-800 transition-colors"
                  >
                    <div className="w-7 h-7 rounded-full bg-cinnabar-100 border border-cinnabar-200 flex items-center justify-center">
                      {session.user.image ? (
                        <img
                          src={session.user.image}
                          alt={session.user.name || ""}
                          className="w-full h-full rounded-full object-cover"
                        />
                      ) : (
                        <span className="text-cinnabar-700 text-xs font-serif">
                          {session.user.name?.[0] || "用"}
                        </span>
                      )}
                    </div>
                    <span className="text-sm font-sans hidden sm:block">
                      {session.user.name}
                    </span>
                    <ChevronDown className="w-3 h-3" />
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 top-full mt-1 w-40 card py-1 shadow-md">
                      <Link
                        href={`/user/${session.user.id}`}
                        className="flex items-center gap-2 px-3 py-2 text-sm font-sans text-ink-700 hover:bg-parchment-100 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <User className="w-3.5 h-3.5" />
                        个人主页
                      </Link>
                      <Link
                        href="/settings"
                        className="flex items-center gap-2 px-3 py-2 text-sm font-sans text-ink-700 hover:bg-parchment-100 transition-colors"
                        onClick={() => setDropdownOpen(false)}
                      >
                        <Settings className="w-3.5 h-3.5" />
                        个人设置
                      </Link>
                      {(session.user.role === "ADMIN" || session.user.role === "MODERATOR") && (
                        <Link
                          href="/admin"
                          className="flex items-center gap-2 px-3 py-2 text-sm font-sans text-ink-700 hover:bg-parchment-100 transition-colors"
                          onClick={() => setDropdownOpen(false)}
                        >
                          <LayoutDashboard className="w-3.5 h-3.5" />
                          管理后台
                        </Link>
                      )}
                      <div className="ink-divider my-1" />
                      <button
                        onClick={() => {
                          setDropdownOpen(false);
                          signOut({ callbackUrl: "/" });
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-sm font-sans text-cinnabar-600 hover:bg-cinnabar-50 transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        退出登录
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  href="/auth/login"
                  className="text-sm font-sans text-ink-600 hover:text-cinnabar-600 transition-colors"
                >
                  登录
                </Link>
                <Link href="/auth/register" className="btn-primary">
                  注册
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
